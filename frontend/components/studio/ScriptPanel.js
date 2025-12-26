import { useState, useEffect, useRef } from 'react';
import { videoAPI, aiAPI } from '../../lib/api';

// Voices organized by country - 2 males & 2 females per country with tags
const VOICES = [
    // 🇺🇸 American English
    { id: 'adam_us', name: 'Adam', gender: 'Male', country: 'US', accent: 'American', flag: '🇺🇸', color: 'text-blue-400', tags: ['expressive', 'deep', 'confident'] },
    { id: 'josh_us', name: 'Josh', gender: 'Male', country: 'US', accent: 'American', flag: '🇺🇸', color: 'text-blue-500', tags: ['calm', 'narrative', 'professional'] },
    { id: 'rachel_us', name: 'Rachel', gender: 'Female', country: 'US', accent: 'American', flag: '🇺🇸', color: 'text-pink-400', tags: ['calm', 'conversational', 'warm'] },
    { id: 'emily_us', name: 'Emily', gender: 'Female', country: 'US', accent: 'American', flag: '🇺🇸', color: 'text-pink-500', tags: ['expressive', 'energetic', 'friendly'] },
    
    // 🇬🇧 British English
    { id: 'joseph_uk', name: 'Joseph', gender: 'Male', country: 'UK', accent: 'British', flag: '🇬🇧', color: 'text-red-400', tags: ['professional', 'narrative', 'calm'] },
    { id: 'harry_uk', name: 'Harry', gender: 'Male', country: 'UK', accent: 'British', flag: '🇬🇧', color: 'text-red-500', tags: ['expressive', 'energetic', 'youthful'] },
    { id: 'charlotte_uk', name: 'Charlotte', gender: 'Female', country: 'UK', accent: 'British', flag: '🇬🇧', color: 'text-rose-400', tags: ['elegant', 'conversational', 'warm'] },
    { id: 'dorothy_uk', name: 'Dorothy', gender: 'Female', country: 'UK', accent: 'British', flag: '🇬🇧', color: 'text-rose-500', tags: ['pleasant', 'calm', 'professional'] },
    
    // 🇨🇦 Canadian English  
    { id: 'liam_ca', name: 'Liam', gender: 'Male', country: 'CA', accent: 'Canadian', flag: '🇨🇦', color: 'text-amber-400', tags: ['articulate', 'professional', 'clear'] },
    { id: 'ethan_ca', name: 'Ethan', gender: 'Male', country: 'CA', accent: 'Canadian', flag: '🇨🇦', color: 'text-amber-500', tags: ['narrative', 'calm', 'deep'] },
    { id: 'sarah_ca', name: 'Sarah', gender: 'Female', country: 'CA', accent: 'Canadian', flag: '🇨🇦', color: 'text-yellow-400', tags: ['calm', 'friendly', 'conversational'] },
    { id: 'matilda_ca', name: 'Matilda', gender: 'Female', country: 'CA', accent: 'Canadian', flag: '🇨🇦', color: 'text-yellow-500', tags: ['warm', 'expressive', 'narrative'] },
    
    // 🇮🇳 Indian English
    { id: 'amrit_in', name: 'Amrit', gender: 'Male', country: 'IN', accent: 'Indian', flag: '🇮🇳', color: 'text-orange-400', tags: ['professional', 'clear', 'confident'] },
    { id: 'raj_in', name: 'Raj', gender: 'Male', country: 'IN', accent: 'Indian', flag: '🇮🇳', color: 'text-orange-500', tags: ['narrative', 'calm', 'authoritative'] },
    { id: 'priya_in', name: 'Priya', gender: 'Female', country: 'IN', accent: 'Indian', flag: '🇮🇳', color: 'text-green-400', tags: ['confident', 'energetic', 'expressive'] },
    { id: 'ananya_in', name: 'Ananya', gender: 'Female', country: 'IN', accent: 'Indian', flag: '🇮🇳', color: 'text-green-500', tags: ['warm', 'conversational', 'friendly'] },
    
    // 🇦🇺 Australian English
    { id: 'charlie_au', name: 'Charlie', gender: 'Male', country: 'AU', accent: 'Australian', flag: '🇦🇺', color: 'text-teal-400', tags: ['casual', 'friendly', 'conversational'] },
    { id: 'callum_au', name: 'Callum', gender: 'Male', country: 'AU', accent: 'Australian', flag: '🇦🇺', color: 'text-teal-500', tags: ['intense', 'expressive', 'energetic'] },
    { id: 'freya_au', name: 'Freya', gender: 'Female', country: 'AU', accent: 'Australian', flag: '🇦🇺', color: 'text-cyan-400', tags: ['expressive', 'youthful', 'energetic'] },
    { id: 'grace_au', name: 'Grace', gender: 'Female', country: 'AU', accent: 'Australian', flag: '🇦🇺', color: 'text-cyan-500', tags: ['warm', 'pleasant', 'conversational'] },
];

