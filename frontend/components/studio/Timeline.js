import { useState, useEffect, useRef, useCallback } from 'react';
import { useVideoStore, useCurrentTime, useTotalDuration } from '../../stores/videoStore';

export default function Timeline({ tracks = [], onClipSelect, selectedClipId, onClipMove, onTimelineClick }) {
    const [zoom, setZoom] = useState(100); // pixels per second
    const currentTime = useCurrentTime();
    const storeTotalDuration = useTotalDuration();
    const totalDuration = storeTotalDuration > 0 ? Math.ceil(storeTotalDuration) : 30; // Use store duration or fallback to 30
    const timelineWidth = totalDuration * zoom;
    const playheadRef = useRef(null);
    const timelineContainerRef = useRef(null);

    // Calculate playhead position
    const playheadPosition = currentTime * zoom;

    // Handle clicking on the timeline ruler to seek
    const handleRulerClick = useCallback((e) => {
        if (!timelineContainerRef.current) return;
        
        const rect = timelineContainerRef.current.getBoundingClientRect();
        const clickX = e.clientX - rect.left + timelineContainerRef.current.scrollLeft;
        const clickedTime = clickX / zoom;
        
        // Seek to the clicked time
        const { seekTo } = useVideoStore.getState();
        seekTo(Math.max(0, Math.min(clickedTime, totalDuration)));
        
        if (onTimelineClick) {
            onTimelineClick(clickedTime);
        }
    }, [zoom, totalDuration, onTimelineClick]);

    // Default tracks if none provided
    const defaultTracks = tracks.length > 0 ? tracks : [
        {
            id: 'image-1',
            type: 'image',
            label: 'Image',
            items: [
                { id: 'slide-1', name: 'Slide 1', startTime: 0, duration: 5, endTime: 5 },
                { id: 'slide-2', name: 'Slide 2', startTime: 5, duration: 8, endTime: 13 }
            ]
        }
    ];

    const handleClipClick = (clipId) => {
        if (onClipSelect) {
            onClipSelect(clipId);
        }
    };

    return (
        <div className="h-full flex flex-col bg-[#0f1115]">
            {/* Timeline Tools */}
            <div className="h-12 border-b border-gray-800 flex items-center px-4 justify-between bg-[#16181d]">
                <div className="flex items-center space-x-4">
                    <button className="flex items-center space-x-2 px-3 py-1.5 text-gray-400 hover:text-white text-xs bg-[#23232f] hover:bg-[#2d3039] rounded border border-gray-700 transition">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0 0L12 12m0 0h7.5" /></svg>
                        <span>Split</span>
                    </button>
                    <button className="flex items-center space-x-2 px-3 py-1.5 text-gray-400 hover:text-white text-xs bg-[#23232f] hover:bg-[#2d3039] rounded border border-gray-700 transition">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                        <span>Add Clip</span>
                    </button>
                </div>
                <div className="flex items-center space-x-3">
                    <span className="text-xs text-gray-500 font-medium">Zoom</span>
                    <input 
                        type="range" 
                        min="50" 
                        max="200" 
                        value={zoom} 
                        onChange={(e) => setZoom(Number(e.target.value))}
                        className="w-32 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500" 
                    />
                    <span className="text-xs text-gray-400 font-mono w-12">{zoom}px/s</span>
                </div>
            </div>

            {/* Timeline Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Track Labels (Left Side) */}
                <div className="w-24 border-r border-gray-800 bg-[#16181d] flex-shrink-0">
                    {/* Time Ruler Label */}
                    <div className="h-8 border-b border-gray-800 flex items-center justify-center">
                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Time</span>
                    </div>
                    
                    {/* Track Labels */}
                    {defaultTracks.map((track) => (
                        <div key={track.id} className="h-16 border-b border-gray-800 flex items-center justify-center">
                            <div className="flex flex-col items-center">
                                <svg className="w-5 h-5 text-gray-500 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span className="text-xs text-gray-400 font-medium">{track.label}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Timeline Tracks (Right Side - Scrollable) */}
                <div 
                    ref={timelineContainerRef}
                    className="flex-1 overflow-auto bg-[#0f1115] custom-scrollbar relative"
                >
                    <div style={{ width: `${timelineWidth}px`, minWidth: '100%' }} className="relative">
                        {/* Playhead */}
                        <div 
                            ref={playheadRef}
                            className="timeline-playhead"
                            style={{ 
                                left: `${playheadPosition}px`,
                                display: currentTime > 0 ? 'block' : 'none'
                            }}
                        />

                        {/* Time Ruler */}
                        <div 
                            className="h-8 border-b border-gray-800 bg-[#16181d] sticky top-0 z-20 flex cursor-pointer"
                            onClick={handleRulerClick}
                        >
                            {[...Array(totalDuration)].map((_, i) => (
                                <div 
                                    key={i} 
                                    className="border-l border-gray-700 relative"
                                    style={{ width: `${zoom}px` }}
                                >
                                    <span className="absolute left-1 top-1 text-[10px] text-gray-400 font-mono font-semibold">
                                        {i}s
                                    </span>
                                    {/* Sub-divisions (half-second marks) */}
                                    <div 
                                        className="absolute top-5 left-1/2 w-px h-2 bg-gray-700"
                                        style={{ transform: 'translateX(-0.5px)' }}
                                    />
                                </div>
                            ))}
                        </div>

                        {/* Media Tracks */}
                        {defaultTracks.map((track) => (
                            <div 
                                key={track.id} 
                                className="h-16 border-b border-gray-800 relative bg-[#0f1115] hover:bg-[#12141a] transition-colors"
                            >
                                {/* Grid lines for visual reference */}
                                <div className="absolute inset-0 flex pointer-events-none">
                                    {[...Array(totalDuration)].map((_, i) => (
                                        <div 
                                            key={i} 
                                            className="border-l border-gray-800/50"
                                            style={{ width: `${zoom}px` }}
                                        />
                                    ))}
                                </div>

                                {/* Media Clips */}
                                {track.items.map((item) => {
                                    const isSelected = selectedClipId === item.id;
                                    return (
                                        <div
                                            key={item.id}
                                            onClick={() => handleClipClick(item.id)}
                                            className={`
                                                absolute top-2 h-12 rounded cursor-pointer transition-all
                                                flex items-center justify-between px-3
                                                ${isSelected 
                                                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 border-2 border-purple-400 shadow-lg shadow-purple-500/50 z-10' 
                                                    : 'bg-gradient-to-r from-blue-900/80 to-cyan-900/80 border border-blue-500/50 hover:border-blue-400 hover:shadow-md'
                                                }
                                            `}
                                            style={{
                                                left: `${item.startTime * zoom}px`,
                                                width: `${item.duration * zoom}px`
                                            }}
                                        >
                                            {/* Clip Content */}
                                            <div className="flex items-center space-x-2 flex-1 min-w-0">
                                                <svg className="w-4 h-4 text-white/80 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                                <span className="text-xs font-semibold text-white truncate">
                                                    {item.name}
                                                </span>
                                            </div>

                                            {/* Duration Badge */}
                                            <div className="flex-shrink-0 ml-2 px-2 py-0.5 bg-black/30 rounded text-[10px] font-mono text-white/70">
                                                {item.duration}s
                                            </div>

                                            {/* Resize Handles */}
                                            {isSelected && (
                                                <>
                                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-300 cursor-ew-resize hover:bg-purple-200" />
                                                    <div className="absolute right-0 top-0 bottom-0 w-1 bg-purple-300 cursor-ew-resize hover:bg-purple-200" />
                                                </>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Timeline Footer - Playback Info */}
            <div className="h-8 border-t border-gray-800 bg-[#16181d] flex items-center px-4 justify-between">
                <div className="flex items-center space-x-4 text-xs text-gray-500">
                    <span className="font-mono">Duration: {totalDuration}s</span>
                    <span>•</span>
                    <span>{defaultTracks.reduce((sum, track) => sum + track.items.length, 0)} clips</span>
                </div>
                <div className="flex items-center space-x-2 text-xs text-gray-400">
                    <span className="font-mono">Playhead: 0:00</span>
                </div>
            </div>
        </div>
    );
}
