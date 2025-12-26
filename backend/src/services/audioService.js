const { GoogleGenerativeAI } = require("@google/generative-ai");
const { ElevenLabsClient } = require("@elevenlabs/elevenlabs-js");
const googleTTS = require('google-tts-api');
const fs = require('fs');
const path = require('path');
const https = require('https');

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "YOUR_API_KEY_HERE");

// Initialize ElevenLabs
const elevenlabs = new ElevenLabsClient({
    apiKey: process.env.ELEVENLABS_API_KEY
});

// ElevenLabs Voice IDs - Free tier voices
// You can get more voices from: https://elevenlabs.io/docs/voices
const ELEVENLABS_VOICES = {
    // Premade voices (free tier)
    rachel: "21m00Tcm4TlvDq8ikWAM",   // Rachel - calm, female
    drew: "29vD33N1CtxCmqQRPOHJ",     // Drew - confident, male
    clyde: "2EiwWnXFnvU5JabPnv8n",    // Clyde - war veteran, male
    paul: "5Q0t7uMcjvnagumLfvZi",     // Paul - news anchor, male
    domi: "AZnzlk1XvdvUeBnXmlld",     // Domi - confident, female
    dave: "CYw3kZ02Hs0563khs1Fj",     // Dave - conversational, male
    fin: "D38z5RcWu1voky8WS1ja",      // Fin - sailor, male
    sarah: "EXAVITQu4vr4xnSDxMaL",    // Sarah - calm, female
    antoni: "ErXwobaYiN019PkySvjV",   // Antoni - well-rounded, male
    thomas: "GBv7mTt0atIp3Br8iCZE",   // Thomas - calm, male
    charlie: "IKne3meq5aSn9XLyUdCD",  // Charlie - casual, male
    emily: "LcfcDJNUP1GQjkzn1xUU",    // Emily - calm, female
    elli: "MF3mGyEYCl7XYWbV9V6O",     // Elli - emotional, female
    callum: "N2lVS1w4EtoT3dr4eOWO",   // Callum - intense, male
    patrick: "ODq5zmih8GrVes37Dizd",  // Patrick - shouty, male
    harry: "SOYHLrjzK2X1ezoPC6cr",    // Harry - anxious, male
    liam: "TX3LPaxmHKxFdv7VOQHJ",     // Liam - articulate, male
    dorothy: "ThT5KcBeYPX3keUQqHPh",  // Dorothy - pleasant, female
    josh: "TxGEqnHWrfWFTfGW9XjX",     // Josh - deep, male
    arnold: "VR6AewLTigWG4xSOukaG",   // Arnold - crisp, male
    charlotte: "XB0fDUnXU5powFXDhCwa", // Charlotte - seductive, female
    matilda: "XrExE9yKIg1WjnnlVkGX",  // Matilda - warm, female
    matthew: "Yko7PKs6WkxO6YstNedj",  // Matthew - audiobook, male
    james: "ZQe5CZNOzWyzPSCn5a3c",    // James - calm, male
    joseph: "Zlb1dXrM653N07WRdFW3",   // Joseph - british, male
    jeremy: "bVMeCyTHy58xNoL34h3p",   // Jeremy - excited, male
    michael: "flq6f7yk4E4fJM5XTYuZ",  // Michael - audiobook, male
    ethan: "g5CIjZEefAph4nQFvHAz",    // Ethan - narrator, male
    gigi: "jBpfuIE2acCO8z3wKNLl",     // Gigi - childish, female
    freya: "jsCqWAovK2LkecY7zXl4",    // Freya - expressive, female
    grace: "oWAxZDx7w5VEj9dCyTzz",    // Grace - southern, female
    daniel: "onwK4e9ZLuTAKqWW03F9",   // Daniel - deep, male
    serena: "pMsXgVXv3BLzUgSXRplE",   // Serena - pleasant, female
    adam: "pNInz6obpgDQGcFmaJgB",     // Adam - deep, male
    nicole: "piTKgcLEGmPE4e6mEKli",   // Nicole - whisper, female
    bill: "pqHfZKP75CvOlQylNhV4",     // Bill - documentary, male
    jessie: "t0jbNlBVZ17f02VDIeMI",   // Jessie - raspy, female
    sam: "yoZ06aMxZJJ28mfd3POQ",      // Sam - raspy, male
    glinda: "z9fAnlkpzviPz146aGWa",   // Glinda - witch, female
    giovanni: "zcAOhNBS3c14rBihAFp1", // Giovanni - italian, male
    mimi: "zrHiDhphv9ZnVXBqCLjz",     // Mimi - childish, female
};

