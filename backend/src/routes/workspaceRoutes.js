const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const {
  getWorkspaces,
  createWorkspace,
  getWorkspace,
  updateWorkspace,
  addMember
} = require('../controllers/workspaceController');

// All routes require authentication
router.use(authenticate);

router.get('/', getWorkspaces);
router.post('/', createWorkspace);
router.get('/:id', getWorkspace);
router.put('/:id', updateWorkspace);
router.post('/:id/members', addMember);

module.exports = router;
