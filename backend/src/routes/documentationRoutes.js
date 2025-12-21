const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const {
  generateDocumentation,
  getDocumentation,
  getDocumentationByVideo,
  updateDocumentation,
  translateDocumentation,
  exportDocumentation
} = require('../controllers/documentationController');

// All routes require authentication
router.use(authenticate);

/**
 * Documentation routes
 */
router.post('/', generateDocumentation);
router.get('/:id', getDocumentation);
router.get('/video/:videoId', getDocumentationByVideo);
router.put('/:id', updateDocumentation);
router.post('/:id/translate', translateDocumentation);
router.post('/:id/export', exportDocumentation);

module.exports = router;
