const Project = require('../models/Project');
const Feedback = require('../models/Feedback');
const aiService = require('../services/ai.service');
const geminiService = require('../services/geminiService');

/**
 * @route   POST /api/ai/process-recording
 * @desc    Process recording with Gemini to get script, zooms, and docs
 *          Supports both text-only and video file analysis
 * @access  Private
 */
const processRecording = async (req, res) => {
  try {
    const { projectId, rawTranscript, uiEvents, styleGuidelines, docUseCase } = req.body;

    if (!projectId) {
      return res.status(400).json({ success: false, error: 'Project ID is required' });
    }

    // Verify project exists
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    let aiResult;

    // Check if a video file was uploaded
    if (req.file && req.file.path) {
      console.log(`📹 Video file detected: ${req.file.filename}`);
      console.log(`📊 File size: ${(req.file.size / 1024 / 1024).toFixed(2)} MB`);
      
      // Use video analysis with visual context
      aiResult = await geminiService.processVideoRecording({
        videoFilePath: req.file.path,
        rawTranscript: rawTranscript || "",
        styleGuidelines,
        docUseCase
      });
      
      // Clean up uploaded video file after processing
      const fs = require('fs');
      try {
        fs.unlinkSync(req.file.path);
        console.log(`🗑️  Cleaned up local video file: ${req.file.filename}`);
      } catch (cleanupError) {
        console.warn(`⚠️  Failed to cleanup local file: ${cleanupError.message}`);
      }
    } else {
      // Use text-only processing (original behavior)
      console.log("📝 No video file provided, using text-only processing");
      aiResult = await geminiService.processRecording({
        rawTranscript: rawTranscript || "Welcome to this tutorial.",
        uiEvents: uiEvents || [],
        styleGuidelines,
        docUseCase
      });
    }

    // Update Project with results
    project.polishedScript = aiResult.polished_script;
    project.zoomPlan = aiResult.zoom_plan;
    project.docSteps = aiResult.step_by_step_doc;

    await project.save();

    res.status(200).json({
      success: true,
      data: {
        polishedScript: project.polishedScript,
        zoomPlan: project.zoomPlan,
        docSteps: project.docSteps
      }
    });

  } catch (error) {
    console.error('Process recording error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process recording'
    });
  }
};

/**
 * @route   POST /api/ai/summarize/:projectId
 * @desc    Generate AI summary for a project
 * @access  Private
 */
const summarizeProject = async (req, res) => {
  try {
    const { projectId } = req.params;

    // Verify project exists and user has access
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Check ownership/access
    if (project.owner.toString() !== req.user._id.toString()) {
      // Also check team members if implemented
      const isMember = project.team && project.team.some(m => m.user.toString() === req.user._id.toString());
      if (!isMember) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }
    }

    // Fetch all feedback for the project
    const feedbacks = await Feedback.find({ project: projectId });

    // Generate summary
    const summary = await aiService.generateProjectSummary(feedbacks);

    res.status(200).json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Summarize project error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate summary'
    });
  }
};

/**
 * @route   POST /api/ai/video-aware-rewrite
 * @desc    Rewrite script based on video analysis
 * @access  Private
 */
const videoAwareRewrite = async (req, res) => {
  try {
    const { videoId, videoUrl, currentText } = req.body;

    if (!currentText) {
      return res.status(400).json({ success: false, error: 'Current text is required' });
    }

    if (!videoId && !videoUrl) {
      return res.status(400).json({ success: false, error: 'Video ID or video URL is required' });
    }

    const path = require('path');
    const fs = require('fs');
    let videoFilePath = null;

    // Try to find video by ID first
    if (videoId) {
      try {
        const Video = require('../models/Video');
        const video = await Video.findById(videoId);
        
        if (video && video.files?.original?.filename) {
          videoFilePath = path.join(__dirname, '../uploads', video.files.original.filename);
        } else if (video && video.filename) {
          videoFilePath = path.join(__dirname, '../uploads', video.filename);
        }
      } catch (err) {
        console.log('Video not found in database, trying alternative methods...');
      }
    }

    // If no video found by ID, try to use videoUrl
    if (!videoFilePath && videoUrl) {
      // videoUrl might be like "/uploads/video-123.mp4" - extract the filename
      const urlPath = videoUrl.startsWith('/') ? videoUrl : `/${videoUrl}`;
      const filename = path.basename(urlPath);
      videoFilePath = path.join(__dirname, '../uploads', filename);
      
      // If that doesn't exist, try the full relative path
      if (!fs.existsSync(videoFilePath)) {
        videoFilePath = path.join(__dirname, '..', urlPath.replace(/^\//, ''));
      }
    }

    // Check if video file exists
    if (!videoFilePath || !fs.existsSync(videoFilePath)) {
      console.log(`❌ Video/document file not found. Attempted path: ${videoFilePath}`);
      console.log(`VideoId: ${videoId}, VideoUrl: ${videoUrl}`);
      
      return res.status(404).json({
        success: false,
        error: 'No video or document file found. Please upload a video, DOCX, or PDF file first to use AI Rewrite with context.'
      });
    }

    console.log(`🎬 Analyzing video for AI rewrite: ${videoFilePath}`);

    // Use Gemini to analyze video and rewrite text
    const rewrittenText = await geminiService.generateVideoAwareRewrite(videoFilePath, currentText);

    res.status(200).json({
      success: true,
      data: {
        rewrittenText: rewrittenText,
        videoAnalyzed: true
      }
    });

  } catch (error) {
    console.error('Video-aware rewrite error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to rewrite with video analysis'
    });
  }
};

module.exports = {
  summarizeProject,
  processRecording,
  videoAwareRewrite
};
