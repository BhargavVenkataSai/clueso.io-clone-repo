import { useState, useEffect, useRef } from 'react';
import { videoAPI, aiAPI } from '../../lib/api';

const VOICES = [
    { id: 'amrit', name: 'Amrit', gender: 'male', color: 'text-pink-500' },
    { id: 'matt', name: 'Matt', gender: 'male', color: 'text-blue-400' },
    { id: 'james', name: 'James', gender: 'male', color: 'text-green-400' },
    { id: 'michael', name: 'Michael', gender: 'male', color: 'text-yellow-400' },
    { id: 'david', name: 'David', gender: 'male', color: 'text-purple-400' },
    { id: 'sammy', name: 'Sammy', gender: 'female', color: 'text-pink-400' },
    { id: 'natasha', name: 'Natasha', gender: 'female', color: 'text-red-400' },
    { id: 'jessica', name: 'Jessica', gender: 'female', color: 'text-indigo-400' },
    { id: 'sarah', name: 'Sarah', gender: 'female', color: 'text-cyan-400' },
    { id: 'emily', name: 'Emily', gender: 'female', color: 'text-orange-400' },
];

export default function ScriptPanel({ projectId, onAddAudio, initialScript, currentTime, isPlaying, setGenerating: setParentGenerating }) {
    const [slides, setSlides] = useState([
        { id: 1, title: 'Slide 1', text: initialScript || '', voice: 'amrit', alignment: null }
    ]);
    const [generating, setGenerating] = useState(false);
    const [processingAI, setProcessingAI] = useState(false);
    const [activeVoiceMenu, setActiveVoiceMenu] = useState(null);

    // Sync local generating state with parent
    useEffect(() => {
        if (setParentGenerating) {
            setParentGenerating(generating);
        }
    }, [generating, setParentGenerating]);

    useEffect(() => {
        if (initialScript && slides.length === 1 && slides[0].text === '') {
            setSlides([{ id: 1, title: 'Slide 1', text: initialScript, voice: 'amrit' }]);
        }
    }, [initialScript]);

    const handleAddSlide = () => {
        const newId = slides.length + 1;
        setSlides([...slides, { 
            id: newId, 
            title: `Slide ${newId}`, 
            text: '', 
            voice: 'sammy' 
        }]);
    };

    const handleTextChange = (id, newText) => {
        setSlides(slides.map(slide => 
            slide.id === id ? { ...slide, text: newText } : slide
        ));
    };

    const handleVoiceChange = (id, newVoiceId) => {
        setSlides(slides.map(slide => 
            slide.id === id ? { ...slide, voice: newVoiceId } : slide
        ));
        setActiveVoiceMenu(null);
    };

    const handleDeleteSlide = (id) => {
        if (slides.length === 1) return;
        setSlides(slides.filter(s => s.id !== id));
    };

    const handleProcessWithAI = async () => {
        setProcessingAI(true);
        try {
            // Combine all text for context
            const fullText = slides.map(s => s.text).join('\n');
            
            const mockData = {
                projectId,
                rawTranscript: fullText,
                uiEvents: [],
                styleGuidelines: "Professional and concise",
                docUseCase: "Tutorial"
            };

            const response = await aiAPI.processRecording(mockData);
            const { polishedScript } = response.data.data;
            
            if (polishedScript) {
                // Simple split logic for demo - in reality, AI might return structured segments
                const segments = polishedScript.split('\n\n').filter(s => s.trim());
                const newSlides = segments.map((text, idx) => ({
                    id: idx + 1,
                    title: `Slide ${idx + 1}`,
                    text: text.trim(),
                    voice: slides[idx % slides.length]?.voice || 'amrit'
                }));
                setSlides(newSlides);
            }
        } catch (error) {
            console.error("AI Processing failed:", error);
            alert("Failed to process with AI");
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
                
                // Construct URL safely
                const baseUrl = process.env.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL.replace('/api', '') : 'http://localhost:5000';
                const audioUrl = baseUrl + res.data.data.path;
                
                console.log("Generated Audio URL:", audioUrl); // Debugging

                const alignment = res.data.data.word_alignment;

                // Update slide with alignment data
                setSlides(prev => prev.map(s => s.id === slide.id ? { ...s, alignment } : s));
                
                // Add to timeline (mock callback)
                if (onAddAudio) {
                    onAddAudio({
                        url: audioUrl,
                        text: slide.text,
                        duration: res.data.data.duration_estimate,
                        voice: slide.voice,
                        slideId: slide.id
                    });
                }
            }
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
            {/* Top Toolbar */}
            <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-[#16181d]">
                <div className="flex space-x-2">
                    <button 
                        onClick={handleGenerateSpeech}
                        disabled={generating}
                        className="px-3 py-1.5 bg-[#23232f] hover:bg-[#2d3039] text-white text-xs font-bold rounded flex items-center space-x-2 border border-gray-700 transition"
                    >
                        {generating ? (
                            <svg className="animate-spin h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        ) : (
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                        )}
                        <span>Generate Speech</span>
                    </button>

                    <button 
                        onClick={handleProcessWithAI}
                        disabled={processingAI}
                        className="px-3 py-1.5 bg-[#23232f] hover:bg-[#2d3039] text-white text-xs font-bold rounded flex items-center space-x-2 border border-gray-700 transition"
                    >
                        <svg className="w-3 h-3 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        <span>AI Rewrite</span>
                        <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </button>
                </div>

                <button 
                    onClick={handleAddSlide}
                    className="p-1.5 bg-[#23232f] hover:bg-[#2d3039] text-gray-400 hover:text-white rounded border border-gray-700 transition"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                </button>
            </div>

            {/* Slides List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {slides.map((slide, index) => {
                    const currentVoice = VOICES.find(v => v.id === slide.voice) || VOICES[0];
                    
                    return (
                        <div key={slide.id} className="bg-[#16181d] border border-gray-800 rounded-lg p-4 group hover:border-gray-700 transition-colors">
                            {/* Slide Header */}
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center space-x-3">
                                    <span className="text-xs font-mono text-gray-500">{index + 1}</span>
                                    <span className="text-sm font-medium text-gray-300">{slide.title}</span>
                                </div>
                                
                                <div className="flex items-center space-x-2">
                                    {/* Voice Selector */}
                                    <div className="relative">
                                        <button 
                                            onClick={() => setActiveVoiceMenu(activeVoiceMenu === slide.id ? null : slide.id)}
                                            className="flex items-center space-x-2 px-2 py-1 rounded hover:bg-[#23232f] transition"
                                        >
                                            <svg className={`w-3 h-3 ${currentVoice.color}`} fill="currentColor" viewBox="0 0 24 24"><path d="M12 14c2.761 0 5-2.239 5-5V5c0-2.761-2.239-5-5-5S7 2.239 7 5v4c0 2.761 2.239 5 5 5zM19 9v-.5a.5.5 0 0 0-1 0V9c0 3.08-2.325 5.616-5.312 5.965v3.535h2.812a.5.5 0 0 0 0-1H8.5a.5.5 0 0 0 0 1h2.812v-3.535C8.325 14.616 6 12.08 6 9V8.5a.5.5 0 0 0-1 0V9c0 3.866 3.134 7 7 7s7-3.134 7-7z"/></svg>
                                            <span className={`text-xs font-bold ${currentVoice.color}`}>{currentVoice.name}</span>
                                        </button>

                                        {activeVoiceMenu === slide.id && (
                                            <div className="absolute right-0 top-full mt-2 w-48 bg-[#1a1d21] border border-gray-700 rounded-lg shadow-xl z-50 max-h-64 overflow-y-auto">
                                                <div className="p-2 text-[10px] font-bold text-gray-500 uppercase">Male Voices</div>
                                                {VOICES.filter(v => v.gender === 'male').map(voice => (
                                                    <button
                                                        key={voice.id}
                                                        onClick={() => handleVoiceChange(slide.id, voice.id)}
                                                        className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-[#23232f] hover:text-white flex items-center space-x-2"
                                                    >
                                                        <div className={`w-2 h-2 rounded-full ${voice.color}`}></div>
                                                        <span>{voice.name}</span>
                                                    </button>
                                                ))}
                                                <div className="p-2 text-[10px] font-bold text-gray-500 uppercase border-t border-gray-800 mt-1">Female Voices</div>
                                                {VOICES.filter(v => v.gender === 'female').map(voice => (
                                                    <button
                                                        key={voice.id}
                                                        onClick={() => handleVoiceChange(slide.id, voice.id)}
                                                        className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-[#23232f] hover:text-white flex items-center space-x-2"
                                                    >
                                                        <div className={`w-2 h-2 rounded-full ${voice.color}`}></div>
                                                        <span>{voice.name}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Options Menu */}
                                    <button className="text-gray-500 hover:text-white p-1">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" /></svg>
                                    </button>
                                    
                                    {/* Delete Slide */}
                                    <button 
                                        onClick={() => handleDeleteSlide(slide.id)}
                                        className="text-gray-500 hover:text-red-400 p-1"
                                        title="Delete Slide"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>
                            </div>

                            {/* Text Area or Highlighter */}
                            {isPlaying && slide.alignment ? (
                                <ScriptHighlighter 
                                    text={slide.text} 
                                    alignment={slide.alignment} 
                                    currentTime={currentTime} 
                                    // Assuming each slide starts at 0 relative to itself, but in reality 
                                    // we need to know the slide's start time in the global timeline.
                                    // For now, let's assume the first slide starts at 0.
                                    // In a real app, we'd pass the slide's start time.
                                    startTime={0} 
                                />
                            ) : (
                                <AutoResizeTextarea
                                    value={slide.text}
                                    onChange={(e) => handleTextChange(slide.id, e.target.value)}
                                    placeholder="Enter script here..."
                                    className="w-full bg-[#0f1115] text-gray-300 text-sm p-3 rounded border border-gray-800 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none resize-none min-h-[100px] leading-relaxed overflow-hidden"
                                />
                            )}
                        </div>
                    );
                })}
                
                {/* Add Slide Button at Bottom */}
                <button 
                    onClick={handleAddSlide}
                    className="w-full py-3 border border-dashed border-gray-700 rounded-lg text-gray-500 hover:text-white hover:border-gray-500 hover:bg-[#16181d] transition flex items-center justify-center space-x-2 text-sm"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    <span>Add New Slide</span>
                </button>
            </div>
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
            spellCheck="false"
            rows={1}
        />
    );
}

function ScriptHighlighter({ text, alignment, currentTime, startTime }) {
    // Calculate relative time in the clip
    const relativeTime = Math.max(0, currentTime - startTime);

    return (
        <div className="w-full bg-[#0f1115] text-gray-300 text-sm p-3 rounded border border-gray-800 min-h-[100px] leading-relaxed whitespace-pre-wrap">
            {alignment.map((wordData, idx) => {
                const isActive = relativeTime >= wordData.start && relativeTime <= wordData.end;
                return (
                    <span 
                        key={idx} 
                        className={`transition-colors duration-100 ${isActive ? 'bg-purple-500/50 text-white rounded px-0.5' : ''}`}
                    >
                        {wordData.word}{' '}
                    </span>
                );
            })}
        </div>
    );
}
