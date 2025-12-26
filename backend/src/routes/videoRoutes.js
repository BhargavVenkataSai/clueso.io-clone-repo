const express = require('express');
const router = express.Router();
const { getVideos, uploadVideo, generateTTS, upload, processAudioFull, processVideoAI } = require('../controllers/videoController');
const { getAvailableVoices } = require('../services/audioService');
const authenticate = require('../middleware/authenticate');

// Protect all routes
router.use(authenticate);

// Get all videos
router.get('/', getVideos);

// Video Upload
router.post('/upload', upload.single('video'), uploadVideo);

// Text-to-Speech (Legacy/Paid)
router.post('/tts', generateTTS);

// Full Audio Process (ElevenLabs + Fallback to Google TTS)
router.post('/audio-full-process', processAudioFull);

// Advanced AI Video Processor (Script, Docs, Zooms)
router.post('/process-ai', processVideoAI);

// Get available TTS voices
router.get('/voices', async (req, res) => {
    const result = await getAvailableVoices();
    if (result.success) {
        res.json({ success: true, data: result.voices });
    } else {
        // Return default voice list if ElevenLabs not configured
        res.json({
            success: true,
            data: [
                { id: 'rachel', name: 'Rachel', category: 'premade', labels: { gender: 'female', accent: 'american' } },
                { id: 'adam', name: 'Adam', category: 'premade', labels: { gender: 'male', accent: 'american' } },
                { id: 'charlotte', name: 'Charlotte', category: 'premade', labels: { gender: 'female', accent: 'british' } },
                { id: 'daniel', name: 'Daniel', category: 'premade', labels: { gender: 'male', accent: 'british' } },
                { id: 'sarah', name: 'Sarah', category: 'premade', labels: { gender: 'female', accent: 'american' } },
                { id: 'james', name: 'James', category: 'premade', labels: { gender: 'male', accent: 'american' } },
                { id: 'emily', name: 'Emily', category: 'premade', labels: { gender: 'female', accent: 'american' } },
                { id: 'matthew', name: 'Matthew', category: 'premade', labels: { gender: 'male', accent: 'american', style: 'audiobook' } },
            ]
        });
    }
});

module.exports = router;

