const express = require('express');
const router = express.Router();
const { upload, uploadDocument, generateScript } = require('../controllers/ragController');
const authenticate = require('../middleware/authenticate');

// Protect all routes
router.use(authenticate);

// Document Upload
router.post('/upload', upload.single('document'), uploadDocument);

// Generate Script
router.post('/generate-script', generateScript);

module.exports = router;
