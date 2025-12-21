const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const { summarizeProject, processRecording } = require('../controllers/aiController');

router.use(authenticate);

router.post('/summarize/:projectId', summarizeProject);
router.post('/process-recording', processRecording);

module.exports = router;
