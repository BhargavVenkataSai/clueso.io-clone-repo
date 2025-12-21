const express = require('express');
const router = express.Router();
const { uploadVideo, generateTTS, upload, processAudioFull } = require('../controllers/videoController');
const authenticate = require('../middleware/authenticate');

// Protect all routes
router.use(authenticate);

// Video Upload
router.post('/upload', upload.single('video'), uploadVideo);

// Text-to-Speech (Legacy/Paid)
router.post('/tts', generateTTS);

// Full Audio Process (Free Tier: Gemini + Google TTS)
router.post('/audio-full-process', processAudioFull);

module.exports = router;
