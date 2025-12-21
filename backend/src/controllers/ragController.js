const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { upload } = require('./videoController'); // Reuse multer config

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "YOUR_API_KEY_HERE");

/**
 * @route   POST /api/rag/upload
 * @desc    Upload a document (PDF/TXT) for knowledge base
 * @access  Private
 */
const uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    let textContent = '';

    if (req.file.mimetype === 'application/pdf') {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdf(dataBuffer);
      textContent = data.text;
    } else {
      // Assume text/md
      textContent = fs.readFileSync(filePath, 'utf8');
    }

    // Save extracted text for easy retrieval later
    const textPath = filePath + '.txt';
    fs.writeFileSync(textPath, textContent);

    res.status(200).json({
      success: true,
      data: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        path: `/uploads/${req.file.filename}`,
        textPath: `/uploads/${req.file.filename}.txt` // Internal use
      }
    });
  } catch (error) {
    console.error('Document upload error:', error);
    res.status(500).json({ success: false, error: 'Document upload failed' });
  }
};

/**
 * @route   POST /api/rag/generate-script
 * @desc    Generate a video script based on uploaded docs
 * @access  Private
 */
const generateScript = async (req, res) => {
  try {
    const { prompt, documentIds } = req.body; 

    // 1. Gather Context
    const uploadDir = path.join(__dirname, '../uploads');
    let context = "";

    if (fs.existsSync(uploadDir)) {
        const files = fs.readdirSync(uploadDir).filter(f => f.endsWith('.txt'));
        // Take last 3 for context
        const recentFiles = files.slice(-3);
        
        for (const file of recentFiles) {
            const content = fs.readFileSync(path.join(uploadDir, file), 'utf8');
            context += `\n--- Document: ${file} ---\n${content.substring(0, 4000)}...`; // Higher limit for Gemini
        }
    }

    // 2. Call Gemini
    const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        generationConfig: { responseMimeType: "application/json" }
    });

    const systemPrompt = `You are a professional video script writer. 
    Use the provided Context to write a compelling video script based on the User's prompt.
    Return ONLY a JSON object with a "scenes" array.
    Each scene object must have: "header" (e.g., Intro), "visual" (description), and "audio" (script text).
    
    Context:
    ${context}
    
    User Prompt: ${prompt || "Create a product explainer video script."}`;

    const result = await model.generateContent(systemPrompt);
    const script = JSON.parse(result.response.text());

    res.status(200).json({
      success: true,
      data: script
    });

  } catch (error) {
    console.error('Script generation error:', error);
    res.status(500).json({ success: false, error: 'Script generation failed' });
  }
};

module.exports = {
  upload, // reused
  uploadDocument,
  generateScript
};
