const { GoogleGenerativeAI } = require("@google/generative-ai");
const { GoogleAIFileManager } = require("@google/generative-ai/server");
const fs = require('fs');
const path = require('path');

// Initialize Gemini API and File Manager
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "STUB_KEY");
const fileManager = new GoogleAIFileManager(process.env.GEMINI_API_KEY || "STUB_KEY");

// Model Constants - using Gemini 2.5 Flash family with fallback chain
const MODEL_FLASH = 'gemini-2.5-flash';           // Primary model - best performance
const MODEL_FLASH_LITE = 'gemini-2.5-flash-lite'; // Lite version - faster, lower cost
const MODEL_VIDEO = 'gemini-2.0-flash';           // For video/multimodal - 2.0 has better video support
const MODEL_FALLBACK = 'gemini-2.0-flash';        // Fallback if 2.5 quota exceeded

// Helper to try multiple models
const tryWithFallback = async (primaryModel, fallbackModel, generateFn) => {
    try {
        return await generateFn(primaryModel);
    } catch (error) {
        if (error.status === 429 || error.message?.includes('quota') || error.message?.includes('429')) {
            console.log(`⚠️ Primary model quota exceeded, trying fallback model: ${fallbackModel}`);
            try {
                return await generateFn(fallbackModel);
            } catch (fallbackError) {
                console.error(`❌ Fallback model also failed:`, fallbackError.message);
                throw fallbackError;
            }
        }
        throw error;
    }
};

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
 * Uploads a video file to Google GenAI for analysis with retry logic
 * @param {string} filePath - Path to the video file on disk
 * @param {number} maxRetries - Maximum retry attempts (default: 3)
 * @returns {Promise<string>} File URI for use in Gemini API
 */
