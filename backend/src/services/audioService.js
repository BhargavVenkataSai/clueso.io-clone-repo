const { GoogleGenerativeAI } = require("@google/generative-ai");
const googleTTS = require('google-tts-api');
const fs = require('fs');
const path = require('path');
const https = require('https');

// Initialize Gemini
// Note: Requires GEMINI_API_KEY in .env
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "YOUR_API_KEY_HERE");

/**
 * Orchestrates the full audio processing pipeline
 * 1. Clean/Generate text using Gemini
 * 2. Convert to Audio using Google TTS
 * 3. Save to disk
 */
const processAudio = async ({ text, voice = 'en', speed = 1 }) => {
    try {
        console.log("Processing audio request...");

        // --- Step 1: Text Processing (Gemini) ---
        // If the text is raw data or needs polish, we use Gemini. 
        // If it's already a script, we might skip this or use it for "AI Rewrite".
        // For this implementation, we'll assume we want to 'polish' the text for speech.
        
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const prompt = `Rewrite the following text to be natural, engaging, and optimized for a video narration script. Keep it concise. Return ONLY the rewriten text, no markdown or labels.\n\nInput Text: "${text}"`;
        
        let cleanedText = text;
        try {
            if (process.env.GEMINI_API_KEY) {
                const result = await model.generateContent(prompt);
                const response = await result.response;
                cleanedText = response.text().trim();
                console.log("Gemini cleaned text:", cleanedText);
            } else {
                console.warn("GEMINI_API_KEY missing, skipping AI rewrite step.");
            }
        } catch (err) {
            console.error("Gemini Error:", err.message);
            // Fallback to original text if AI fails
        }

        // --- Step 2: TTS Generation (Google TTS) ---
        // google-tts-api splits long text automatically. We'll download the chunks.
        
        // Get URLs for the audio chunks
        const urls = googleTTS.getAllAudioUrls(cleanedText, {
            lang: voice,
            slow: false,
            host: 'https://translate.google.com',
        });

        console.log(`Generated ${urls.length} audio chunks.`);

        // --- Step 3: Download and Merge ---
        // For simplicity, we will save them sequentially. 
        // In a real production app we'd use ffmpeg to merge mp3s properly.
        // For this prototype, we'll just return the first chunk or the list of URLs for the frontend to play sequentially.
        // OR: We can try to concatenate buffers if they are consistent mp3 streams (often works for simple cases).

        const downloadPromises = urls.map(chunk => {
            return new Promise((resolve, reject) => {
                https.get(chunk.url, (res) => {
                    const data = [];
                    res.on('data', (d) => data.push(d));
                    res.on('end', () => resolve(Buffer.concat(data)));
                    res.on('error', (e) => reject(e));
                });
            });
        });

        const buffers = await Promise.all(downloadPromises);
        const combinedBuffer = Buffer.concat(buffers);

        // Save to file
        const fileName = `tts-${Date.now()}.mp3`;
        const uploadDir = path.join(__dirname, '../uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        const filePath = path.join(uploadDir, fileName);
        await fs.promises.writeFile(filePath, combinedBuffer);

        return {
            success: true,
            cleaned_text: cleanedText,
            audio_path: `/uploads/${fileName}`,
            duration_estimate: cleanedText.length * 0.1 // rough estimate
        };

    } catch (error) {
        console.error("Audio Service Error:", error);
        return { success: false, error: error.message };
    }
};

module.exports = {
    processAudio
};
