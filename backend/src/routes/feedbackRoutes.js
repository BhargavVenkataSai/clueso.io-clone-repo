const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const {
  createFeedback,
  getFeedbacks,
  getFeedback,
  updateFeedback,
  deleteFeedback,
  generateInsights
} = require('../controllers/feedbackController');

// Public route for submitting feedback (if allowAnonymous is true)
// Note: We might want a separate public endpoint or handle auth inside controller.
// For now, let's make createFeedback accessible, but it handles auth internally.
// However, the router.use(authenticate) below blocks everything.
// So we should move createFeedback above it if we want public access, 
// OR keep it protected if this is an internal dashboard app.
// Given the requirements "User Onboarding & Authentication", let's assume 
// the dashboard is protected, but feedback collection might be public via widget.
// For this clone, I'll keep it simple: Protected for now, as the user is "cloning Clueso" which is a SaaS.
// Actually, Clueso collects feedback from end-users who might not be logged in.
// But the starter code has `router.use(authenticate)`.
// I will split it: Public submission, Private management.

// Public route for submitting feedback
router.post('/:projectSlug', createFeedback);

// Protected routes
router.use(authenticate);

// Get feedback for a project
router.get('/project/:projectId', getFeedbacks);

router.get('/:id', getFeedback);
router.put('/:id', updateFeedback);
router.delete('/:id', deleteFeedback);
router.post('/:id/analyze', generateInsights);

module.exports = router;