// Map UI voice names to ElevenLabs voice IDs
const VOICE_MAP = {
    amrit: ELEVENLABS_VOICES.adam,
    matt: ELEVENLABS_VOICES.matthew,
    james: ELEVENLABS_VOICES.james,
    michael: ELEVENLABS_VOICES.michael,
    david: ELEVENLABS_VOICES.daniel,
    sammy: ELEVENLABS_VOICES.sam,
    natasha: ELEVENLABS_VOICES.sarah,
    jessica: ELEVENLABS_VOICES.charlotte,
    sarah: ELEVENLABS_VOICES.sarah,
    emily: ELEVENLABS_VOICES.emily,
    // Direct ElevenLabs voice names
    rachel: ELEVENLABS_VOICES.rachel,
    charlotte: ELEVENLABS_VOICES.charlotte,
    matilda: ELEVENLABS_VOICES.matilda,
    adam: ELEVENLABS_VOICES.adam,
    daniel: ELEVENLABS_VOICES.daniel,
};

// Fallback to Google TTS language mapping
const GOOGLE_TTS_LANG_MAP = {
    amrit: 'en', matt: 'en', james: 'en', michael: 'en',
    david: 'en', sammy: 'en', natasha: 'en', jessica: 'en',
    sarah: 'en', emily: 'en'
};

/**
 * Generate audio using ElevenLabs API
 */
const generateWithElevenLabs = async (text, voiceId) => {
    try {
        console.log(`🎙️ Using ElevenLabs with voice: ${voiceId}`);
        
        const audio = await elevenlabs.textToSpeech.convert(voiceId, {
            text: text,
            model_id: "eleven_multilingual_v2", // Best quality model
            output_format: "mp3_44100_128",
            voice_settings: {
                stability: 0.5,
                similarity_boost: 0.75,
                style: 0.0,
                use_speaker_boost: true
            }
        });

        // Convert readable stream to buffer
        const chunks = [];
        for await (const chunk of audio) {
            chunks.push(chunk);
        }
        const audioBuffer = Buffer.concat(chunks);
        
        console.log(`✅ ElevenLabs generated ${audioBuffer.length} bytes`);
        return audioBuffer;
        
    } catch (error) {
        console.error("❌ ElevenLabs error:", error.message);
        throw error;
    }
};

/**
 * Generate audio using Google TTS (fallback)
 */
const generateWithGoogleTTS = async (text, lang = 'en') => {
    console.log(`📢 Falling back to Google TTS with lang: ${lang}`);
    
    const urls = googleTTS.getAllAudioUrls(text, {
        lang: lang,
        slow: false,
        host: 'https://translate.google.com',
    });

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

    return Buffer.concat(buffers);
};

/**
 * Count approximate syllables in a word (English heuristic)
 * @param {string} word 
 * @returns {number}
 */
const countSyllables = (word) => {
    word = word.toLowerCase().replace(/[^a-z]/g, '');
    if (word.length <= 3) return 1;
    
    // Count vowel groups
    const vowelPattern = /[aeiouy]+/g;
    const matches = word.match(vowelPattern);
    let count = matches ? matches.length : 1;
    
    // Adjust for silent e at end
    if (word.endsWith('e') && !word.endsWith('le')) {
        count = Math.max(1, count - 1);
    }
    
    // Adjust for common endings
    if (word.endsWith('ed') && !word.match(/[aeiouy]ed$/)) {
        count = Math.max(1, count - 1);
    }
    
    return Math.max(1, count);
};

/**
 * Generate word-level alignment data for karaoke sync
 * Uses syllable-weighted duration estimation for more accurate timing
 * 
 * @param {string} text - The full text to align
 * @param {number} totalDuration - Estimated total duration in seconds
 * @returns {Array<{text: string, startTime: number, endTime: number}>}
 */
const generateWordAlignment = (text, totalDuration) => {
    const words = text.split(/\s+/).filter(w => w.length > 0);
    if (words.length === 0) return [];
    
    // Calculate syllable count for each word
    const wordData = words.map(word => ({
        text: word,
        syllables: countSyllables(word),
        // Longer words and punctuation need slightly more time
        weight: countSyllables(word) + (word.match(/[.,!?;:]$/) ? 0.3 : 0)
    }));
    
    // Calculate total weight
    const totalWeight = wordData.reduce((sum, w) => sum + w.weight, 0);
    
    // Generate timestamps
    let currentTime = 0;
    const alignment = wordData.map((word, index) => {
        const duration = (word.weight / totalWeight) * totalDuration;
        const startTime = currentTime;
        const endTime = currentTime + duration;
        
        currentTime = endTime;
        
        return {
            text: word.text,
            startTime: Math.round(startTime * 1000) / 1000, // Round to 3 decimals
            endTime: Math.round(endTime * 1000) / 1000
        };
    });
    
    // Ensure last word ends exactly at totalDuration
    if (alignment.length > 0) {
        alignment[alignment.length - 1].endTime = totalDuration;
    }
    
    return alignment;
};

/**
 * Calculate estimated audio duration based on text characteristics
 * @param {string} text 
 * @returns {number} Estimated duration in seconds
 */
