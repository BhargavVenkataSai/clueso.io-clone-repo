import { useState } from 'react';
import { videoAPI, ragAPI } from '../../lib/api';

export default function ScriptPanel({ projectId }) {
    const [script, setScript] = useState('welcome to the world\'s most awaiting game...');
    const [generating, setGenerating] = useState(false);
    const [voice, setVoice] = useState('en');
    const [rewriteLoading, setRewriteLoading] = useState(false);

    const handleGenerateSpeech = async () => {
        setGenerating(true);
        try {
            console.log('Generating speech with voice:', voice);
            const res = await videoAPI.generateSpeech({ text: script, voice });
            
            console.log('Audio generated:', res.data.data.path);
            const audioUrl = process.env.NEXT_PUBLIC_API_URL.replace('/api', '') + res.data.data.path;
            
            // Create audio element to play
            const audio = new Audio(audioUrl);
            audio.play();

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

    const handleAIRewrite = async () => {
        setRewriteLoading(true);
        try {
            const res = await ragAPI.generateScript({ prompt: "Rewrite this script based on uploaded docs" });
            if (res.data.data && res.data.data.scenes) {
                // Assuming the first scene audio for now
                setScript(res.data.data.scenes[0].audio);
            } else {
                // Fallback for demo if no RAG docs
                 setScript("Welcome to Grand Theft Auto VI, the highly anticipated release arriving on May 26th.");
            }
        } catch (e) {
             console.error(e);
             alert("Failed to generate script. Check backend logs.");
        } finally {
            setRewriteLoading(false);
        }
    }

    return (
        <div className="flex flex-col h-full">
            <div className="p-4 border-b border-gray-800">
                <h2 className="text-lg font-bold text-white mb-4">Script</h2>
                <div className="flex space-x-2">
                    <button 
                        onClick={handleGenerateSpeech}
                        disabled={generating}
                        className="flex-1 bg-gray-700 hover:bg-gray-600 text-white rounded-lg py-2 px-3 text-sm font-medium flex items-center justify-center space-x-2 transition"
                    >
                        {generating ? <span>Generating...</span> : (
                            <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                                <span>Generate Speech</span>
                            </>
                        )}
                    </button>
                    <button 
                        onClick={handleAIRewrite}
                        disabled={rewriteLoading}
                        className="flex-shrink-0 bg-gray-700 hover:bg-gray-600 text-white rounded-lg p-2 transition"
                         title="AI Rewrite"
                    >
                         <svg className={`w-5 h-5 ${rewriteLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Scene 1 */}
                <div className="bg-[#23232f] rounded-lg border border-gray-700 p-3 hover:border-pink-500/50 transition duration-200">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Scene 1 &bull; Intro</span>
                         
                         {/* Voice Selection Dropdown */}
                        <div className="flex items-center space-x-2 bg-[#1a1d21] rounded-lg p-1">
                            <select 
                                value={voice} 
                                onChange={(e) => setVoice(e.target.value)}
                                className="bg-transparent text-white text-xs outline-none border-none px-2 py-1 appearance-none cursor-pointer hover:bg-white/5 rounded"
                            >
                                <option value="en" className="bg-[#1a1d21]">English (US)</option>
                                <option value="en-GB" className="bg-[#1a1d21]">English (UK)</option>
                                <option value="en-AU" className="bg-[#1a1d21]">English (AU)</option>
                                <option value="fr" className="bg-[#1a1d21]">French</option>
                                <option value="es" className="bg-[#1a1d21]">Spanish</option>
                                <option value="de" className="bg-[#1a1d21]">German</option>
                                <option value="ja" className="bg-[#1a1d21]">Japanese</option>
                            </select>
                            <button 
                                onClick={handleTestVoice}
                                className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-white"
                                title="Test Voice"
                            >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </button>
                        </div>

                    </div>
                    <textarea 
                        className="w-full bg-transparent text-gray-300 text-sm resize-none focus:outline-none min-h-[80px] leading-relaxed"
                        value={script}
                        onChange={(e) => setScript(e.target.value)}
                        placeholder="Type your script here..."
                    />
                </div>
                
                 {/* Scene 2 Placeholder */}
                <div className="bg-[#23232f] rounded-lg border border-gray-700 p-3 opacity-60">
                     <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Scene 2 &bull; Video</span>
                    </div>
                    <div className="text-xs text-gray-500 italic p-2 border border-dashed border-gray-700 rounded">
                        (Original Video Audio)
                    </div>
                </div>

            </div>

             <div className="p-4 border-t border-gray-800">
                <button className="w-full py-2 border border-gray-700 text-gray-400 hover:text-white rounded-lg text-sm flex items-center justify-center space-x-2 transition">
                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                     <span>Add Scene</span>
                </button>
             </div>
        </div>
    )
}