// Accent options for filtering
const ACCENTS = ['All', 'American', 'British', 'Canadian', 'Indian', 'Australian'];
const GENDERS = ['All', 'Male', 'Female'];

export default function ScriptPanel({ projectId, videoId, videoUrl, onAddAudio, onSeek, initialScript, currentTime, isPlaying, setGenerating: setParentGenerating, audioClips, onActiveTextChange, onAudioReady }) {
    const [slides, setSlides] = useState([
        { id: 1, title: 'Slide 1', text: initialScript || '', voice: 'adam_us', alignment: null }
    ]);
    const [generating, setGenerating] = useState(false);
    const [processingAI, setProcessingAI] = useState(false);
    const [activeVoiceMenu, setActiveVoiceMenu] = useState(null);
    const [activeSlideId, setActiveSlideId] = useState(1); // Track which slide is active/selected
    
    // Voice modal state
    const [showVoiceModal, setShowVoiceModal] = useState(false);
    const [voiceModalSlideId, setVoiceModalSlideId] = useState(null);
    const [genderFilter, setGenderFilter] = useState('All');
    const [accentFilter, setAccentFilter] = useState('All');
    const [previewingVoice, setPreviewingVoice] = useState(null);

    // Sync local generating state with parent
    useEffect(() => {
        if (setParentGenerating) {
            setParentGenerating(generating);
        }
    }, [generating, setParentGenerating]);

    // Parse initial script and split into separate slides
    useEffect(() => {
        if (initialScript) {
            // Try to parse "Slide N:\n..." format
            const slidePattern = /Slide\s+(\d+):\s*/gi;
            const parts = initialScript.split(slidePattern).filter(p => p.trim());
            
            if (parts.length > 1) {
                // We have multiple slides in format "Slide 1:\ntext\n\nSlide 2:\ntext"
                const parsedSlides = [];
                for (let i = 0; i < parts.length; i += 2) {
                    const slideNum = parseInt(parts[i], 10);
                    const slideText = parts[i + 1]?.trim() || '';
                    if (!isNaN(slideNum) && slideText) {
                        parsedSlides.push({
                            id: slideNum,
                            title: `Slide ${slideNum}`,
                            text: slideText,
                            voice: slideNum % 2 === 0 ? 'rachel_us' : 'adam_us',
                            alignment: null
                        });
                    }
                }
                
                if (parsedSlides.length > 0) {
                    setSlides(parsedSlides);
                    setActiveSlideId(parsedSlides[0].id);
                    if (onActiveTextChange) {
                        onActiveTextChange(parsedSlides[0].text);
                    }
                    console.log('📄 Parsed', parsedSlides.length, 'slides from script');
                    return;
                }
            }
            
            // Fallback: single slide with all text
            setSlides([{ id: 1, title: 'Slide 1', text: initialScript, voice: 'adam_us', alignment: null }]);
            if (onActiveTextChange) {
                onActiveTextChange(initialScript);
            }
        }
    }, [initialScript]);

    // Notify parent when active slide changes
    useEffect(() => {
        const activeSlide = slides.find(s => s.id === activeSlideId);
        if (activeSlide && onActiveTextChange) {
            onActiveTextChange(activeSlide.text);
        }
    }, [activeSlideId, slides, onActiveTextChange]);

    const handleAddSlide = () => {
        const newId = slides.length + 1;
        setSlides([...slides, { 
            id: newId, 
            title: `Slide ${newId}`, 
            text: '', 
            voice: 'rachel_us' 
        }]);
    };

    const handleTextChange = (id, newText) => {
        setSlides(slides.map(slide => 
            slide.id === id ? { ...slide, text: newText } : slide
        ));
        
        // Notify parent immediately if this is the active slide
        if (id === activeSlideId && onActiveTextChange) {
            onActiveTextChange(newText);
        }
    };

    const handleSlideClick = (id) => {
        setActiveSlideId(id);
        // Parent will be notified via useEffect
    };

    const handleVoiceChange = (id, newVoiceId) => {
        setSlides(slides.map(slide => 
            slide.id === id ? { ...slide, voice: newVoiceId, audioUrl: null, alignment: null } : slide
        ));
        setActiveVoiceMenu(null);
        setShowVoiceModal(false);
        setVoiceModalSlideId(null);
        
        // Notify user that they need to regenerate speech
        console.log(`🔊 Voice changed for slide ${id}. Click "Generate Speech" to apply the new voice.`);
    };

    // Open voice selection modal
    const openVoiceModal = (slideId) => {
        setVoiceModalSlideId(slideId);
        setShowVoiceModal(true);
        setActiveVoiceMenu(null);
        setGenderFilter('All');
        setAccentFilter('All');
    };

    // Filter voices based on selected filters
    const getFilteredVoices = () => {
        return VOICES.filter(voice => {
            const matchesGender = genderFilter === 'All' || voice.gender === genderFilter;
            const matchesAccent = accentFilter === 'All' || voice.accent === accentFilter;
            return matchesGender && matchesAccent;
        });
    };

    const handleDeleteSlide = (id) => {
        if (slides.length === 1) return;
        setSlides(slides.filter(s => s.id !== id));
    };

    // Individual slide audio playback - using refs to avoid race conditions
    const currentAudioRef = useRef(null);
    const audioPlayPromiseRef = useRef(null);
    const [playingSlideId, setPlayingSlideId] = useState(null);

    const playSlideAudio = async (slide) => {
        // If same slide is playing, toggle off
        if (playingSlideId === slide.id) {
            await stopAudio();
            return;
        }

        // Stop any currently playing audio first
        await stopAudio();

        if (!slide.audioUrl) {
            alert('No audio generated for this slide. Click "Generate Speech" first.');
            return;
        }

        // Create new audio element
        const audio = new Audio(slide.audioUrl);
        currentAudioRef.current = audio;
        setPlayingSlideId(slide.id);

        // Set up ended listener before playing
        audio.addEventListener('ended', () => {
            setPlayingSlideId(null);
            currentAudioRef.current = null;
            audioPlayPromiseRef.current = null;
        });

        // Play and store promise
        try {
            audioPlayPromiseRef.current = audio.play();
            await audioPlayPromiseRef.current;
        } catch (e) {
            // Silently ignore AbortError - it's expected when rapidly clicking
            if (e.name !== 'AbortError') {
                console.error('Audio play failed:', e);
            }
        }
    };

    const stopAudio = async () => {
        const audio = currentAudioRef.current;
        const playPromise = audioPlayPromiseRef.current;
        
        if (!audio) return;
        
        // Wait for any pending play to complete/fail before pausing
        if (playPromise) {
            try {
                await playPromise;
            } catch (e) {
                // Ignore - just ensuring promise settles
            }
        }
        
        // Now safe to pause
        audio.pause();
        audio.currentTime = 0;
        currentAudioRef.current = null;
        audioPlayPromiseRef.current = null;
        setPlayingSlideId(null);
    };

    // --- Audio Synchronization Effect ---
    // Automatically plays/pauses/seeks audio to match global timeline state
    useEffect(() => {
        const syncAudio = async () => {
            // Find the slide that corresponds to the current global time
            // Each slide is assumed to have a set duration (defaulting to 5s if not specify in audio clips)
            // But we should use the audioClips metadata passed from parent for exact timing
            const activeAudio = audioClips?.find(clip => 
                currentTime >= clip.startTime && currentTime < (clip.startTime + clip.duration)
            );

            if (!isPlaying) {
                if (currentAudioRef.current && !currentAudioRef.current.paused) {
                    currentAudioRef.current.pause();
                }
                return;
            }

            if (!activeAudio) {
                if (currentAudioRef.current) await stopAudio();
                return;
            }

            const relativeTime = currentTime - activeAudio.startTime;

            // If we're already playing this audio, just check for major sync drift
            if (playingSlideId === activeAudio.slideId && currentAudioRef.current) {
                const audio = currentAudioRef.current;
                
                // If it's paused but should be playing, play it
                if (audio.paused) {
                    try {
                        audioPlayPromiseRef.current = audio.play();
                        await audioPlayPromiseRef.current;
                    } catch (e) {
                        if (e.name !== 'AbortError') console.error("Audio resume failed:", e);
                    }
                }

                // If sync drift is > 200ms, seek
                if (Math.abs(audio.currentTime - relativeTime) > 0.2) {
                    audio.currentTime = relativeTime;
                }
                return;
            }

            // Otherwise, we need to switch to a new audio clip
            const slide = slides.find(s => s.id === activeAudio.slideId);
            if (slide && slide.audioUrl) {
                await stopAudio();
                
                const audio = new Audio(slide.audioUrl);
                audio.currentTime = relativeTime;
                currentAudioRef.current = audio;
                setPlayingSlideId(slide.id);

                audio.addEventListener('ended', () => {
                    setPlayingSlideId(null);
                    currentAudioRef.current = null;
                    audioPlayPromiseRef.current = null;
                });

                try {
                    audioPlayPromiseRef.current = audio.play();
                    await audioPlayPromiseRef.current;
                } catch (e) {
                    if (e.name !== 'AbortError') console.error("Audio sync play failed:", e);
                }
            }
        };

        syncAudio();
        
        // We don't want to stop audio on cleanup if it was triggered by a re-render 
        // that didn't change isPlaying/currentTime significantly
    }, [isPlaying, currentTime, audioClips, slides]);

    const handleProcessWithAI = async () => {
        setProcessingAI(true);
        try {
            // Get the active slide's text (can be empty - AI will generate from video/image)
            const activeSlide = slides.find(s => s.id === activeSlideId);
            const currentText = activeSlide?.text || '';

            console.log('🎬 Analyzing media and generating/rewriting text...');
            console.log('ProjectId:', projectId, 'VideoId:', videoId, 'VideoUrl:', videoUrl);
            
            // Use video-aware rewrite API with projectId, videoId and videoUrl
            const response = await aiAPI.videoAwareRewrite({
                projectId: projectId,
                videoId: videoId,
                videoUrl: videoUrl,
                currentText: currentText
            });
            
            const { rewrittenText } = response.data.data;
            
            if (rewrittenText) {
                // Update the active slide with the rewritten text
                setSlides(slides.map(slide => 
                    slide.id === activeSlideId 
                        ? { ...slide, text: rewrittenText } 
                        : slide
                ));
                
                // Notify parent of text change
                if (onActiveTextChange) {
                    onActiveTextChange(rewrittenText);
                }
                
                console.log('✅ Text rewritten based on video analysis!');
            }
        } catch (error) {
            console.error("❌ AI Processing failed:", error);
            const errorMsg = error.response?.data?.error || 'Failed to process with AI. The video may be too large or the API is rate-limited.';
            alert(errorMsg);
        } finally {
            setProcessingAI(false);
        }
    };

    const handleGenerateSpeech = async () => {
        setGenerating(true);
        try {
            // Generate speech for all slides sequentially
            for (const slide of slides) {
                if (!slide.text.trim()) continue;

                const res = await videoAPI.generateSpeech({ text: slide.text, voice: slide.voice });
                
                if (!res?.data?.data) {
                    throw new Error("Invalid response from speech generation API");
                }
                
                // Construct URL safely
                const baseUrl = process.env.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL.replace('/api', '') : 'http://localhost:5000';
                const audioPath = res.data.data.path || '';
                const audioUrl = audioPath.startsWith('http') ? audioPath : baseUrl + audioPath;
                
                console.log("Generated Audio URL:", audioUrl); // Debugging

                const alignment = res.data.data.word_alignment || [];
                const duration = res.data.data.duration_estimate || 0;

                // Fetch audio as Blob and create Blob URL for storage
            try {
                const audioResponse = await fetch(audioUrl);
                if (!audioResponse.ok) {
                    throw new Error(`Failed to fetch audio: ${audioResponse.statusText}`);
                }
                
                const audioBlob = await audioResponse.blob();
                const blobUrl = URL.createObjectURL(audioBlob);
                
                console.log("Audio generated for slide:", slide.id, "URL:", blobUrl);
                
                // Store audio URL in slide state (don't auto-play)
                setSlides(prev => prev.map(s => s.id === slide.id ? { ...s, audioUrl: blobUrl, alignment } : s));
                    
                    // Add to timeline with Blob URL (mock callback)
                    if (onAddAudio) {
                        onAddAudio({
                            url: blobUrl, // Use Blob URL instead of server URL
                            text: slide.text,
                            duration: res.data.data.duration_estimate,
                            voice: slide.voice,
                            slideId: slide.id,
                            wordAlignment: alignment // Pass word alignment for karaoke
                        });
                    }
                } catch (fetchError) {
                    console.error("Failed to fetch or play audio:", fetchError);
                    // Fallback to original URL if Blob fetch fails
                    setSlides(prev => prev.map(s => s.id === slide.id ? { ...s, alignment } : s));
                    
                    if (onAddAudio) {
                        onAddAudio({
                            url: audioUrl,
                            text: slide.text,
                            duration: res.data.data.duration_estimate,
                            voice: slide.voice,
                            slideId: slide.id,
                            wordAlignment: alignment // Pass word alignment for karaoke
                        });
                    }
                }
            }
            
            // Notify parent that audio is ready - use the first slide's audio for synchronized playback
            // In a production app, you'd combine all audio clips into one track
            setTimeout(() => {
                setSlides(currentSlides => {
                    const firstSlideWithAudio = currentSlides.find(s => s.audioUrl);
                    if (firstSlideWithAudio && onAudioReady) {
                        console.log('🔊 Notifying parent: audio ready for sync playback');
                        onAudioReady(firstSlideWithAudio.audioUrl, currentSlides);
                    }
                    return currentSlides;
                });
            }, 100);
            // alert("Speech generation complete!"); // Removed alert for smoother UX
        } catch (e) {
            console.error(e);
            alert("Failed to generate speech. Check backend logs.");
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div className="h-full flex flex-col bg-[#0f1115]">
            {/* Top Toolbar - Exact Clueso style */}
            <div className="flex flex-col px-4 py-3 border-b border-white/5 bg-[#0f1115] space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <button 
                            onClick={handleGenerateSpeech}
                            disabled={generating}
                            className="h-9 px-5 bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-black uppercase tracking-wider rounded-xl flex items-center space-x-2 transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-purple-500/20"
                        >
                            {generating ? (
                                <svg className="animate-spin h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/></svg>
                            )}
                            <span>Generate Speech</span>
                        </button>
                        <button 
                            onClick={handleProcessWithAI}
                            disabled={processingAI}
                            className="h-9 px-4 bg-[#1a1d21] hover:bg-[#25282e] text-white text-[11px] font-black uppercase tracking-wider rounded-xl border border-white/5 flex items-center space-x-2 transition-all active:scale-95 disabled:opacity-50"
                        >
                            <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            <span>AI Rewrite</span>
                            <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                        </button>
                    </div>

                    <button 
                        onClick={handleAddSlide}
                        className="w-8 h-8 flex items-center justify-center bg-[#1a1d21] hover:bg-[#25282e] text-gray-500 hover:text-white rounded-xl border border-white/5 transition-all shadow-lg active:scale-90"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                    </button>
                </div>
                
                {/* Script Section Header */}
                <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Script</span>
                </div>
            </div>

            {/* Slides List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-[#0f1115]">
                {slides.map((slide, index) => {
                    const currentVoice = VOICES.find(v => v.id === slide.voice) || VOICES[0];
                    
                    // Find the audio clip associated with this slide to get its start time
                    const slideAudioClip = audioClips?.find(clip => clip.slideId === slide.id);
                    const slideStartTime = slideAudioClip ? slideAudioClip.startTime : 0;
                    const isActive = activeSlideId === slide.id;

                    return (
                        <div 
                            key={slide.id} 
                            onClick={() => handleSlideClick(slide.id)}
                            className={`relative transition-all duration-300 rounded-[1.5rem] p-6 cursor-pointer flex flex-col space-y-5 border group ${
                                isActive 
                                    ? 'bg-[#16181d] border-white/10 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.5)] ring-1 ring-white/5' 
                                    : 'bg-transparent border-transparent hover:bg-white/[0.02] hover:border-white/5'
                            }`}
                        >

                            {/* Slide Header / Controls - Exact Clueso style */}
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center space-x-3">
                                    <div className="flex items-center space-x-2">
                                        <span className={`text-[11px] font-black ${isActive ? 'text-purple-400' : 'text-gray-600'}`}>
                                            {index + 1}
                                        </span>
                                        <span className={`text-[11px] font-black tracking-tight ${isActive ? 'text-white' : 'text-gray-500'}`}>
                                            {slide.title || 'Untitled'}
                                        </span>
                                    </div>
                                    
                                    {/* Quick Actions - Revealed on Hover/Active */}
                                    <div className={`flex items-center space-x-1 transition-all duration-300 ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); playingSlideId === slide.id ? stopAudio() : playSlideAudio(slide); }}
                                            className={`p-1 rounded-md transition-all ${slide.audioUrl ? 'text-gray-400 hover:text-white hover:bg-white/5' : 'text-gray-700 cursor-not-allowed'}`}
                                            disabled={!slide.audioUrl}
                                            title="Preview Audio"
                                        >
                                            {playingSlideId === slide.id ? (
                                                <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
                                            ) : (
                                                <svg className="w-3 h-3 fill-current ml-0.5" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                            )}
                                        </button>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleDeleteSlide(slide.id); }}
                                            className="p-1 rounded-md text-gray-600 hover:text-red-500 hover:bg-red-500/10 transition-all"
                                            title="Delete Slide"
                                        >
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                    </div>
                                </div>
                                
                                <div className="flex items-center space-x-2">
                                    {/* Voice Selector Mini */}
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); openVoiceModal(slide.id); }}
                                        className={`flex items-center space-x-2 px-2.5 py-1 rounded-lg border transition-all duration-300 ${
                                            isActive 
                                                ? 'bg-purple-600/10 border-purple-500/30' 
                                                : 'bg-white/5 border-white/5 hover:border-white/10'
                                        }`}
                                    >
                                        <svg className={`w-2.5 h-2.5 ${isActive ? 'text-purple-400' : 'text-gray-500'}`} fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" /></svg>
                                        <span className={`text-[10px] font-black tracking-tight ${isActive ? 'text-white' : 'text-gray-400'}`}>{currentVoice.name}</span>
                                    </button>
                                    
                                    {/* Kabob Menu */}
                                    <button 
                                        onClick={(e) => e.stopPropagation()}
                                        className="p-1 text-gray-600 hover:text-white transition rounded-md"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" /></svg>
                                    </button>
                                </div>
                            </div>

                            {/* Script Content Area */}
                            <div className="relative">
                                {isPlaying && slide.alignment ? (
                                    <ScriptHighlighter 
                                        text={slide.text} 
                                        alignment={slide.alignment} 
                                        currentTime={currentTime} 
                                        startTime={slideStartTime} 
                                        onSeek={onSeek}
                                    />
                                ) : (
                                    <div className="flex flex-col group/editor relative">
                                        <AutoResizeTextarea
                                            value={slide.text}
                                            onChange={(e) => handleTextChange(slide.id, e.target.value)}
                                            placeholder="Click to add script..."
                                            className={`w-full bg-transparent text-gray-200 text-[14.5px] leading-[1.7] transition-all placeholder-gray-800 border-none focus:ring-0 p-0 outline-none resize-none font-medium min-h-[40px] cursor-text`}
                                        />
                                        {!slide.text && !isActive && (
                                            <div className="absolute inset-0 flex items-center text-gray-800 text-[14.5px] font-medium pointer-events-none italic">
                                                Click to add script...
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
                
                {/* Add Slide Button - Modern Style */}
                <button 
                    onClick={handleAddSlide}
                    className="w-full py-4 mt-4 bg-white/5 hover:bg-white/10 border border-dashed border-white/10 hover:border-white/20 rounded-2xl text-gray-500 hover:text-gray-300 transition-all flex items-center justify-center space-x-3 group"
                >
                    <div className="w-6 h-6 rounded-full bg-gray-800 group-hover:bg-gray-700 flex items-center justify-center transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    </div>
                    <span className="text-sm font-medium">Add new slide</span>
                </button>
            </div>

            {/* Voice Selection Modal - Refined for Clueso style */}
            {showVoiceModal && (
                <div 
                    className="fixed inset-0 bg-black/80 backdrop-blur-2xl z-[100] flex items-center justify-center p-6 animate-in fade-in zoom-in duration-300"
                    onClick={() => { setShowVoiceModal(false); setVoiceModalSlideId(null); }}
                >
                    <div 
                        className="bg-[#121418]/90 border border-white/10 rounded-[2.5rem] shadow-2xl w-full max-w-4xl h-[85vh] overflow-hidden flex flex-col ring-1 ring-white/5 relative"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="px-10 py-8 flex items-center justify-between relative overflow-hidden">
                            <div className="relative z-10">
                                <h3 className="text-white font-black text-2xl tracking-tight">Listen & Choose Voice</h3>
                                <p className="text-gray-500 text-[10px] mt-1.5 font-black uppercase tracking-[0.2em]">Select from our library of premium neural voices</p>
                            </div>
                            <button 
                                onClick={() => { setShowVoiceModal(false); setVoiceModalSlideId(null); }}
                                className="w-12 h-12 flex items-center justify-center text-gray-500 hover:text-white rounded-full hover:bg-white/5 transition-all active:scale-90 border border-white/5 z-10"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        {/* Filters - Exact Clueso style */}
                        <div className="px-10 py-4 flex flex-col space-y-6">
                            <div className="flex items-center space-x-6">
                                <span className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em]">Filters</span>
                                <div className="flex bg-black/40 p-1.5 rounded-xl border border-white/5 shadow-inner">
                                    {GENDERS.map(g => (
                                        <button 
                                            key={g}
                                            onClick={() => setGenderFilter(g)}
                                            className={`px-5 py-1.5 text-[11px] font-black rounded-lg transition-all ${genderFilter === g ? 'bg-purple-600 text-white shadow-xl ring-1 ring-purple-400/30' : 'text-gray-500 hover:text-gray-300 uppercase tracking-widest'}`}
                                        >
                                            {g}
                                        </button>
                                    ))}
                                </div>
                                <div className="h-4 w-px bg-white/10"></div>
                                <div className="relative flex-1 flex items-center bg-black/40 rounded-xl p-1.5 border border-white/5 overflow-hidden group">
                                    <div className="flex space-x-1 overflow-x-auto no-scrollbar scroll-smooth">
                                        {ACCENTS.map(a => (
                                            <button 
                                                key={a}
                                                onClick={() => setAccentFilter(a)}
                                                className={`px-5 py-1.5 text-[11px] font-black rounded-lg whitespace-nowrap transition-all uppercase tracking-widest ${accentFilter === a ? 'bg-indigo-600 text-white shadow-xl ring-1 ring-indigo-400/30' : 'text-gray-500 hover:text-gray-300'}`}
                                            >
                                                {a}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-black/60 to-transparent pointer-events-none group-hover:opacity-0 transition-opacity"></div>
                                </div>
                            </div>
                            <div className="h-px w-full bg-white/5"></div>
                        </div>

                        {/* Voice Grid - Refined Cards */}
                        <div className="flex-1 overflow-y-auto px-10 pb-10 custom-scrollbar">
                            <div className="grid grid-cols-2 gap-6">
                                {getFilteredVoices().map(voice => {
                                    const isSelected = slides.find(s => s.id === voiceModalSlideId)?.voice === voice.id;
                                    return (
                                        <div 
                                            key={voice.id}
                                            onClick={() => handleVoiceChange(voiceModalSlideId, voice.id)}
                                            className={`relative group p-6 rounded-[2rem] border transition-all duration-500 cursor-pointer ${
                                                isSelected 
                                                    ? 'bg-purple-600/[0.03] border-purple-500/40 shadow-2xl shadow-purple-900/10' 
                                                    : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04] hover:border-white/10'
                                            }`}
                                        >
                                            <div className="flex items-start justify-between mb-6">
                                                <div className="flex items-center space-x-4">
                                                    <div className={`w-14 h-14 rounded-full flex flex-col items-center justify-center border-2 transition-all duration-500 ${isSelected ? 'bg-purple-600 border-purple-400 text-white' : 'bg-[#1a1d21] border-white/5 text-gray-400'}`}>
                                                        <span className="text-[12px] font-black uppercase tracking-tighter leading-none">{voice.country}</span>
                                                        <div className="w-5 h-[1px] bg-current opacity-20 my-1"></div>
                                                        <span className="text-[9px] font-bold opacity-40">{voice.flag}</span>
                                                    </div>
                                                    <div>
                                                        <h4 className="text-base font-black text-white group-hover:text-purple-300 transition-colors tracking-tight">{voice.name}</h4>
                                                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.15em] mt-0.5">{voice.accent} • {voice.gender}</p>
                                                    </div>
                                                </div>
                                                
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); setPreviewingVoice(voice.id); }}
                                                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all border shadow-lg transform active:scale-90 ${isSelected ? 'bg-white/10 border-white/10 text-white' : 'bg-black/40 border-white/5 text-gray-500 hover:text-white hover:bg-purple-600 hover:border-purple-400'}`}
                                                >
                                                    <svg className="w-4 h-4 fill-current ml-0.5" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                                </button>
                                            </div>
                                            
                                            <div className="flex flex-wrap gap-2">
                                                {voice.tags.map(tag => (
                                                    <span key={tag} className="px-3 py-1 bg-black/40 border border-white/5 text-gray-500 text-[10px] rounded-lg font-black uppercase tracking-widest">{tag}</span>
                                                ))}
                                            </div>
                                            
                                            {isSelected && (
                                                <div className="absolute top-4 right-4">
                                                    <div className="w-5 h-5 bg-purple-600 rounded-full flex items-center justify-center shadow-lg border border-purple-400">
                                                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {getFilteredVoices().length === 0 && (
                                <div className="flex flex-col items-center justify-center py-24 text-gray-700">
                                    <div className="w-16 h-16 bg-white/5 rounded-3xl flex items-center justify-center mb-6">
                                        <svg className="w-8 h-8 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/></svg>
                                    </div>
                                    <p className="text-sm font-black uppercase tracking-widest opacity-40">No voices match your filters</p>
                                    <button onClick={() => { setGenderFilter('All'); setAccentFilter('All'); }} className="mt-4 text-purple-400 font-bold text-xs hover:text-purple-300 transition-colors uppercase tracking-widest">Reset filters</button>
                                </div>
                            )}
                        </div>
                        
                        {/* Footer Info */}
                        <div className="px-10 py-6 bg-black/40 border-t border-white/5 text-center flex items-center justify-center space-x-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse"></div>
                            <p className="text-[10px] text-gray-600 font-black uppercase tracking-[0.3em]">Premium Neural AI Voices</p>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}

function AutoResizeTextarea({ value, onChange, placeholder, className }) {
    const textareaRef = useRef(null);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [value]);

    return (
        <textarea
            ref={textareaRef}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className={className}
            spellCheck="true"
            rows={1}
        />
    );
}

function ScriptHighlighter({ text, alignment, currentTime, startTime, onSeek }) {
    // Calculate relative time in the clip
    const relativeTime = Math.max(0, currentTime - startTime);

    return (
        <div className="w-full text-gray-300 text-[15px] leading-relaxed whitespace-pre-wrap font-medium py-2">
            {alignment.map((wordData, idx) => {
                const isActive = relativeTime >= wordData.start && relativeTime <= wordData.end;
                
                // Clueso-style karaoke highlight: 
                // Active word is white with a subtle purple glow/background
                return (
                    <span 
                        key={idx} 
                        onClick={(e) => {
                            e.stopPropagation();
                            if (onSeek) onSeek(startTime + wordData.start);
                        }}
                        className={`inline-block cursor-pointer transition-all duration-150 px-1 rounded-md mb-1 ${
                            isActive 
                                ? 'text-white bg-purple-500/40 shadow-[0_0_12px_rgba(168,85,247,0.4)] scale-105 relative z-10' 
                                : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                        }`}
                    >
                        {wordData.word}{' '}
                    </span>
                );
            })}
        </div>
    );
}
