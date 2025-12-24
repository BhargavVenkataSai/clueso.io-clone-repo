const Project = require('../models/Project');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
<<<<<<< HEAD
const { generateScriptFromDocument } = require('../services/geminiService');
=======
const { generateScriptFromDocument, generateSlideScript, generateImageScript } = require('../services/geminiService');
>>>>>>> fc79f4c (Update project structure and backend logic)

/**
 * @route   POST /api/projects
 * @desc    Create new project
 * @access  Private
 */
const createProject = async (req, res) => {
  try {
    const { name, description, website } = req.body;
    let script = '';
    let slides = [];
<<<<<<< HEAD
=======
    let polishedScript = '';
>>>>>>> fc79f4c (Update project structure and backend logic)

    // Handle File Uploads
    if (req.files && req.files.length > 0) {
        const docFile = req.files.find(f => f.fieldname === 'file');
        const slideFiles = req.files.filter(f => f.fieldname === 'slides');

<<<<<<< HEAD
        if (docFile) {
            const filePath = docFile.path;
            const ext = path.extname(docFile.originalname).toLowerCase();
            let text = '';

            try {
                if (ext === '.pdf') {
                    const dataBuffer = fs.readFileSync(filePath);
                    const data = await pdfParse(dataBuffer);
                    text = data.text;
                } else if (ext === '.docx') {
                    const result = await mammoth.extractRawText({ path: filePath });
                    text = result.value;
                } else if (ext === '.txt') {
                    text = fs.readFileSync(filePath, 'utf8');
                }

                if (text) {
                    script = await generateScriptFromDocument(text);
                }
            } catch (err) {
                console.error("Error processing document:", err);
                // Continue without script if processing fails
            }
        }

=======
        // Process Slides (Images)
>>>>>>> fc79f4c (Update project structure and backend logic)
        if (slideFiles.length > 0) {
             slides = slideFiles.map(file => ({
                url: `/uploads/${path.basename(file.path)}`,
                name: file.originalname,
                type: 'image'
             }));
        }
<<<<<<< HEAD
=======

        // Process Document for Script Generation
        if (docFile) {
            const filePath = docFile.path;
            const ext = path.extname(docFile.originalname).toLowerCase();
            
            try {
                if (ext === '.pdf') {
                    const dataBuffer = fs.readFileSync(filePath);
                    
                    // Custom render to extract text per page
                    const options = {
                        pagerender: async (pageData) => {
                            const textContent = await pageData.getTextContent();
                            let text = '';
                            let lastY;
                            for (let item of textContent.items) {
                                if (lastY == item.transform[5] || !lastY){
                                    text += item.str;
                                }  
                                else{
                                    text += '\n' + item.str;
                                }                                                    
                                lastY = item.transform[5];
                            }
                            return text + '---PAGE_BREAK---';
                        }
                    };

                    const data = await pdfParse(dataBuffer, options);
                    const fullText = data.text;
                    const pageTexts = fullText.split('---PAGE_BREAK---').filter(t => t.trim());

                    // Generate script for each slide
                    let generatedScripts = [];
                    for (let i = 0; i < pageTexts.length; i++) {
                        // Only generate if we have a corresponding slide image (or if it's the doc itself)
                        if (i < slides.length) {
                            const slideScript = await generateSlideScript(pageTexts[i], i);
                            generatedScripts.push(slideScript);
                        }
                    }
                    polishedScript = generatedScripts.join('\n\n');

                } else if (['.png', '.jpg', '.jpeg'].includes(ext)) {
                    // Image processing
                    const imageScript = await generateImageScript(filePath);
                    polishedScript = imageScript;
                } else if (ext === '.docx') {
                    const result = await mammoth.extractRawText({ path: filePath });
                    // For DOCX, we might not have slides, so just generate one big script
                    // Or if we have slides (from frontend?), we map it.
                    // Assuming DOCX is treated as one block for now.
                    polishedScript = await generateSlideScript(result.value, 0);
                } else if (ext === '.txt') {
                    const text = fs.readFileSync(filePath, 'utf8');
                    polishedScript = await generateSlideScript(text, 0);
                }
            } catch (err) {
                console.error("Error processing document:", err);
            }
        }
>>>>>>> fc79f4c (Update project structure and backend logic)
    }

    // Generate public slug
    const slugBase = (name || 'Untitled').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    const randomSuffix = crypto.randomBytes(4).toString('hex');
    const publicSlug = `${slugBase}-${randomSuffix}`;

    // Generate a random API key
    const apiKey = crypto.randomBytes(20).toString('hex');

    const project = await Project.create({
      name: name || 'Untitled Project',
      description,
      website,
      publicSlug,
      owner: req.user._id,
      apiKey,
<<<<<<< HEAD
      polishedScript: script,
=======
      polishedScript: polishedScript || script,
>>>>>>> fc79f4c (Update project structure and backend logic)
      slides: slides,
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
