require('dotenv').config();
const fs = require('fs');
const path = require('path');
const https = require('https');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { GoogleAIFileManager } = require("@google/generative-ai/server");
const googleTTS = require('google-tts-api');

// --- Configuration ---
const CONFIG = {
    videoFile: 'test-sample.mp4',
    audioFile: 'final_voiceover.mp3',
    metadataFile: 'metadata.json',
    geminiModel: 'gemini-2.5-flash',
    ttsLang: 'en'
};

// --- API Initialization ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const fileManager = new GoogleAIFileManager(process.env.GEMINI_API_KEY);

// --- Schema Definition ---
const responseSchema = {
    type: "object",
    properties: {
        script: { 
            type: "string",
            description: "Professional narration text for the video."
        },
        steps: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    timestamp: { type: "number" },
                    title: { type: "string" },
                    instruction: { type: "string" }
                },
                required: ["timestamp", "title", "instruction"]
            }
        },
        visuals: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    timestamp: { type: "number" },
                    coordinates: {
                        type: "array",
                        items: { type: "number" },
                        description: "[ymin, xmin, ymax, xmax]"
                    }
                },
                required: ["timestamp", "coordinates"]
            }
        }
    },
    required: ["script", "steps", "visuals"]
};

/**
 * Uploads the video file to Gemini and waits for it to be active.
 */
async function uploadAndProcessVideo(filePath) {
    if (!fs.existsSync(filePath)) {
        throw new Error(`Video file not found: ${filePath}`);
    }

    console.log(`📤 Uploading ${path.basename(filePath)}...`);
    const uploadResult = await fileManager.uploadFile(filePath, {
        mimeType: "video/mp4",
        displayName: "Engine V1 Video",
    });

    const fileName = uploadResult.file.name;
    console.log(`✅ Uploaded. Name: ${fileName}`);

    // Poll for status
    let file = await fileManager.getFile(fileName);
    process.stdout.write("⏳ Processing");
    
    while (file.state === "PROCESSING") {
        process.stdout.write(".");
        await new Promise(resolve => setTimeout(resolve, 2000));
        file = await fileManager.getFile(fileName);
    }
    console.log(""); // Newline

    if (file.state !== "ACTIVE") {
        throw new Error(`Video processing failed. State: ${file.state}`);
    }

    console.log("✅ Video is ACTIVE and ready for analysis.");
    return file;
}

/**
 * Analyzes the video using Gemini to generate script, steps, and visuals.
 */
async function analyzeVideo(fileUri, mimeType) {
    console.log("🧠 Analyzing video content...");
    
    const model = genAI.getGenerativeModel({
        model: CONFIG.geminiModel,
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: responseSchema,
        }
    });

    const prompt = `
    Analyze this video to create a professional product walkthrough.
    1. Write a polished narration script (remove fillers, make it engaging).
    2. Extract step-by-step instructions with timestamps.
    3. Identify key UI actions and provide zoom coordinates [ymin, xmin, ymax, xmax].
    `;

    const result = await model.generateContent([
        {
            fileData: {
                mimeType: mimeType,
                fileUri: fileUri
            }
        },
        { text: prompt }
    ]);

    const response = result.response.text();
    return JSON.parse(response);
}

/**
 * Generates audio from text using Google TTS (Free).
 */
async function generateAudio(text, outputPath) {
    console.log("🗣️ Generating voiceover with Google TTS...");
    
    // 1. Get URLs for audio chunks (handles long text)
    const urls = googleTTS.getAllAudioUrls(text, {
        lang: CONFIG.ttsLang,
        slow: false,
        host: 'https://translate.google.com',
    });

    console.log(`   - Split into ${urls.length} chunks.`);

    // 2. Download chunks sequentially to avoid ECONNRESET
    const buffers = [];
    for (const [index, chunk] of urls.entries()) {
        process.stdout.write(`\r   - Downloading chunk ${index + 1}/${urls.length}`);
        
        const buffer = await new Promise((resolve, reject) => {
            const req = https.get(chunk.url, (res) => {
                if (res.statusCode !== 200) {
                    reject(new Error(`Failed to download chunk: ${res.statusCode}`));
                    return;
                }
                const data = [];
                res.on('data', (d) => data.push(d));
                res.on('end', () => resolve(Buffer.concat(data)));
                res.on('error', (e) => reject(e));
            });
            
            req.on('error', (e) => reject(e));
        });

        buffers.push(buffer);
        
        // Small delay to be polite and avoid connection resets
        await new Promise(r => setTimeout(r, 200));
    }
    console.log(""); // Newline

    const combinedBuffer = Buffer.concat(buffers);

    // 3. Save to file
    await fs.promises.writeFile(outputPath, combinedBuffer);
    console.log(`✅ Audio saved to ${path.basename(outputPath)}`);
}

/**
 * Main Orchestrator
 */
async function runEngine() {
    const videoPath = path.join(__dirname, CONFIG.videoFile);
    const audioPath = path.join(__dirname, CONFIG.audioFile);
    const metadataPath = path.join(__dirname, CONFIG.metadataFile);

    try {
        // 1. Upload & Wait
        const file = await uploadAndProcessVideo(videoPath);

        // 2. Analyze
        const analysisData = await analyzeVideo(file.uri, file.mimeType);
        
        // 3. Save Metadata
        await fs.promises.writeFile(metadataPath, JSON.stringify(analysisData, null, 2));
        console.log(`✅ Metadata saved to ${path.basename(metadataPath)}`);

        // 4. Generate Audio
        if (analysisData.script) {
            await generateAudio(analysisData.script, audioPath);
        } else {
            console.warn("⚠️ No script generated, skipping audio generation.");
        }

        console.log("\n🎉 Engine V1 finished successfully!");

    } catch (error) {
        console.error("\n❌ Engine Error:", error.message);
        if (error.response) {
            console.error("API Details:", error.response.data);
        }
    }
}

// Execute
runEngine();
