const Workspace = require('../models/Workspace');

/**
 * @route   GET /api/workspaces
 * @desc    Get all workspaces for current user
 * @access  Private
 */
const getWorkspaces = async (req, res) => {
  try {
    const workspaces = await Workspace.find({
      $or: [
        { owner: req.user._id },
        { 'members.user': req.user._id }
      ]
    })
    .populate('owner', 'name email')
    .populate('members.user', 'name email')
    .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: workspaces
    });
  } catch (error) {
    console.error('Get workspaces error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch workspaces'
    });
  }
};

/**
 * @route   POST /api/workspaces
 * @desc    Create a new workspace
 * @access  Private
 */
const createWorkspace = async (req, res) => {
  try {
    const { name, description, branding } = req.body;

    const workspace = await Workspace.create({
      name,
      description,
      owner: req.user._id,
      branding: branding || {},
      members: [{
        user: req.user._id,
        role: 'owner'
      }]
    });

    await workspace.populate('owner', 'name email');

    res.status(201).json({
      success: true,
      data: workspace
    });
  } catch (error) {
    console.error('Create workspace error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create workspace'
    });
  }
};

/**
 * @route   GET /api/workspaces/:id
 * @desc    Get workspace details
 * @access  Private
 */
const getWorkspace = async (req, res) => {
  try {
    const workspace = await Workspace.findOne({
      _id: req.params.id,
      $or: [
        { owner: req.user._id },
        { 'members.user': req.user._id }
      ]
    })
    .populate('owner', 'name email')
    .populate('members.user', 'name email');

    if (!workspace) {
      return res.status(404).json({
        success: false,
        error: 'Workspace not found'
      });
    }

    res.status(200).json({
      success: true,
      data: workspace
    });
  } catch (error) {
    console.error('Get workspace error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch workspace'
    });
  }
};

/**
 * @route   PUT /api/workspaces/:id
 * @desc    Update workspace
 * @access  Private (owner/admin only)
 */
const updateWorkspace = async (req, res) => {
  try {
    const workspace = await Workspace.findOne({
      _id: req.params.id,
      owner: req.user._id
    });

    if (!workspace) {
      return res.status(404).json({
        success: false,
        error: 'Workspace not found or unauthorized'
      });
    }

    const { name, description, branding, settings } = req.body;

    if (name) workspace.name = name;
    if (description) workspace.description = description;
    if (branding) workspace.branding = { ...workspace.branding, ...branding };
    if (settings) workspace.settings = { ...workspace.settings, ...settings };

    await workspace.save();

    res.status(200).json({
      success: true,
      data: workspace
    });
  } catch (error) {
    console.error('Update workspace error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update workspace'
    });
  }
};

/**
 * @route   POST /api/workspaces/:id/members
 * @desc    Add member to workspace
 * @access  Private (owner/admin only)
 */
const addMember = async (req, res) => {
  try {
    const { userId, role = 'editor' } = req.body;

    const workspace = await Workspace.findOne({
      _id: req.params.id,
      owner: req.user._id
    });

    if (!workspace) {
      return res.status(404).json({
        success: false,
        error: 'Workspace not found or unauthorized'
      });
    }

    // Check if user already a member
    const existingMember = workspace.members.find(
      m => m.user.toString() === userId
    );

    if (existingMember) {
      return res.status(400).json({
        success: false,
        error: 'User is already a member'
      });
    }

    workspace.members.push({ user: userId, role });
    await workspace.save();
    await workspace.populate('members.user', 'name email');

    res.status(200).json({
      success: true,
      data: workspace
    });
  } catch (error) {
    console.error('Add member error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add member'
    });
  }
};

module.exports = {
  getWorkspaces,
  createWorkspace,
  getWorkspace,
  updateWorkspace,
  addMember
};
