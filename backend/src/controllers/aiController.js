const Project = require('../models/Project');
const Feedback = require('../models/Feedback');
const aiService = require('../services/ai.service');

/**
 * @route   POST /api/ai/summarize/:projectId
 * @desc    Generate AI summary for a project
 * @access  Private
 */
const summarizeProject = async (req, res) => {
  try {
    const { projectId } = req.params;

    // Verify project exists and user has access
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Check ownership/access
    if (project.owner.toString() !== req.user._id.toString()) {
      // Also check team members if implemented
      const isMember = project.team && project.team.some(m => m.user.toString() === req.user._id.toString());
      if (!isMember) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }
    }

    // Fetch all feedback for the project
    const feedbacks = await Feedback.find({ project: projectId });

    // Generate summary
    const summary = await aiService.generateProjectSummary(feedbacks);

    res.status(200).json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Summarize project error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate summary'
    });
  }
};

module.exports = {
  summarizeProject
};
