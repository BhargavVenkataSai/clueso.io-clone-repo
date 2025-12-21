const Project = require('../models/Project');
const crypto = require('crypto');

/**
 * @route   POST /api/projects
 * @desc    Create new project
 * @access  Private
 */
const createProject = async (req, res) => {
  try {
    const { name, description, website } = req.body;

    // Generate public slug
    const slugBase = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    const randomSuffix = crypto.randomBytes(4).toString('hex');
    const publicSlug = `${slugBase}-${randomSuffix}`;

    // Generate a random API key
    const apiKey = crypto.randomBytes(20).toString('hex');

    const project = await Project.create({
      name,
      description,
      website,
      publicSlug,
      owner: req.user._id,
      apiKey,
      team: [{
        user: req.user._id,
        role: 'owner'
      }]
    });

    res.status(201).json({
      success: true,
      data: project
    });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create project'
    });
  }
};

/**
 * @route   GET /api/projects
 * @desc    Get all projects for user
 * @access  Private
 */
const getProjects = async (req, res) => {
  try {
    const projects = await Project.find({
      $or: [
        { owner: req.user._id },
        { 'team.user': req.user._id }
      ]
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: projects
    });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch projects'
    });
  }
};

/**
 * @route   GET /api/projects/:id
 * @desc    Get project details
 * @access  Private
 */
const getProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('owner', 'name email')
      .populate('team.user', 'name email');

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Check access
    const isMember = project.team.some(member => 
      member.user._id.toString() === req.user._id.toString()
    );

    if (!isMember && project.owner._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    res.status(200).json({
      success: true,
      data: project
    });
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch project'
    });
  }
};

/**
 * @route   PUT /api/projects/:id
 * @desc    Update project
 * @access  Private
 */
const updateProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Check access (only owner or admin)
    const member = project.team.find(m => m.user.toString() === req.user._id.toString());
    if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update project'
      });
    }

    const { name, description, website, settings } = req.body;

    if (name) project.name = name;
    if (description) project.description = description;
    if (website) project.website = website;
    if (settings) project.settings = { ...project.settings, ...settings };

    await project.save();

    res.status(200).json({
      success: true,
      data: project
    });
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update project'
    });
  }
};

/**
 * @route   DELETE /api/projects/:id
 * @desc    Delete project
 * @access  Private
 */
const deleteProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Only owner can delete
    if (project.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Only owner can delete project'
      });
    }

    await project.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Project deleted successfully'
    });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete project'
    });
  }
};

module.exports = {
  createProject,
  getProjects,
  getProject,
  updateProject,
  deleteProject
};
