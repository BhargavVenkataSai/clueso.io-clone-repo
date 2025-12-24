require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { GoogleAIFileManager } = require("@google/generative-ai/server");
const OpenAI = require("openai");

// Configuration
const VIDEO_FILENAME = 'test-sample.mp4';
const OUTPUT_AUDIO_FILENAME = 'output_narration.mp3';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!GEMINI_API_KEY) {
    console.error("❌ Error: GEMINI_API_KEY is missing in .env file");
    process.exit(1);
}

if (!OPENAI_API_KEY) {
    console.error("❌ Error: OPENAI_API_KEY is missing in .env file");
    process.exit(1);
}

// Initialize Clients
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const fileManager = new GoogleAIFileManager(GEMINI_API_KEY);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// Define the Schema for Structured Output
const responseSchema = {
    type: "object",
    properties: {
        polished_script: {
            type: "string",
            description: "A professional, engaging video script suitable for narration. Remove filler words."
        },
        steps: {
            type: "array",
            description: "Step-by-step instructions extracted from the video.",
            items: {
                type: "object",
                properties: {
                    step_number: { type: "number" },
                    instruction: { type: "string" },
                    timestamp_seconds: { type: "number" }
                },
                required: ["step_number", "instruction"]
            }
        },
        zoom_events: {
            type: "array",
            description: "Key UI actions that require zooming.",
            items: {
                type: "object",
                properties: {
                    timestamp_seconds: { type: "number" },
                    description: { type: "string" },
                    coordinates: {
                        type: "array",
                        description: "Zoom coordinates in [ymin, xmin, ymax, xmax] format (0-1000 scale or normalized 0-1)",
                        items: { type: "number" }
                    }
                },
                required: ["timestamp_seconds", "coordinates"]
            }
        }
    },
    required: ["polished_script", "steps", "zoom_events"]
};

async function processVideo() {
    const videoPath = path.join(__dirname, VIDEO_FILENAME);

    if (!fs.existsSync(videoPath)) {
        console.error(`❌ Error: Video file not found at ${videoPath}`);
        console.log("Please place 'test-sample.mp4' in the backend directory.");
        return;
    }

    try {
        // --- Step 1: Upload Video to Gemini ---
        console.log(`\n📤 Uploading ${VIDEO_FILENAME} to Gemini...`);
        
        const uploadResult = await fileManager.uploadFile(videoPath, {
            mimeType: "video/mp4",
            displayName: "Product Walkthrough Video",
        });
        
        const fileUri = uploadResult.file.uri;
        console.log(`✅ Upload successful. URI: ${fileUri}`);

        // --- Step 2: Wait for Processing ---
        console.log("⏳ Waiting for video processing to complete...");
        let file = await fileManager.getFile(uploadResult.file.name);
        
        while (file.state === "PROCESSING") {
            process.stdout.write(".");
            await new Promise((resolve) => setTimeout(resolve, 2000));
            file = await fileManager.getFile(uploadResult.file.name);
        }
        console.log("\n");

        if (file.state === "FAILED") {
            throw new Error("Video processing failed on Gemini side.");
        }
        console.log(`✅ Video is ready (State: ${file.state})`);

        // --- Step 3: Analyze with Gemini 2.5 Flash ---
        console.log("🧠 Analyzing video with Gemini 2.5 Flash...");
        
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
            }
        });

        const prompt = `
        You are an expert video editor and technical writer.
        Analyze this product walkthrough video.
        
        1. Create a professional, engaging narration script. Remove any filler words (um, uh) and make it sound smooth.
        2. Extract clear step-by-step instructions for documentation.
        3. Identify key moments where the user interacts with the UI and provide zoom coordinates [ymin, xmin, ymax, xmax] to highlight the action.
        `;

        const result = await model.generateContent([
            {
                fileData: {
                    mimeType: file.mimeType,
                    fileUri: file.uri
                }
            },
            { text: prompt }
        ]);

        const responseText = result.response.text();
        const analysisData = JSON.parse(responseText);
        
        console.log("✅ Analysis Complete!");
        console.log("--------------------------------------------------");
        console.log("📝 Script Preview:", analysisData.polished_script.substring(0, 100) + "...");
        console.log(`📑 Steps Extracted: ${analysisData.steps.length}`);
        console.log(`🔍 Zoom Events: ${analysisData.zoom_events.length}`);
        console.log("--------------------------------------------------");

        // --- Step 4: Generate Audio with OpenAI TTS ---
        console.log("🗣️ Generating voiceover with OpenAI (tts-1)...");

        const mp3 = await openai.audio.speech.create({
            model: "tts-1",
            voice: "alloy",
            input: analysisData.polished_script,
        });

        const buffer = Buffer.from(await mp3.arrayBuffer());
        const outputPath = path.join(__dirname, OUTPUT_AUDIO_FILENAME);
        
        await fs.promises.writeFile(outputPath, buffer);
        console.log(`✅ Audio saved to: ${outputPath}`);

        // Save the full analysis JSON for reference
        const jsonOutputPath = path.join(__dirname, 'output_analysis.json');
        await fs.promises.writeFile(jsonOutputPath, JSON.stringify(analysisData, null, 2));
        console.log(`✅ Analysis JSON saved to: ${jsonOutputPath}`);

        console.log("\n🎉 Process completed successfully!");

    } catch (error) {
        console.error("\n❌ An error occurred during the process:");
        console.error(error);
    }
}

// Run the script
processVideo();
