const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "STUB_KEY");

// Model Constants
const MODEL_FLASH = 'gemini-2.5-flash';
const MODEL_FLASH_LITE = 'gemini-2.5-flash-lite';

/**
 * Cleans and polishes the raw transcript segments into a cohesive script.
 * Uses the lighter model for speed and efficiency.
 * 
 * @param {Array<{text: string, startTime: number, endTime: number}>} transcriptSegments 
 * @returns {Promise<string>} Polished script
 */
const cleanScript = async (transcriptSegments) => {
    const model = genAI.getGenerativeModel({ model: MODEL_FLASH_LITE });

    const fullText = transcriptSegments.map(s => s.text).join(' ');

    const prompt = `
    You are an expert video script editor.
    I have a raw transcript from a screen recording tutorial.
    
    Task:
    1. Remove filler words (um, uh, like, you know).
    2. Fix grammar and sentence structure.
    3. Make it sound professional yet conversational.
    4. Do NOT change the meaning or technical details.
    5. Return ONLY the cleaned text, no markdown or explanations.

    Raw Transcript:
    "${fullText}"
    `;

    try {
        const result = await model.generateContent(prompt);
        return result.response.text();
    } catch (error) {
        console.error("Gemini cleanScript error:", error);
        return fullText;
    }
};

/**
 * Generates step-by-step instructions from the transcript.
 * Uses the stronger model for better reasoning and extraction.
 * 
 * @param {Array<{text: string, startTime: number, endTime: number}>} transcriptSegments 
 * @returns {Promise<Array<{title: string, description: string, timestamp: number}>>} List of steps
 */
const generateSteps = async (transcriptSegments) => {
    const model = genAI.getGenerativeModel({ model: MODEL_FLASH });

    const transcriptWithTimestamps = transcriptSegments
        .map(s => `[${s.startTime.toFixed(1)}s]: ${s.text}`)
        .join('\n');

    const prompt = `
    You are a technical documentation expert.
    Extract clear, actionable steps from the following transcript with timestamps.

    Task:
    1. Identify distinct actions taken in the tutorial.
    2. Create a title and brief description for each step.
    3. Associate the most relevant timestamp from the transcript for that step.
    4. Return the result as a valid JSON array of objects with keys: "title", "description", "timestamp".

    Transcript:
    ${transcriptWithTimestamps}
    `;

    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(jsonStr);
    } catch (error) {
        console.error("Gemini generateSteps error:", error);
        return [];
    }
};

/**
 * Generates a full knowledge base article based on the extracted steps.
 * Uses the stronger model for high-quality content generation.
 * 
 * @param {Array<{title: string, description: string, timestamp: number}>} steps 
 * @returns {Promise<string>} Markdown formatted article
 */
const generateArticle = async (steps) => {
    const model = genAI.getGenerativeModel({ model: MODEL_FLASH });

    const stepsJson = JSON.stringify(steps, null, 2);

    const prompt = `
    You are a professional technical writer.
    Create a comprehensive knowledge base article based on the following steps.

    Task:
    1. Write a catchy title and a brief introduction.
    2. Expand each step into a clear instruction section.
    3. Use Markdown formatting (## for headers, **bold** for emphasis).
    4. Add a "Troubleshooting" or "Tips" section at the end if relevant to the context.
    5. Return the result as a Markdown string.

    Steps:
    ${stepsJson}
    `;

    try {
        const result = await model.generateContent(prompt);
        return result.response.text();
    } catch (error) {
        console.error("Gemini generateArticle error:", error);
        return "# Error Generating Article\n\nPlease try again later.";
    }
};

/**
 * Processes a full recording to generate script, steps, and zoom plan.
 * 
 * @param {Object} params
 * @param {string} params.rawTranscript
 * @param {Array} params.uiEvents
 * @param {string} params.styleGuidelines
 * @param {string} params.docUseCase
 * @returns {Promise<Object>} { polished_script, step_by_step_doc, zoom_plan }
 */
