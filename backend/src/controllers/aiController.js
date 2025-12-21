const Project = require('../models/Project');
const Feedback = require('../models/Feedback');
const aiService = require('../services/ai.service');
const geminiService = require('../services/geminiService');

/**
 * @route   POST /api/ai/process-recording
 * @desc    Process recording with Gemini to get script, zooms, and docs
 * @access  Private
 */
const processRecording = async (req, res) => {
  try {
    const { projectId, rawTranscript, uiEvents, styleGuidelines, docUseCase } = req.body;

    if (!projectId) {
      return res.status(400).json({ success: false, error: 'Project ID is required' });
    }

    // Verify project exists
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    // Call Gemini Service
    const aiResult = await geminiService.processRecording({
      rawTranscript: rawTranscript || "Welcome to this tutorial.", // Fallback if empty
      uiEvents: uiEvents || [],
      styleGuidelines,
      docUseCase
    });

    // Update Project with results
    project.polishedScript = aiResult.polished_script;
    project.zoomPlan = aiResult.zoom_plan;
    project.docSteps = aiResult.step_by_step_doc;

    await project.save();

    res.status(200).json({
      success: true,
      data: {
        polishedScript: project.polishedScript,
        zoomPlan: project.zoomPlan,
        docSteps: project.docSteps
      }
    });

  } catch (error) {
    console.error('Process recording error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process recording'
    });
  }
};

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
  summarizeProject,
  processRecording
};
