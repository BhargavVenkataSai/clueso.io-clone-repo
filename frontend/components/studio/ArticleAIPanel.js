import { useState } from 'react';
import { aiAPI } from '../../lib/api';

/**
 * ArticleAIPanel - AI Assistant sidebar for article editing
 * Provides quick action buttons and AI prompt input
 */
export default function ArticleAIPanel({ 
    projectId,
    videoId,
    onRewrite,
    onImprove,
    isLoading = false 
}) {
    const [prompt, setPrompt] = useState('');
    const [processing, setProcessing] = useState(false);
    const [activeAction, setActiveAction] = useState(null);

    // Quick action buttons configuration
    const quickActions = [
        { id: 'rewrite', label: 'Rewrite from video', icon: '🎬', color: 'bg-purple-600 hover:bg-purple-500' },
        { id: 'improve', label: 'Improve writing', icon: '✨', color: 'bg-green-600 hover:bg-green-500' },
        { id: 'screenshots', label: 'Remove extra screenshots', icon: '🖼️', color: 'bg-blue-600 hover:bg-blue-500' },
        { id: 'gifs', label: 'Add animated GIFs', icon: '🎞️', color: 'bg-pink-600 hover:bg-pink-500' },
        { id: 'concise', label: 'Make it concise', icon: '📝', color: 'bg-orange-600 hover:bg-orange-500' },
        { id: 'structure', label: 'Fix structure', icon: '📋', color: 'bg-indigo-600 hover:bg-indigo-500' },
        { id: 'zooms', label: 'Remove zooms', icon: '🔍', color: 'bg-gray-600 hover:bg-gray-500' },
    ];

    const handleQuickAction = async (actionId) => {
        setProcessing(true);
        setActiveAction(actionId);
        
        try {
            switch (actionId) {
                case 'rewrite':
                    await onRewrite?.();
                    break;
                case 'improve':
                    await onImprove?.('Improve the writing quality, clarity, and flow');
                    break;
                case 'concise':
                    await onImprove?.('Make this article more concise while keeping key information');
                    break;
                case 'structure':
                    await onImprove?.('Improve the structure with better headings and organization');
                    break;
                default:
                    console.log('Action:', actionId);
            }
        } catch (error) {
            console.error('Quick action failed:', error);
        } finally {
            setProcessing(false);
            setActiveAction(null);
        }
    };

    const handleSubmitPrompt = async () => {
        if (!prompt.trim()) return;
        
        setProcessing(true);
        try {
            await onImprove?.(prompt);
            setPrompt('');
        } catch (error) {
            console.error('AI prompt failed:', error);
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="w-80 bg-[#16181d] border-l border-gray-800 flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-gray-800">
                <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-500">Base prompt</span>
                    <button className="text-xs text-pink-500 hover:text-pink-400">Change</button>
                </div>
                <h2 className="text-lg font-bold text-white">Step-by-step help article</h2>
                <button className="text-xs text-gray-500 hover:text-gray-400 mt-1">Clear Chat</button>
            </div>

            {/* AI Capabilities */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Welcome Message */}
                <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white text-sm">
                        ✨
                    </div>
                    <div className="flex-1">
                        <p className="text-sm text-gray-300 font-medium">Welcome! I'm Clueso Co-Pilot.</p>
                        <p className="text-xs text-gray-500 mt-1">I can help you quickly turn your screen recording into a clear, polished article.</p>
                    </div>
                </div>

                {/* Content & Writing */}
                <div className="bg-[#1a1d21] rounded-lg p-3 border border-gray-800">
                    <h3 className="text-sm font-bold text-white mb-2 flex items-center">
                        <span className="mr-2">📝</span> Content & Writing
                    </h3>
                    <ul className="text-xs text-gray-400 space-y-1">
                        <li>• Rewrite based on the video transcript</li>
                        <li>• Improve writing quality (clarity, grammar, tone)</li>
                        <li>• Make the article more concise and professional</li>
                    </ul>
                </div>

                {/* Screenshots & Visuals */}
                <div className="bg-[#1a1d21] rounded-lg p-3 border border-gray-800">
                    <h3 className="text-sm font-bold text-white mb-2 flex items-center">
                        <span className="mr-2">🖼️</span> Screenshots & Visuals
                    </h3>
                    <ul className="text-xs text-gray-400 space-y-1">
                        <li>• Remove extra or repetitive screenshots</li>
                        <li>• Turn screenshots into GIFs, combine into a single GIF</li>
                        <li>• Remove zoom/crops or apply them consistently</li>
                        <li>• Add and remove elements from screenshots</li>
                    </ul>
                </div>

                {/* Structure & Formatting */}
                <div className="bg-[#1a1d21] rounded-lg p-3 border border-gray-800">
                    <h3 className="text-sm font-bold text-white mb-2 flex items-center">
                        <span className="mr-2">📋</span> Structure & Formatting
                    </h3>
                    <ul className="text-xs text-gray-400 space-y-1">
                        <li>• Fix flow and sectioning</li>
                        <li>• Add headings or split long blocks into steps</li>
                        <li>• Translate into other languages</li>
                    </ul>
                </div>

                {/* More Help */}
                <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white text-sm">
                        💡
                    </div>
                    <p className="text-xs text-gray-400">And much more! Just ask me anything.</p>
                </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="p-4 border-t border-gray-800">
                <div className="flex flex-wrap gap-2 mb-4">
                    {quickActions.slice(0, 5).map((action) => (
                        <button
                            key={action.id}
                            onClick={() => handleQuickAction(action.id)}
                            disabled={processing}
                            className={`px-2 py-1 text-xs rounded-full text-white transition flex items-center space-x-1 ${
                                activeAction === action.id ? 'opacity-50' : ''
                            } ${action.color}`}
                        >
                            <span>{action.icon}</span>
                            <span>{action.label}</span>
                        </button>
                    ))}
                </div>
                <div className="flex flex-wrap gap-2 mb-4">
                    {quickActions.slice(5).map((action) => (
                        <button
                            key={action.id}
                            onClick={() => handleQuickAction(action.id)}
                            disabled={processing}
                            className={`px-2 py-1 text-xs rounded-full text-white transition flex items-center space-x-1 ${
                                activeAction === action.id ? 'opacity-50' : ''
                            } ${action.color}`}
                        >
                            <span>{action.icon}</span>
                            <span>{action.label}</span>
                        </button>
                    ))}
                </div>

                {/* AI Prompt Input */}
                <div className="flex items-center space-x-2">
                    <input
                        type="text"
                        placeholder="Ask AI to improve your article..."
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSubmitPrompt()}
                        disabled={processing}
                        className="flex-1 bg-[#23232f] text-white text-sm rounded-lg px-3 py-2 border border-gray-700 focus:border-pink-500 focus:outline-none transition placeholder-gray-500"
                    />
                    <button
                        onClick={handleSubmitPrompt}
                        disabled={processing || !prompt.trim()}
                        className="px-4 py-2 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white text-sm font-bold rounded-lg transition disabled:opacity-50 flex items-center space-x-1"
                    >
                        {processing ? (
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : (
                            <>
                                <span>Submit</span>
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                </svg>
                            </>
                        )}
                    </button>
                </div>

                <p className="text-[10px] text-gray-600 mt-2 text-center">AI can make mistakes. Verify outputs.</p>
            </div>
        </div>
    );
}
