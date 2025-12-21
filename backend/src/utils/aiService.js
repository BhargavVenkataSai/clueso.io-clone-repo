/**
 * Mock AI Service
 * Simulates AI processing for video editing features
 * 
 * NOTE: This is a MOCK implementation for the technical assignment.
 * In production, this would integrate with actual AI services like:
 * - OpenAI Whisper for transcription
 * - ElevenLabs or Azure TTS for voiceovers
 * - Custom ML models for filler word detection
 * - Computer vision for auto-zoom detection
 */

/**
 * Mock transcription generation
 * Simulates converting video audio to text
 */
const generateTranscript = async (videoFile) => {
  // Simulate processing delay
  await delay(1000);
  
  return {
    original: "Um, so today I'm gonna show you, like, how to use this feature. So first, you know, you click on the button here, and then, uh, you fill out the form. And basically, that's it.",
    language: 'en',
    confidence: 0.95
  };
};

/**
 * Mock filler word removal
 * Simulates AI cleaning transcript of filler words
 */
const removeFillerWords = async (transcript) => {
  await delay(500);
  
  // Remove common filler words
  const fillerWords = ['um', 'uh', 'like', 'you know', 'basically', 'so', 'gonna'];
  let cleaned = transcript.toLowerCase();
  
  fillerWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b,?\\s*`, 'gi');
    cleaned = cleaned.replace(regex, '');
  });
  
  // Capitalize first letter
  cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  
  return {
    edited: cleaned.trim(),
    removedCount: 7
  };
};

/**
 * Mock AI voiceover generation
 * Simulates generating natural-sounding AI voice
 */
const generateVoiceover = async (text, voiceId = 'professional-male') => {
  await delay(2000);
  
  return {
    audioUrl: `/mock/audio/${Date.now()}.mp3`,
    duration: Math.floor(text.length / 15), // Rough estimate: 15 chars per second
    voiceId,
    format: 'mp3'
  };
};

/**
 * Mock auto-zoom detection
 * Simulates detecting key moments for zooming
 */
const detectAutoZoom = async (videoFile) => {
  await delay(1500);
  
  return {
    zoomPoints: [
      { timestamp: 5.2, duration: 2.0, x: 450, y: 300, scale: 1.5 },
      { timestamp: 12.8, duration: 3.0, x: 620, y: 400, scale: 1.8 },
      { timestamp: 25.5, duration: 2.5, x: 380, y: 250, scale: 1.6 }
    ]
  };
};

/**
 * Mock caption generation
 * Simulates creating time-synced captions
 */
const generateCaptions = async (transcript, language = 'en') => {
  await delay(800);
  
  const words = transcript.split(' ');
  const captions = [];
  let currentTime = 0;
  
  // Group words into caption chunks (5-7 words)
  for (let i = 0; i < words.length; i += 6) {
    const chunk = words.slice(i, i + 6).join(' ');
    captions.push({
      startTime: currentTime,
      endTime: currentTime + 3,
      text: chunk
    });
    currentTime += 3;
  }
  
  return {
    captions,
    language,
    format: 'srt'
  };
};

/**
 * Mock documentation generation
 * Simulates creating step-by-step guide from video
 */
const generateDocumentation = async (transcript, videoMetadata) => {
  await delay(1200);
  
  return {
    title: videoMetadata.title || 'How to Use This Feature',
    steps: [
      {
        stepNumber: 1,
        title: 'Access the Feature',
        description: 'Navigate to the main dashboard and locate the feature button.',
        screenshot: `/mock/screenshots/step1-${Date.now()}.jpg`,
        timestamp: 2.5
      },
      {
        stepNumber: 2,
        title: 'Fill Out the Form',
        description: 'Complete all required fields in the form with your information.',
        screenshot: `/mock/screenshots/step2-${Date.now()}.jpg`,
        timestamp: 8.3
      },
      {
        stepNumber: 3,
        title: 'Submit and Confirm',
        description: 'Click the submit button and wait for confirmation.',
        screenshot: `/mock/screenshots/step3-${Date.now()}.jpg`,
        timestamp: 15.7
      }
    ],
    format: 'html',
    language: 'en'
  };
};

/**
 * Mock translation service
 * Simulates translating content to different languages
 */
const translateContent = async (content, targetLanguage) => {
  await delay(1000);
  
  const mockTranslations = {
    'es': 'Contenido traducido al español',
    'de': 'Ins Deutsche übersetzte Inhalte',
    'fr': 'Contenu traduit en français',
    'ja': '日本語に翻訳されたコンテンツ',
    'hi': 'हिंदी में अनुवादित सामग्री'
  };
  
  return {
    translatedContent: mockTranslations[targetLanguage] || 'Translated content',
    targetLanguage,
    confidence: 0.92
  };
};

/**
 * Mock video processing pipeline
 * Orchestrates all AI features
 */
const processVideo = async (videoData, features = {}) => {
  const results = {
    videoId: videoData.id,
    processedAt: new Date(),
    features: {}
  };
  
  try {
    // Step 1: Transcription (always needed)
    const transcription = await generateTranscript(videoData.file);
    results.features.transcription = transcription;
    
    // Step 2: Remove filler words (if enabled)
    if (features.removeFillerWords !== false) {
      const cleanedTranscript = await removeFillerWords(transcription.original);
      results.features.cleanedTranscript = cleanedTranscript;
    }
    
    // Step 3: Generate voiceover (if enabled)
    if (features.generateVoiceover) {
      const text = results.features.cleanedTranscript?.edited || transcription.original;
      const voiceover = await generateVoiceover(text, features.voiceId);
      results.features.voiceover = voiceover;
    }
    
    // Step 4: Auto-zoom detection (if enabled)
    if (features.autoZoom) {
      const zoomData = await detectAutoZoom(videoData.file);
      results.features.autoZoom = zoomData;
    }
    
    // Step 5: Generate captions (if enabled)
    if (features.generateCaptions) {
      const text = results.features.cleanedTranscript?.edited || transcription.original;
      const captions = await generateCaptions(text);
      results.features.captions = captions;
    }
    
    // Step 6: Generate documentation (if enabled)
    if (features.generateDocumentation) {
      const text = results.features.cleanedTranscript?.edited || transcription.original;
      const documentation = await generateDocumentation(text, videoData);
      results.features.documentation = documentation;
    }
    
    results.status = 'completed';
    results.processingTime = 5000; // Mock 5 seconds
    
  } catch (error) {
    results.status = 'failed';
    results.error = error.message;
  }
  
  return results;
};

/**
 * Mock Feedback Insights Generation
 * Simulates sentiment analysis and summarization
 */
const generateFeedbackInsights = async (content) => {
  await delay(1000);

  const sentiments = ['positive', 'neutral', 'negative'];
  const categories = ['bug', 'feature', 'improvement', 'question', 'other'];
  
  // Simple deterministic mock based on content length or keywords
  const sentiment = content.toLowerCase().includes('bad') || content.toLowerCase().includes('broken') ? 'negative' : 
                   content.toLowerCase().includes('good') || content.toLowerCase().includes('great') ? 'positive' : 'neutral';
  
  const suggestedCategory = content.toLowerCase().includes('bug') || content.toLowerCase().includes('error') ? 'bug' :
                           content.toLowerCase().includes('add') || content.toLowerCase().includes('would like') ? 'feature' : 'other';

  return {
    summary: `AI Summary: User is reporting about "${content.substring(0, 30)}..." with ${sentiment} sentiment.`,
    sentiment: sentiment,
    keywords: ['mock', 'ai', 'keywords', 'generated'],
    suggestedCategory: suggestedCategory
  };
};

// --- Advanced AI Processor (Gemini Integration) ---

const { GoogleGenerativeAI } = require("@google/generative-ai");
const { VIDEO_PROCESSOR_SYSTEM_PROMPT } = require('./aiProcessorPrompts');

// Initialize Gemini (Mock reusing the key from env if available)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "YOUR_API");

/**
 * Advanced Video Processor
 * Takes raw inputs (transcript, events, metadata) and generates formatted outputs.
 */
const processVideoAdvanced = async ({ 
    raw_transcript, 
    ui_events, 
    video_metadata, 
    style_guidelines, 
    doc_use_case 
}) => {
    try {
        console.log("🚀 Starting Advanced AI Video Processing...");

        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.5-flash",
            // generationConfig: { responseMimeType: "application/json" } // Keep removed for compatibility
        });

        // Construct User Prompt
        const userPrompt = `
        Here is the input data for the video processing task:

        [RAW TRANSCRIPT]
        ${raw_transcript}

        [UI EVENTS]
        ${JSON.stringify(ui_events, null, 2)}

        [VIDEO METADATA]
        ${JSON.stringify(video_metadata, null, 2)}

        [STYLE GUIDELINES]
        ${style_guidelines}

        [DOC USE CASE]
        ${doc_use_case}
        `;

        const result = await model.generateContent([
            VIDEO_PROCESSOR_SYSTEM_PROMPT, 
            userPrompt
        ]);

        const response = await result.response;
        let text = response.text();
        
        console.log("🤖 Gemini Response received.");
        
        // Cleanup markdown if present
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();

        // Parse JSON
        const data = JSON.parse(text);
        return { success: true, data };

    } catch (error) {
        console.error("❌ Advanced AI Processing Error:", error);
        
        // Fallback: Return Mock Data if API fails (to ensure feature functionality)
        console.log("⚠️ Falling back to Mock AI Response...");
        
        const mockData = {
            polished_script: {
                segments: [
                    {
                        segment_id: "seg_1",
                        start_sec: 0.0,
                        end_sec: 5.0,
                        narration_text: "Welcome to your new project dashboard. Here is how you get started.",
                        associated_events: []
                    }
                ],
                global_style_notes: "Using friendly fallback tone."
            },
            voiceover_script: {
                language: "en",
                voice_style_hint: "friendly",
                segments: [
                    {
                        segment_id: "seg_1",
                        narration_text: "Welcome to your new project dashboard. Here is how you get started.",
                        pause_after_sec: 0.5
                    }
                ]
            },
            zoom_plan: {
                items: [],
                global_visual_notes: "Keep steady."
            },
            step_by_step_doc: {
                title: "How to Use Clueso (Mock)",
                audience: "New Users",
                steps: [
                    {
                        step_number: 1,
                        heading: "Start the process",
                        body: "Click the start button to begin.",
                        related_events: []
                    }
                ],
                summary: "A quick guide.",
                tags: ["mock", "fallback"]
            },
            diagnostics: "API Error: " + error.message
        };

        return { success: true, data: mockData };
    }
};

module.exports = {
  generateTranscript,
  removeFillerWords,
  generateVoiceover,
  detectAutoZoom,
  generateCaptions,
  generateDocumentation,
  translateContent,
  processVideo,
  generateFeedbackInsights,
  processVideoAdvanced 
};
