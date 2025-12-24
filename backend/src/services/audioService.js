const { GoogleGenerativeAI } = require("@google/generative-ai");
const googleTTS = require('google-tts-api');
const fs = require('fs');
const path = require('path');
const https = require('https');

// Initialize Gemini
// Note: Requires GEMINI_API_KEY in .env
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "YOUR_API_KEY_HERE");

// Map UI voice ids to TTS language codes (all English for now)
const VOICE_LANG_MAP = {
    amrit: 'en',
    matt: 'en',
    james: 'en',
    michael: 'en',
    david: 'en',
    sammy: 'en',
    natasha: 'en',
    jessica: 'en',
    sarah: 'en',
    emily: 'en'
};

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
        // Note: Using gemini-2.5-flash which is confirmed available in this project.
        
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
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

        // Resolve UI voice id to an actual language code
        const ttsLang = VOICE_LANG_MAP[voice] || voice || 'en';

        // Get URLs for the audio chunks
        const urls = googleTTS.getAllAudioUrls(cleanedText, {
            lang: ttsLang,
            slow: false,
            host: 'https://translate.google.com',
        });

        console.log(`Generated ${urls.length} audio chunks with lang="${ttsLang}".`);

        // --- Step 3: Download and Merge ---
        // Download sequentially with small delays to avoid connection resets.

        const buffers = [];
        for (let i = 0; i < urls.length; i++) {
            const chunk = urls[i];
            console.log(`Downloading TTS chunk ${i + 1}/${urls.length}...`);

            const buffer = await new Promise((resolve, reject) => {
                const req = https.get(chunk.url, (res) => {
                    if (res.statusCode !== 200) {
                        reject(new Error(`Failed to download TTS chunk: status ${res.statusCode}`));
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
            await new Promise(r => setTimeout(r, 200));
        }

        const combinedBuffer = Buffer.concat(buffers);

        // Save to file
        const fileName = `tts-${Date.now()}.mp3`;
        const uploadDir = path.join(__dirname, '../uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        const filePath = path.join(uploadDir, fileName);
        await fs.promises.writeFile(filePath, combinedBuffer);

        // Generate estimated word alignment
        // Assuming average speaking rate or linear distribution
        const words = cleanedText.split(/\s+/);
        const totalDuration = combinedBuffer.length / 16000; // Rough estimate based on bitrate, or use the estimate below
        const estimatedDuration = cleanedText.length * 0.08; // ~80ms per character is a decent approximation for TTS
        
        const wordAlignment = words.map((word, index) => {
            const start = (index / words.length) * estimatedDuration;
            const end = ((index + 1) / words.length) * estimatedDuration;
            return { word, start, end };
        });

        return {
            success: true,
            cleaned_text: cleanedText,
            audio_path: `/uploads/${fileName}`,
            duration_estimate: estimatedDuration,
            word_alignment: wordAlignment
        };

    } catch (error) {
        console.error("Audio Service Error:", error);
        return { success: false, error: error.message };
    }
};

module.exports = {
    processAudio
};
