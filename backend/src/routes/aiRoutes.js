const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const upload = require('../middleware/upload');
const { summarizeProject, processRecording, videoAwareRewrite } = require('../controllers/aiController');
const { runAllTests, testGemini, testElevenLabs } = require('../services/aiHealthCheck');

router.use(authenticate);

router.post('/summarize/:projectId', summarizeProject);
// Support optional video file upload for visual analysis
router.post('/process-recording', upload.single('videoFile'), processRecording);
// Video-aware AI rewrite
router.post('/video-aware-rewrite', videoAwareRewrite);

// Health check - test all AI services
router.get('/health', async (req, res) => {
    try {
        const results = await runAllTests();
        const statusCode = results.overall === 'healthy' ? 200 : 503;
        res.status(statusCode).json({
            success: results.overall === 'healthy',
            ...results
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Quick test individual services
router.get('/test/gemini', async (req, res) => {
    const result = await testGemini();
    res.json(result);
});

router.get('/test/elevenlabs', async (req, res) => {
    const result = await testElevenLabs();
    res.json(result);
});

module.exports = router;
