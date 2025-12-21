const multer = require('multer');
const path = require('path');
const fs = require('fs');
// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)){
        fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

const { processAudio } = require('../services/audioService');

const Video = require('../models/Video');

/**
 * @route   GET /api/videos
 * @desc    Get all videos for a workspace
 * @access  Private
 */
const getVideos = async (req, res) => {
  try {
    const { workspaceId } = req.query;

    if (!workspaceId) {
      return res.status(400).json({ success: false, error: 'Workspace ID is required' });
    }

    const videos = await Video.find({ workspace: workspaceId })
      .sort({ createdAt: -1 })
      .populate('creator', 'name email');

    res.status(200).json({
      success: true,
      count: videos.length,
      data: videos
    });
  } catch (error) {
    console.error('Get videos error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch videos' });
  }
};

/**
 * @route   POST /api/videos/upload
 * @desc    Upload a video file
 * @access  Private
 */
const uploadVideo = (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }
    
    // Return the file path relative to the server (or a full URL if configured)
    const filePath = `/uploads/${req.file.filename}`;
    
    res.status(200).json({
      success: true,
      data: {
        filename: req.file.filename,
        path: filePath,
        size: req.file.size,
        mimetype: req.file.mimetype
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ success: false, error: 'Upload failed' });
  }
};

/**
 * @route   POST /api/videos/tts
 * @desc    Generate audio from text using OpenAI (Legacy/Paid)
 * @access  Private
 */
const googleTTS = require('google-tts-api');
const https = require('https');

// ... imports remain the same above ... 

/**
 * @route   POST /api/videos/tts
 * @desc    Generate audio from text using Google TTS (Free, replaces OpenAI)
 * @access  Private
 */
const generateTTS = async (req, res) => {
  try {
    const { text, voice } = req.body;

    if (!text) {
      return res.status(400).json({ success: false, error: 'Text is required' });
    }

    // Map voice selection to language codes if needed, or use directly
    // Frontend sends 'en', 'fr', etc.
    const selectedVoice = voice || 'en'; 

    console.log(`Generating TTS (Google) for: "${text.substring(0, 50)}..." [${selectedVoice}]`);

    // Use google-tts-api to get a URL
    const url = googleTTS.getAudioUrl(text, {
      lang: selectedVoice,
      slow: false,
      host: 'https://translate.google.com',
    });

    // Download the file to local storage to match previous behavior
    const fileName = `tts-${Date.now()}.mp3`;
    const uploadDir = path.join(__dirname, '../uploads');
    
    if (!fs.existsSync(uploadDir)){
        fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    const filePath = path.join(uploadDir, fileName);

    const file = fs.createWriteStream(filePath);
    https.get(url, function(response) {
      response.pipe(file);
      file.on('finish', function() {
        file.close(() => {
            res.status(200).json({
                success: true,
                data: {
                    filename: fileName,
                    path: `/uploads/${fileName}`,
                    text: text
                }
            });
        });
      });
    }).on('error', function(err) { 
      fs.unlink(filePath, () => {}); // Delete the file async. (But we don't check the result)
      console.error('Download error:', err);
      res.status(500).json({ success: false, error: 'Failed to download TTS audio' });
    });

  } catch (error) {
    console.error('TTS generation error:', error);
    res.status(500).json({ success: false, error: 'Failed to generate speech' });
  }
};

/**
 * @route   POST /api/videos/audio-full-process
 * @desc    Process text -> AI Polish (Gemini) -> TTS (Google) -> Save
 * @access  Private
 */
const processAudioFull = async (req, res) => {
    try {
        const { text, voice } = req.body;
        
        if (!text) {
            return res.status(400).json({ success: false, error: 'Text is required' });
        }

        const result = await processAudio({ text, voice });

        if (!result.success) {
             return res.status(500).json({ success: false, error: result.error });
        }

        res.status(200).json({
            success: true,
            data: {
                path: result.audio_path,
                cleaned_text: result.cleaned_text,
                duration: result.duration_estimate
            }
        });

    } catch (error) {
        console.error("Full Audio Process Error:", error);
         res.status(500).json({ success: false, error: 'Internal server error' });
    }
}

// const { processAudio } = require('../services/audioService'); // Removed duplicate
const aiService = require('../utils/aiService'); // Import the main aiService
// ...

/**
 * @route   POST /api/videos/process-ai
 * @desc    Run full AI analysis (Script, Docs, Zooms) using Gemini
 * @access  Private
 */
const processVideoAI = async (req, res) => {
    try {
        const { 
            raw_transcript, 
            ui_events, 
            video_metadata, 
            style_guidelines, 
            doc_use_case 
        } = req.body;

        // Basic validation
        if (!raw_transcript && !ui_events) {
             return res.status(400).json({ success: false, error: 'Missing transcript or UI events data.' });
        }

        console.log("API: Requesting Advanced AI Processing...");

        const result = await aiService.processVideoAdvanced({
             raw_transcript: raw_transcript || "No transcript provided.",
             ui_events: ui_events || [],
             video_metadata: video_metadata || { duration: 60 },
             style_guidelines: style_guidelines || "Professional, concise",
             doc_use_case: doc_use_case || "User Tutorial"
        });

        if (!result.success) {
            return res.status(500).json({ success: false, error: result.error });
        }

        res.status(200).json({
            success: true,
            data: result.data
        });

    } catch (error) {
        console.error("Controller Error:", error);
        res.status(500).json({ success: false, error: 'Server error during AI processing' });
    }
};

module.exports = {
  getVideos,
  upload,
  uploadVideo,
  generateTTS,
  processAudioFull,
  processVideoAI
};
