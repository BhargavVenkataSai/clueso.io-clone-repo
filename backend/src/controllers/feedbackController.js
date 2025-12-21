const Feedback = require('../models/Feedback');
const Project = require('../models/Project');
const aiService = require('../utils/aiService');

/**
 * @route   POST /api/feedback
 * @desc    Submit new feedback
 * @access  Public (or Protected)
 */
const createFeedback = async (req, res) => {
  try {
    const { projectSlug } = req.params;
    const { message, sentiment, submitter } = req.body;

    if (!projectSlug || !message) {
      return res.status(400).json({
        success: false,
        error: 'Project Slug and message are required'
      });
    }

    // Verify project exists by slug
    const project = await Project.findOne({ publicSlug: projectSlug });
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    const feedbackData = {
      project: project._id,
      message,
      sentiment: sentiment || 'neutral',
      submitter
    };

    // If user is authenticated, add userId to submitter
    if (req.user) {
      feedbackData.submitter = {
        ...feedbackData.submitter,
        userId: req.user._id,
        name: req.user.name,
        email: req.user.email
      };
    }

    const feedback = await Feedback.create(feedbackData);

    // Trigger AI Insight generation (async)
    generateInsightsAsync(feedback._id);

    res.status(201).json({
      success: true,
      data: feedback,
      message: 'Feedback submitted successfully'
    });
  } catch (error) {
    console.error('Create feedback error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit feedback'
    });
  }
};

/**
 * @route   GET /api/feedback
 * @desc    Get feedback for a project
 * @access  Private
 */
const getFeedbacks = async (req, res) => {
  try {
    const { projectId, status, category } = req.query;

    if (!projectId) {
      return res.status(400).json({
        success: false,
        error: 'Project ID is required'
      });
    }

    // Verify project access (assuming user must be member of project's workspace)
    // For simplicity, we'll just check if project exists for now. 
    // In real app, check Workspace permissions.
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    const query = { project: projectId };
    if (status) query.status = status;
    if (category) query.category = category;

    const feedbacks = await Feedback.find(query)
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: feedbacks
    });
  } catch (error) {
    console.error('Get feedbacks error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch feedback'
    });
  }
};

/**
 * @route   GET /api/feedback/:id
 * @desc    Get feedback details
 * @access  Private
 */
const getFeedback = async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.id)
      .populate('project', 'name');

    if (!feedback) {
      return res.status(404).json({
        success: false,
        error: 'Feedback not found'
      });
    }

    res.status(200).json({
      success: true,
      data: feedback
    });
  } catch (error) {
    console.error('Get feedback error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch feedback'
    });
  }
};

/**
 * @route   PUT /api/feedback/:id
 * @desc    Update feedback status or add notes
 * @access  Private
 */
const updateFeedback = async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.id);

    if (!feedback) {
      return res.status(404).json({
        success: false,
        error: 'Feedback not found'
      });
    }

    const { status, priority, category, internalNote } = req.body;

    if (status) feedback.status = status;
    if (priority) feedback.priority = priority;
    if (category) feedback.category = category;

    if (internalNote) {
      feedback.internalNotes.push({
        user: req.user._id,
        note: internalNote
      });
    }

    await feedback.save();

    res.status(200).json({
      success: true,
      data: feedback
    });
  } catch (error) {
    console.error('Update feedback error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update feedback'
    });
  }
};

/**
 * @route   DELETE /api/feedback/:id
 * @desc    Delete feedback
 * @access  Private
 */
const deleteFeedback = async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.id);

    if (!feedback) {
      return res.status(404).json({
        success: false,
        error: 'Feedback not found'
      });
    }

    await feedback.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Feedback deleted successfully'
    });
  } catch (error) {
    console.error('Delete feedback error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete feedback'
    });
  }
};

/**
 * @route   POST /api/feedback/:id/analyze
 * @desc    Manually trigger AI analysis
 * @access  Private
 */
const generateInsights = async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.id);
    if (!feedback) {
      return res.status(404).json({ success: false, error: 'Feedback not found' });
    }

    const insights = await aiService.generateFeedbackInsights(feedback.content);
    
    feedback.aiInsight = {
      ...insights,
      generatedAt: new Date()
    };
    
    // Auto-categorize if suggested
    if (insights.suggestedCategory && feedback.category === 'other') {
      feedback.category = insights.suggestedCategory;
    }

    await feedback.save();

    res.status(200).json({
      success: true,
      data: feedback
    });
  } catch (error) {
    console.error('Generate insights error:', error);
    res.status(500).json({ success: false, error: 'Failed to generate insights' });
  }
};

// Async helper
const generateInsightsAsync = async (feedbackId) => {
  try {
    const feedback = await Feedback.findById(feedbackId);
    if (!feedback) return;

    const insights = await aiService.generateFeedbackInsights(feedback.content);
    
    feedback.aiInsight = {
      ...insights,
      generatedAt: new Date()
    };

    if (insights.suggestedCategory && feedback.category === 'other') {
      feedback.category = insights.suggestedCategory;
    }

    await feedback.save();
  } catch (error) {
    console.error('Async insights error:', error);
  }
};

module.exports = {
  createFeedback,
  getFeedbacks,
  getFeedback,
  updateFeedback,
  deleteFeedback,
  generateInsights
};
