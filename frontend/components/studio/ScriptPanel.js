import { useState, useEffect } from 'react';
import { videoAPI, ragAPI, aiAPI } from '../../lib/api';

export default function ScriptPanel({ projectId, onAddAudio, initialScript }) {
    const [script, setScript] = useState(initialScript || 'welcome to the world\'s most awaiting game...');
    const [generating, setGenerating] = useState(false);
    const [processingAI, setProcessingAI] = useState(false);
    const [voice, setVoice] = useState('en');
    const [rewriteLoading, setRewriteLoading] = useState(false);

    useEffect(() => {
        if (initialScript) {
            setScript(initialScript);
        }
    }, [initialScript]);

    const handleProcessWithAI = async () => {
        setProcessingAI(true);
        try {
            // Mock data for now - in real app these would come from the recorder context
            const mockData = {
                projectId,
                rawTranscript: script,
                uiEvents: [],
                styleGuidelines: "Professional and concise",
                docUseCase: "Tutorial"
            };

            const response = await aiAPI.processRecording(mockData);
            const { polishedScript } = response.data.data;
            
            if (polishedScript) {
                setScript(polishedScript);
                // You might also want to bubble up the other data (zooms, docs) to the parent
                // via a callback like onAIProcessComplete(response.data.data)
                const event = new CustomEvent('ai-process-complete', { detail: response.data.data });
                window.dispatchEvent(event);
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
            console.log('Generating speech with voice:', voice);
            const res = await videoAPI.generateSpeech({ text: script, voice });
            
            console.log('Audio generated:', res.data.data.path);
            const audioUrl = process.env.NEXT_PUBLIC_API_URL.replace('/api', '') + res.data.data.path;
            
            // Create audio element to play (Preview)
            const audio = new Audio(audioUrl);
            audio.play();

            // Add to timeline
            if (onAddAudio) {
                onAddAudio({
                    url: audioUrl,
                    text: script,
                    duration: res.data.data.duration || (script.length * 0.1), // Fallback duration
                    voice: voice
                });
            }

            // Set script text if it was cleaned/updated
            if (res.data.data.cleaned_text) {
                setScript(res.data.data.cleaned_text);
            }
        } catch (e) {
            console.error(e);
            alert("Failed to generate speech. Check backend logs.");
        } finally {
            setGenerating(false);
        }
    };

    const handleTestVoice = () => {
        // Quick test string
        const testText = "Hello, this is a test of the selected voice.";
        const audio = new Audio(`https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(testText)}&tl=${voice}&client=tw-ob`);
        audio.play();
    };

    return (
        <div className="h-full flex flex-col p-4">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Script</h3>
                <div className="flex space-x-2">
                    <button 
                        onClick={handleProcessWithAI}
                        disabled={processingAI}
                        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded flex items-center space-x-1 disabled:opacity-50"
                    >
                        {processingAI ? (
                            <span>Processing...</span>
                        ) : (
                            <>
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                <span>Process with AI</span>
                            </>
                        )}
                    </button>
                    <button className="p-1.5 text-gray-400 hover:text-white bg-[#23232f] rounded">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                    </button>
                </div>
            </div>

            <textarea 
                className="gigauser-TextEditor gigauser-TextEditor-videoTranscript gigauser-text-editor-fix"
                value={script}
                onChange={(e) => setScript(e.target.value)}
                placeholder="Enter your script here..."
            />

            <div className="space-y-4">
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-2">Voice Selection</label>
                    <select 
                        value={voice}
                        onChange={(e) => setVoice(e.target.value)}
                        className="w-full bg-[#23232f] border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none"
                    >
                        <option value="en">Jessica (English US)</option>
                        <option value="en-gb">Arthur (English UK)</option>
                        <option value="es">Sofia (Spanish)</option>
                        <option value="fr">Jean (French)</option>
                    </select>
                </div>

                <div className="flex space-x-3">
                    <button 
                        onClick={handleTestVoice}
                        className="flex-1 py-2 border border-gray-700 text-gray-300 rounded hover:bg-gray-800 text-sm font-medium"
                    >
                        Test Voice
                    </button>
                    <button 
                        onClick={handleGenerateSpeech}
                        disabled={generating}
                        className="flex-[2] py-2 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded hover:from-pink-500 hover:to-purple-500 text-sm font-bold shadow-lg disabled:opacity-50"
                    >
                        {generating ? 'Generating...' : 'Generate Speech'}
                    </button>
                </div>
            </div>
        </div>
    );
}
