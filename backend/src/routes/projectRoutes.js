const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const upload = require('../middleware/upload');
const {
  createProject,
  getProjects,
  getProject,
  updateProject,
  deleteProject,
  uploadProjectVideo
} = require('../controllers/projectController');

// All routes require authentication
router.use(authenticate);

router.get('/', getProjects);
router.post('/', upload.any(), createProject);
router.get('/:id', getProject);
router.put('/:id', updateProject);
router.delete('/:id', deleteProject);

// Upload video for a project
router.post('/:id/upload-video', upload.single('video'), uploadProjectVideo);

module.exports = router;

