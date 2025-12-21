export default function Timeline({ tracks = [] }) {
    return (
        <div className="h-full flex flex-col">
            {/* Timeline Tools */}
            <div className="h-10 border-b border-gray-800 flex items-center px-4 justify-between bg-[#1a1a24]">
                <div className="flex items-center space-x-4">
                    <button className="flex items-center space-x-1 text-gray-400 hover:text-white text-xs">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0 0L12 12m0 0h7.5" /></svg>
                        <span>Split</span>
                    </button>
                    <button className="flex items-center space-x-1 text-gray-400 hover:text-white text-xs">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                        <span>Add Clip</span>
                    </button>
                </div>
                <div className="flex items-center space-x-2">
                     <span className="text-xs text-gray-500">Zoom</span>
                     <input type="range" className="w-24 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
                </div>
            </div>

            {/* Tracks Area */}
            <div className="flex-1 overflow-x-auto overflow-y-hidden bg-[#16161e] p-2 relative custom-scrollbar">
                 {/* Time Ruler */}
                 <div className="flex h-6 w-[2000px] border-b border-gray-800 mb-2 text-[10px] text-gray-500 font-mono">
                     {[...Array(20)].map((_, i) => (
                         <div key={i} className="flex-1 border-l border-gray-800 pl-1">{i}s</div>
                     ))}
                 </div>

                 {/* Tracks */}
                 <div className="space-y-2 w-[2000px]">
                     {tracks.length === 0 && (
                        <div className="text-gray-500 text-xs p-4 italic">No tracks added yet.</div>
                     )}
                     
                     {tracks.map((track) => (
                        <div key={track.id} className="h-12 bg-gray-800/30 rounded flex items-center relative">
                            <div className="absolute left-0 w-6 h-full bg-gray-700 flex items-center justify-center border-r border-gray-600 rounded-l cursor-not-allowed">
                                <span className="text-[10px] text-gray-400 rotate-90 capitalize">{track.type}</span>
                            </div>
                            
                            {track.items.map((item) => (
                                <div 
                                    key={item.id}
                                    className={`absolute h-10 border rounded flex items-center justify-center text-xs truncate px-2 cursor-pointer hover:brightness-110 transition
                                        ${track.type === 'video' ? 'bg-cyan-900/50 border-cyan-500/50 text-cyan-200' : ''}
                                        ${track.type === 'audio' ? 'bg-purple-900/50 border-purple-500/50 text-purple-200' : ''}
                                    `}
                                    style={{ 
                                        left: `${(item.startTime || 0) * 100}px`, // Scale: 100px per second (example)
                                        width: `${(item.duration || 2) * 100}px` 
                                    }}
                                    title={item.name}
                                >
                                    {item.name}
                                </div>
                            ))}
                        </div>
                     ))}
                 </div>

                 {/* Playhead */}
                 <div className="absolute top-0 bottom-0 left-[200px] w-0.5 bg-pink-500 z-10 pointer-events-none">
                     <div className="w-3 h-3 bg-pink-500 -ml-1.5 rotate-45 transform -mt-1.5"></div>
                 </div>
            </div>
        </div>
    )
}
