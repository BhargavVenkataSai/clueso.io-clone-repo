const express = require('express');
const router = express.Router();
const { getVideos, uploadVideo, generateTTS, upload, processAudioFull, processVideoAI } = require('../controllers/videoController');
const authenticate = require('../middleware/authenticate');

// Protect all routes
router.use(authenticate);

// Get all videos
router.get('/', getVideos);

// Video Upload
router.post('/upload', upload.single('video'), uploadVideo);

// Text-to-Speech (Legacy/Paid)
router.post('/tts', generateTTS);

// Full Audio Process (Free Tier: Gemini + Google TTS)
router.post('/audio-full-process', processAudioFull);

// Advanced AI Video Processor (Script, Docs, Zooms)
router.post('/process-ai', processVideoAI);

module.exports = router;