const uploadVideoToGemini = async (filePath, maxRetries = 3) => {
    // Check if file exists and get size
    if (!fs.existsSync(filePath)) {
        throw new Error(`Video file not found: ${filePath}`);
    }
    
    const stats = fs.statSync(filePath);
    const fileSizeMB = stats.size / (1024 * 1024);
    console.log(`📁 Video file size: ${fileSizeMB.toFixed(2)} MB`);
    
    // Warn if file is large (>50MB may have issues)
    if (fileSizeMB > 100) {
        console.warn(`⚠️ Large file detected (${fileSizeMB.toFixed(0)}MB). Upload may take longer or fail.`);
    }
    
    let lastError = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`📤 Uploading video to Google File Manager... (attempt ${attempt}/${maxRetries})`);
            
            const uploadResult = await fileManager.uploadFile(filePath, {
                mimeType: "video/mp4", // Adjust if you support other formats
                displayName: "User Recording",
            });
            
            console.log(`✅ Upload complete: ${uploadResult.file.name}`);
            console.log(`⏳ Waiting for processing (initial state: ${uploadResult.file.state})...`);
            
            let file = await fileManager.getFile(uploadResult.file.name);
            let pollAttempts = 0;
            const maxPollAttempts = 60; // 2 minutes max
            
            // Wait for processing to complete
            while (file.state === "PROCESSING" && pollAttempts < maxPollAttempts) {
                await new Promise((resolve) => setTimeout(resolve, 2000));
                file = await fileManager.getFile(uploadResult.file.name);
                pollAttempts++;
                
                if (pollAttempts % 5 === 0) {
                    console.log(`⏳ Still processing... (${pollAttempts * 2}s elapsed)`);
                }
            }
            
            if (file.state === "FAILED") {
                throw new Error("Video processing failed by Gemini.");
            }
            
            if (file.state === "PROCESSING") {
                throw new Error("Video processing timeout - file may be too large");
            }
            
            console.log(`✅ Video ready for analysis: ${file.uri}`);
            return file.uri;
            
        } catch (error) {
            lastError = error;
            console.error(`❌ Upload attempt ${attempt} failed:`, error.message);
            
            // Don't retry on certain errors
            if (error.message?.includes('not found') || 
                error.message?.includes('Invalid API key') ||
                error.message?.includes('quota')) {
                throw error;
            }
            
            if (attempt < maxRetries) {
                const delay = attempt * 2000; // Exponential backoff: 2s, 4s, 6s
                console.log(`⏳ Retrying in ${delay/1000}s...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    
    console.error("❌ All upload attempts failed");
    throw lastError;
};

/**
 * Rewrites script based on Visual Video Context + Current Text
 * If no text is provided, generates a new script from video analysis
 * @param {string} videoFilePath - Path to video file
 * @param {string} currentText - Current script text (optional - can be empty)
 * @returns {Promise<string>} Rewritten or generated script based on visual context
 */
const generateVideoAwareRewrite = async (videoFilePath, currentText) => {
    const generateWithModel = async (modelName) => {
        const model = genAI.getGenerativeModel({ model: modelName });
        
        // 1. Upload Video
        const fileUri = await uploadVideoToGemini(videoFilePath);
        
        // 2. Choose prompt based on whether we have existing text
        let prompt;
        
        if (currentText && currentText.trim()) {
            // Rewrite mode - improve existing text based on video
            prompt = `
            You are an expert video editor and copywriter.
            I will provide a video and a draft script segment.
            
            Task:
            Watch the video segment provided.
            Rewrite the "Draft Script" to perfectly match the actions occurring on screen.
            - If the user clicks a button, mention it.
            - If the screen changes, reflect that in the narration.
            - Make it professional, concise, and engaging.
            - Keep the tone conversational.
            
            Draft Script: "${currentText}"
            `;
        } else {
            // Generate mode - create new script from video analysis
            prompt = `
            You are an expert video editor and copywriter.
            I will provide a video of a screen recording or product demo.
            
            Task:
            Watch the video carefully and generate a professional voiceover script.
            - Describe all the actions happening on screen step by step.
            - If the user clicks a button, mention it clearly.
            - If the screen changes or navigates, describe what's happening.
            - Make the script professional, concise, and engaging.
            - Keep the tone conversational and easy to follow.
            - Focus on what the viewer needs to know to understand the demonstration.
            
            Generate a complete narration script for this video:
            `;
        }

        console.log(`🤖 Generating video-aware ${currentText?.trim() ? "rewrite" : "script"} with model: ${modelName}...`);
        const result = await model.generateContent([
            { fileData: { mimeType: "video/mp4", fileUri: fileUri } },
            { text: prompt },
        ]);
        
        const rewrittenText = result.response.text();
        console.log("✅ Video-aware " + (currentText?.trim() ? "rewrite" : "generation") + " complete!");
        return rewrittenText;
    };

    try {
        // Try primary model first, then fallback
        return await tryWithFallback(MODEL_VIDEO, MODEL_FALLBACK, generateWithModel);
    } catch (error) {
        console.error("❌ Gemini Rewrite Error:", error);
        
        // Check for rate limit error
        if (error.status === 429 || error.message?.includes('quota')) {
            const retryMatch = error.message?.match(/retry in ([\d.]+)s/i);
            const retryTime = retryMatch ? Math.ceil(parseFloat(retryMatch[1])) : 60;
            console.log(`⏳ Rate limited. Quota exceeded - please wait ${retryTime} seconds or check your Gemini API billing.`);
            throw new Error(`API rate limit exceeded. Please wait ${retryTime} seconds and try again, or upgrade your Gemini API plan.`);
        }
        
        // Check for network/fetch errors - try text-only generation as fallback
        if (error.message?.includes('fetch failed') || error.message?.includes('ECONNREFUSED') || error.message?.includes('network')) {
            console.log("⚠️ Video upload failed due to network issues. Trying text-only generation...");
            
            try {
                // Fall back to text-only generation
                const model = genAI.getGenerativeModel({ model: MODEL_FALLBACK });
                const fallbackPrompt = currentText?.trim()
                    ? `Improve and polish this script text professionally:\n\n"${currentText}"\n\nReturn only the improved text.`
                    : `Generate a brief, professional voiceover script placeholder. The script should be about explaining a software feature or tutorial. Keep it under 50 words.`;
                    
                const result = await model.generateContent(fallbackPrompt);
                console.log("✅ Text-only fallback generation complete");
                return result.response.text();
            } catch (fallbackErr) {
                console.error("❌ Text-only fallback also failed:", fallbackErr.message);
            }
        }
        
        console.log("⚠️  Falling back to original text or placeholder");
        return currentText || "Script generation failed. Please try again or write your script manually.";
    }
};

/**
 * Processes a video recording by uploading to Google File Manager and analyzing visual content.
 * 
 * @param {Object} params
 * @param {string} params.videoFilePath - Path to the video file on disk
 * @param {string} params.rawTranscript - Optional raw transcript text
 * @param {string} params.styleGuidelines - Style guidelines for the script
 * @param {string} params.docUseCase - Use case for documentation
 * @returns {Promise<Object>} { polished_script, step_by_step_doc, zoom_plan }
 */
const processVideoRecording = async ({ videoFilePath, rawTranscript, styleGuidelines, docUseCase }) => {
    try {
        console.log("📹 Processing video file for visual analysis...");
        
        // Upload video to Gemini File Manager
        const fileUri = await uploadVideoToGemini(videoFilePath);
        
        // Generate content with video context
        const model = genAI.getGenerativeModel({ model: MODEL_VIDEO });
        
        const prompt = `
        You are an expert video editor and technical writer with visual analysis capabilities.
        Analyze this screen recording video to understand what's happening on screen.
        
        Context:
        - Style Guidelines: ${styleGuidelines || 'Professional'}
        - Use Case: ${docUseCase || 'General Tutorial'}
        ${rawTranscript ? `- Raw Transcript (for reference): "${rawTranscript}"` : ''}
        
        Task:
        1. WATCH the video carefully and observe all UI interactions, mouse movements, and screen changes
        2. Generate a polished, professional voiceover script that describes what you SEE happening
        3. Extract step-by-step instructions based on the VISUAL actions you observe
        4. Suggest zoom/highlight actions for specific UI elements you see (with timestamps)
        5. If a transcript is provided, use it to enhance context but prioritize what you see visually
        
        Important:
        - Reference specific UI elements, buttons, menus, and visual changes you observe
        - Include timestamps for key moments in the video
        - Make the script match the visual flow of the video
        
        Return JSON only (no markdown, no explanations):
        {
            "polished_script": "A natural, engaging script that narrates what's shown in the video",
            "step_by_step_doc": [
                {
                    "title": "Step title based on visual action",
                    "description": "Detailed description of what you see happening",
                    "timestamp": 0
                }
            ],
            "zoom_plan": [
                {
                    "timestamp": 0,
                    "target": "Specific UI element you see (e.g., 'Login button in top-right')",
                    "reason": "Why this element is important to highlight"
                }
            ]
        }
        `;
        
        console.log("🤖 Generating content with visual context...");
        const result = await model.generateContent([
            { fileData: { mimeType: "video/mp4", fileUri: fileUri } },
            { text: prompt }
        ]);
        
        const text = result.response.text();
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsedResult = JSON.parse(jsonStr);
        
        console.log("✅ Generated video-aware content successfully!");
        
        return parsedResult;
        
    } catch (error) {
        console.error("❌ Video processing error:", error);
        console.log("⚠️  Falling back to text-only processing...");
        
        // Fallback to text-only processing
        return processRecording({ 
            rawTranscript: rawTranscript || "Video analysis failed. Please provide a transcript.", 
            uiEvents: [], 
            styleGuidelines, 
            docUseCase 
        });
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

/**
 * Generates/Rewrites script based on Image Analysis
 * @param {string} imagePath - Path to image file
 * @param {string} currentText - Current script text (optional)
 * @returns {Promise<string>} Generated or rewritten script
 */
const generateImageAwareRewrite = async (imagePath, currentText) => {
    const generateWithModel = async (modelName) => {
        const model = genAI.getGenerativeModel({ model: modelName });
        
        // Read image file
        const imageData = fs.readFileSync(imagePath);
        const base64Image = imageData.toString('base64');
        const ext = path.extname(imagePath).toLowerCase();
        const mimeType = ext === '.png' ? 'image/png' : ext === '.gif' ? 'image/gif' : 'image/jpeg';
        
        let prompt;
        
        if (currentText && currentText.trim()) {
            prompt = `
            You are an expert copywriter and presentation designer.
            I will provide an image (a slide or screenshot) and a draft script.
            
            Task:
            Analyze the image and rewrite the draft script to accurately describe what's shown.
            - Describe key visual elements, text, and UI components visible.
            - Make it professional, concise, and engaging.
            - Keep the tone conversational.
            
            Draft Script: "${currentText}"
            
            Return ONLY the rewritten script text.
            `;
        } else {
            prompt = `
            You are an expert copywriter and presentation designer.
            I will provide an image (a slide or screenshot).
            
            Task:
            Analyze the image and generate a professional voiceover script for it.
            - Describe what's shown in the image clearly and engagingly.
            - If it's a UI screenshot, explain the interface and key elements.
            - If it's a presentation slide, narrate the key points.
            - Make it professional, concise, and easy to follow.
            - Keep the tone conversational.
            
            Generate a narration script for this image:
            `;
        }

        console.log(`🤖 Generating image-aware ${currentText?.trim() ? "rewrite" : "script"} with model: ${modelName}...`);
        
        const result = await model.generateContent([
            {
                inlineData: {
                    mimeType: mimeType,
                    data: base64Image
                }
            },
            { text: prompt }
        ]);
        
        const rewrittenText = result.response.text();
        console.log("✅ Image-aware " + (currentText?.trim() ? "rewrite" : "generation") + " complete!");
        return rewrittenText;
    };
    
    try {
        return await tryWithFallback(MODEL_FLASH, MODEL_FALLBACK, generateWithModel);
    } catch (error) {
        console.error("❌ Gemini Image Analysis Error:", error);
        return currentText || "Script generation failed. Please try again or write your script manually.";
    }
};

/**
 * Generates script using text-only mode (no media)
 * @param {string} currentText - Current script text or context
 * @returns {Promise<string>} Generated or improved script
 */
const generateTextOnlyScript = async (currentText) => {
    const generateWithModel = async (modelName) => {
        const model = genAI.getGenerativeModel({ model: modelName });
        
        let prompt;
        
        if (currentText && currentText.trim()) {
            prompt = `
            You are an expert copywriter and script editor.
            
            Task:
            Improve the following draft script to be more professional and engaging.
            - Fix grammar and sentence structure.
            - Make it sound natural and conversational.
            - Keep the same meaning but improve clarity.
            
            Draft Script: "${currentText}"
            
            Return ONLY the improved script text.
            `;
        } else {
            prompt = `
            You are an expert copywriter.
            
            Task:
            Generate a short, professional placeholder script for a video presentation.
            The script should be a generic introduction that can be customized.
            
            Example topics: product demo, tutorial walkthrough, feature explanation.
            
            Return ONLY the script text (2-3 sentences).
            `;
        }

        console.log(`🤖 Generating text-only script with model: ${modelName}...`);
        const result = await model.generateContent(prompt);
        const generatedText = result.response.text();
        console.log("✅ Text-only generation complete!");
        return generatedText;
    };
    
    try {
        return await tryWithFallback(MODEL_FLASH_LITE, MODEL_FALLBACK, generateWithModel);
    } catch (error) {
        console.error("❌ Gemini Text Generation Error:", error);
        return currentText || "Welcome to this presentation. Let's explore the key features and capabilities.";
    }
};

module.exports = {
    cleanScript,
    generateSteps,
    generateArticle,
    processRecording,
    processVideoRecording,
    uploadVideoToGemini,
    generateVideoAwareRewrite,
    generateImageAwareRewrite,
    generateTextOnlyScript,
    generateSlideScript,
    generateImageScript,
    generateScriptFromDocument
};