const processRecording = async ({ rawTranscript, uiEvents, styleGuidelines, docUseCase }) => {
    const model = genAI.getGenerativeModel({ model: MODEL_FLASH });

    const prompt = `
    You are an expert video editor and technical writer.
    I have a raw transcript from a screen recording.

    Context:
    - Style Guidelines: ${styleGuidelines || 'Professional'}
    - Use Case: ${docUseCase || 'General'}

    Task:
    1. Rewrite the transcript into a polished, professional script (polished_script).
    2. Extract step-by-step instructions (step_by_step_doc).
    3. Suggest zoom actions for key visual elements mentioned (zoom_plan).

    Return JSON only:
    {
        "polished_script": "...",
        "step_by_step_doc": [ { "title": "...", "description": "..." } ],
        "zoom_plan": [ { "timestamp": 0, "target": "..." } ]
    }

    Raw Transcript:
    "${rawTranscript}"
    `;

    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(jsonStr);
    } catch (error) {
        console.error("Gemini processRecording error:", error);
        return {
            polished_script: rawTranscript,
            step_by_step_doc: [],
            zoom_plan: []
        };
    }
};

/**
 * Generates a script for a single slide based on its text content.
 * 
 * @param {string} slideText 
 * @param {number} slideIndex 
 * @returns {Promise<string>} Generated script for the slide
 */
const generateSlideScript = async (slideText, slideIndex) => {
    const model = genAI.getGenerativeModel({ model: MODEL_FLASH });

    const prompt = `
    You are a professional presenter.
    Write a short, engaging voiceover script for Slide ${slideIndex + 1}.
    
    Context from slide:
    "${slideText}"

    Guidelines:
    - Keep it concise (2-3 sentences).
    - Be conversational but professional.
    - If the text is sparse, infer the topic and introduce it.
    - Do not include "Slide X" in the spoken text.
    `;

    try {
        const result = await model.generateContent(prompt);
        return result.response.text();
    } catch (error) {
        console.error("Gemini generateSlideScript error:", error);
        return `Welcome to slide ${slideIndex + 1}. This slide covers: ${slideText.substring(0, 50)}...`;
    }
};

/**
 * Generates a script for an image slide using Vision capabilities.
 * 
 * @param {string} imagePath 
 * @returns {Promise<string>} Generated script
 */
const generateImageScript = async (imagePath) => {
    const model = genAI.getGenerativeModel({ model: MODEL_FLASH });
    const fs = require('fs');

    try {
        const imageBuffer = fs.readFileSync(imagePath);
        const imagePart = {
            inlineData: {
                data: imageBuffer.toString('base64'),
                mimeType: 'image/jpeg', // Assuming jpeg/png
            },
        };

        const prompt = `
        You are a professional presenter.
        Look at this image and write a short, engaging voiceover script for it.
        
        Guidelines:
        - Describe the key visual elements relevant to a presentation.
        - Keep it concise (2-3 sentences).
        - Be conversational.
        `;

        const result = await model.generateContent([prompt, imagePart]);
        return result.response.text();
    } catch (error) {
        console.error("Gemini generateImageScript error:", error);
        return "Here is an image slide. Please review the visual content.";
    }
};

<<<<<<< HEAD
/**
 * Generate a video script from document text
 * @param {string} text - The extracted text from the document
 * @returns {Promise<string>} - Returns the generated script
 */
const generateScriptFromDocument = async (text) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
      You are an expert video script writer.
      I have the content of a document (PDF/DOCX/TXT).
      Please convert this content into an engaging video script for a narrated presentation.
      
      Document Content:
      "${text.substring(0, 30000)}" 
      
      The script should be divided into sections corresponding to slides if possible.
      Return ONLY the raw text of the script, ready for TTS. Do not include "Scene 1" markers or stage directions unless they are part of the narration.
      Make it sound natural and professional.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini Script Generation Error:", error);
    throw new Error("Failed to generate script from document");
  }
};

module.exports = {
  processRecording,
  generateScriptFromDocument
=======
module.exports = {
    cleanScript,
    generateSteps,
    generateArticle,
    processRecording,
    generateSlideScript,
    generateImageScript
>>>>>>> fc79f4c (Update project structure and backend logic)
};