const estimateAudioDuration = (text) => {
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const totalSyllables = words.reduce((sum, word) => sum + countSyllables(word), 0);
    
    // Average speaking rate: ~3-4 syllables per second for natural speech
    // ElevenLabs tends to be slightly faster, so we use 3.5 syllables/sec
    const syllablesPerSecond = 3.5;
    
    // Add pause time for punctuation
    const pauseCount = (text.match(/[.,!?;:]/g) || []).length;
    const pauseTime = pauseCount * 0.15; // 150ms pause per punctuation
    
    return (totalSyllables / syllablesPerSecond) + pauseTime;
};

/**
 * Orchestrates the full audio processing pipeline
 * 1. Clean/Generate text using Gemini
 * 2. Convert to Audio using ElevenLabs (or Google TTS fallback)
 * 3. Save to disk
 */
const processAudio = async ({ text, voice = 'adam', speed = 1 }) => {
    try {
        console.log("🎬 Processing audio request...");
        console.log(`   Voice: ${voice}, Text length: ${text.length}`);

        // --- Step 1: Text Processing (Gemini) ---
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const prompt = `Rewrite the following text to be natural, engaging, and optimized for a video narration script. Keep it concise. Return ONLY the rewritten text, no markdown or labels.\n\nInput Text: "${text}"`;
        
        let cleanedText = text;
        try {
            if (process.env.GEMINI_API_KEY) {
                const result = await model.generateContent(prompt);
                const response = await result.response;
                cleanedText = response.text().trim();
                console.log("✅ Gemini cleaned text:", cleanedText.substring(0, 100) + "...");
            }
        } catch (err) {
            if (err.status === 429 || err.message?.includes('429') || err.message?.includes('quota')) {
                console.warn("⚠️  Gemini rate limit. Using original text.");
            } else {
                console.error("❌ Gemini Error:", err.message);
            }
        }

        // --- Step 2: TTS Generation ---
        let audioBuffer;
        const voiceId = VOICE_MAP[voice.toLowerCase()] || VOICE_MAP.adam;
        
        // Try ElevenLabs first, fall back to Google TTS
        if (process.env.ELEVENLABS_API_KEY) {
            try {
                audioBuffer = await generateWithElevenLabs(cleanedText, voiceId);
            } catch (elevenLabsError) {
                console.warn("⚠️  ElevenLabs failed, falling back to Google TTS:", elevenLabsError.message);
                const ttsLang = GOOGLE_TTS_LANG_MAP[voice] || 'en';
                audioBuffer = await generateWithGoogleTTS(cleanedText, ttsLang);
            }
        } else {
            console.warn("⚠️  ELEVENLABS_API_KEY not set. Using Google TTS.");
            const ttsLang = GOOGLE_TTS_LANG_MAP[voice] || 'en';
            audioBuffer = await generateWithGoogleTTS(cleanedText, ttsLang);
        }

        // --- Step 3: Save to file ---
        const fileName = `tts-${Date.now()}.mp3`;
        const uploadDir = path.join(__dirname, '../uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        const filePath = path.join(uploadDir, fileName);
        await fs.promises.writeFile(filePath, audioBuffer);

        // --- Step 4: Generate word alignment ---
        // Calculate duration using syllable-based estimation
        const estimatedDuration = estimateAudioDuration(cleanedText);
        
        // Generate word alignment with syllable-weighted timing
        const wordAlignment = generateWordAlignment(cleanedText, estimatedDuration);
        
        console.log(`📝 Generated ${wordAlignment.length} word alignments, estimated duration: ${estimatedDuration.toFixed(2)}s`);

        console.log(`✅ Audio saved: ${fileName} (${(audioBuffer.length / 1024).toFixed(1)} KB)`);

        return {
            success: true,
            cleaned_text: cleanedText,
            audio_path: `/uploads/${fileName}`,
            duration_estimate: estimatedDuration,
            word_alignment: wordAlignment,
            tts_provider: process.env.ELEVENLABS_API_KEY ? 'elevenlabs' : 'google'
        };

    } catch (error) {
        console.error("❌ Audio Service Error:", error);
        return { success: false, error: error.message };
    }
};

/**
 * Get available ElevenLabs voices
 */
const getAvailableVoices = async () => {
    if (!process.env.ELEVENLABS_API_KEY) {
        return { success: false, error: 'ElevenLabs API key not configured' };
    }
    
    try {
        const voices = await elevenlabs.voices.getAll();
        return {
            success: true,
            voices: voices.voices.map(v => ({
                id: v.voice_id,
                name: v.name,
                category: v.category,
                labels: v.labels
            }))
        };
    } catch (error) {
        console.error("Failed to get voices:", error);
        return { success: false, error: error.message };
    }
};

module.exports = {
    processAudio,
    getAvailableVoices,
    ELEVENLABS_VOICES
};
