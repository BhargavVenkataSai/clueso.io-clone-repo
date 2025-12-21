const Documentation = require('../models/Documentation');
const Video = require('../models/Video');
const Workspace = require('../models/Workspace');
const aiService = require('../utils/aiService');

/**
 * @route   POST /api/documentation
 * @desc    Generate documentation from video
 * @access  Private
 */
const generateDocumentation = async (req, res) => {
  try {
    const { videoId, settings } = req.body;

    const video = await Video.findById(videoId);
    if (!video) {
      return res.status(404).json({
        success: false,
        error: 'Video not found'
      });
    }

    // Verify workspace access
    const workspace = await Workspace.findOne({
      _id: video.workspace,
      $or: [
        { owner: req.user._id },
        { 'members.user': req.user._id }
      ]
    });

    if (!workspace) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Generate documentation using AI service
    const transcript = video.transcript.edited || video.transcript.original;
    const docData = await aiService.generateDocumentation(transcript, {
      title: video.title
    });

    const documentation = await Documentation.create({
      video: videoId,
      workspace: video.workspace,
      title: docData.title,
      content: `<h1>${docData.title}</h1>`,
      steps: docData.steps,
      language: docData.language,
      settings: settings || {}
    });

    // Update video
    video.aiFeatures.documentationGenerated = true;
    await video.save();

    // Update workspace stats
    workspace.stats.totalDocs += 1;
    await workspace.save();

    res.status(201).json({
      success: true,
      data: documentation
    });
  } catch (error) {
    console.error('Generate documentation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate documentation'
    });
  }
};

/**
 * @route   GET /api/documentation/:id
 * @desc    Get documentation details
 * @access  Private
 */
const getDocumentation = async (req, res) => {
  try {
    const documentation = await Documentation.findById(req.params.id)
      .populate('video', 'title')
      .populate('workspace', 'name');

    if (!documentation) {
      return res.status(404).json({
        success: false,
        error: 'Documentation not found'
      });
    }

    // Increment view count
    documentation.views += 1;
    await documentation.save();

    res.status(200).json({
      success: true,
      data: documentation
    });
  } catch (error) {
    console.error('Get documentation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch documentation'
    });
  }
};

/**
 * @route   GET /api/documentation/video/:videoId
 * @desc    Get documentation for a specific video
 * @access  Private
 */
const getDocumentationByVideo = async (req, res) => {
  try {
    const documentation = await Documentation.find({ video: req.params.videoId })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: documentation
    });
  } catch (error) {
    console.error('Get documentation by video error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch documentation'
    });
  }
};

/**
 * @route   PUT /api/documentation/:id
 * @desc    Update documentation
 * @access  Private
 */
const updateDocumentation = async (req, res) => {
  try {
    const documentation = await Documentation.findById(req.params.id);

    if (!documentation) {
      return res.status(404).json({
        success: false,
        error: 'Documentation not found'
      });
    }

    const { title, content, steps, settings } = req.body;

    if (title) documentation.title = title;
    if (content) documentation.content = content;
    if (steps) documentation.steps = steps;
    if (settings) documentation.settings = { ...documentation.settings, ...settings };

    await documentation.save();

    res.status(200).json({
      success: true,
      data: documentation
    });
  } catch (error) {
    console.error('Update documentation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update documentation'
    });
  }
};

/**
 * @route   POST /api/documentation/:id/translate
 * @desc    Translate documentation to another language
 * @access  Private
 */
const translateDocumentation = async (req, res) => {
  try {
    const { targetLanguage } = req.body;

    if (!targetLanguage) {
      return res.status(400).json({
        success: false,
        error: 'Target language is required'
      });
    }

    const documentation = await Documentation.findById(req.params.id);

    if (!documentation) {
      return res.status(404).json({
        success: false,
        error: 'Documentation not found'
      });
    }

    // Check if translation already exists
    const existingTranslation = documentation.translations.find(
      t => t.language === targetLanguage
    );

    if (existingTranslation) {
      return res.status(200).json({
        success: true,
        data: existingTranslation,
        message: 'Translation already exists'
      });
    }

    // Generate translation using AI service
    const translation = await aiService.translateContent(
      documentation.content,
      targetLanguage
    );

    documentation.translations.push({
      language: targetLanguage,
      content: translation.translatedContent,
      translatedAt: new Date()
    });

    await documentation.save();

    res.status(200).json({
      success: true,
      data: documentation.translations[documentation.translations.length - 1]
    });
  } catch (error) {
    console.error('Translate documentation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to translate documentation'
    });
  }
};

/**
 * @route   POST /api/documentation/:id/export
 * @desc    Export documentation in different formats
 * @access  Private
 */
const exportDocumentation = async (req, res) => {
  try {
    const { format = 'html' } = req.body;

    const documentation = await Documentation.findById(req.params.id);

    if (!documentation) {
      return res.status(404).json({
        success: false,
        error: 'Documentation not found'
      });
    }

    // Increment export count
    documentation.exports += 1;
    await documentation.save();

    let exportedContent = documentation.content;

    // Convert format if needed (mock implementation)
    if (format === 'markdown') {
      exportedContent = documentation.content.replace(/<[^>]*>/g, ''); // Simple HTML strip
    }

    res.status(200).json({
      success: true,
      data: {
        content: exportedContent,
        format,
        filename: `${documentation.title.replace(/\s+/g, '_')}.${format}`
      }
    });
  } catch (error) {
    console.error('Export documentation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export documentation'
    });
  }
};

module.exports = {
  generateDocumentation,
  getDocumentation,
  getDocumentationByVideo,
  updateDocumentation,
  translateDocumentation,
  exportDocumentation
};
