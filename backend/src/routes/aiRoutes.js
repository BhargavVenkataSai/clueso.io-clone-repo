const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const { summarizeProject } = require('../controllers/aiController');

router.use(authenticate);

router.post('/summarize/:projectId', summarizeProject);

module.exports = router;
