const Project = require('../models/Project');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');
const { generateScriptFromDocument, generateSlideScript, generateImageScript } = require('../services/geminiService');

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
    let polishedScript = '';
    let documentUrl = null; // Store document path for AI context

    // Handle File Uploads
    if (req.files && req.files.length > 0) {
        const docFile = req.files.find(f => f.fieldname === 'file');
        const slideFiles = req.files.filter(f => f.fieldname === 'slides');

        // Process Slides (Images) if provided by frontend
        if (slideFiles.length > 0) {
             slides = slideFiles.map(file => ({
                url: `/uploads/${path.basename(file.path)}`,
                name: file.originalname,
                type: 'image'
             }));
        }

        // Process Document for Script Generation
        if (docFile) {
            const filePath = docFile.path;
            const ext = path.extname(docFile.originalname).toLowerCase();
            
            try {
                if (ext === '.pdf') {
                    // Save PDF path for AI context
                    documentUrl = `/uploads/${path.basename(filePath)}`;
                    console.log('📄 Converting PDF to slides:', docFile.originalname);
                    console.log('📄 PDF file path:', filePath);
                    console.log('📄 PDF file exists:', fs.existsSync(filePath));
                    
                    // Convert PDF pages to images using pdf-to-img
                    if (slides.length === 0) {
                        try {
                            // Dynamic import for ESM module
                            console.log('📦 Importing pdf-to-img...');
                            const pdfToImg = await import('pdf-to-img');
                            const { pdf } = pdfToImg;
                            console.log('✅ Module imported');
                            
                            const uploadsDir = path.join(__dirname, '../uploads');
                            console.log('📁 Uploads dir:', uploadsDir);
                            
                            // Ensure uploads directory exists
                            if (!fs.existsSync(uploadsDir)) {
                                fs.mkdirSync(uploadsDir, { recursive: true });
                            }
                            
                            console.log('📄 Starting PDF conversion...');
                            const pdfDocument = await pdf(filePath, { scale: 1.5 });
                            console.log('✅ PDF document loaded');
                            
                            let pageIndex = 0;
                            for await (const image of pdfDocument) {
                                pageIndex++;
                                const slideFilename = `slide-${Date.now()}-${pageIndex}.png`;
                                const slidePath = path.join(uploadsDir, slideFilename);
                                
                                // Save the image buffer to file
                                fs.writeFileSync(slidePath, image);
                                
                                slides.push({
                                    url: `/uploads/${slideFilename}`,
                                    name: `Slide ${pageIndex}`,
                                    type: 'image'
                                });
                                
                                console.log(`📄 Created slide ${pageIndex}: ${slideFilename}`);
                            }
                            
                            console.log(`✅ PDF converted: ${slides.length} slides created`);
                            
                            // Generate AI scripts for each slide
                            if (slides.length > 0) {
                                console.log('🤖 Generating AI scripts for slides...');
                                let generatedScripts = [];
                                
                                for (let i = 0; i < slides.length; i++) {
                                    const slidePath = path.join(__dirname, '..', slides[i].url);
                                    try {
                                        const slideScript = await generateImageScript(slidePath);
                                        generatedScripts.push(`Slide ${i + 1}:\n${slideScript}`);
                                        console.log(`✅ Script generated for slide ${i + 1}`);
                                    } catch (scriptErr) {
                                        console.error(`⚠️ Script error for slide ${i + 1}:`, scriptErr.message);
                                        generatedScripts.push(`Slide ${i + 1}: Add your narration here.`);
                                    }
                                }
                                
                                polishedScript = generatedScripts.join('\n\n');
                            }
                            
                        } catch (pdfErr) {
                            console.error('❌ PDF conversion error:', pdfErr.message);
                            console.error('❌ Full error:', pdfErr);
                            // Fallback: save PDF as single slide
                            slides = [{
                                url: `/uploads/${path.basename(filePath)}`,
                                name: 'PDF Document',
                                type: 'pdf'
                            }];
                            polishedScript = `PDF uploaded: ${docFile.originalname}. PDF conversion failed - please try a different PDF or use the script editor.`;
                        }
                    }

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
    }

    // Generate public slug
    const slugBase = (name || 'Untitled').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    const randomSuffix = crypto.randomBytes(4).toString('hex');
    const publicSlug = `${slugBase}-${randomSuffix}`;

    // Generate a random API key
    const apiKey = crypto.randomBytes(20).toString('hex');

    console.log('📁 Creating project with documentUrl:', documentUrl);

    const project = await Project.create({
      name: name || 'Untitled Project',
      description,
      website,
      publicSlug,
      owner: req.user._id,
      apiKey,
      polishedScript: polishedScript || script,
      slides: slides,
      videoUrl: documentUrl, // Store PDF/document path for AI Rewrite
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

/**
 * @route   POST /api/projects/:id/upload-video
 * @desc    Upload a video file for a project
 * @access  Private
 */
const uploadProjectVideo = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'No video file uploaded' 
      });
    }

    // Verify project ownership
    const project = await Project.findOne({ 
      _id: id, 
      $or: [
        { owner: req.user._id },
        { 'team.user': req.user._id }
      ]
    });

    if (!project) {
      return res.status(404).json({ 
        success: false, 
        error: 'Project not found or access denied' 
      });
    }

    // Update project with video info
    const videoUrl = `/uploads/${req.file.filename}`;
    
    project.videoUrl = videoUrl;
    project.videoFilename = req.file.filename;
    await project.save();

    console.log(`✅ Video uploaded for project ${id}: ${videoUrl}`);

    res.status(200).json({
      success: true,
      data: {
        videoUrl: videoUrl,
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype
      }
    });

  } catch (error) {
    console.error('Upload video error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to upload video' 
    });
  }
};

module.exports = {
  createProject,
  getProjects,
  getProject,
  updateProject,
  deleteProject,
  uploadProjectVideo
};
