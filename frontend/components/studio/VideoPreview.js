export default function VideoPreview() {
    return (
        <div className="w-full max-w-4xl aspect-video bg-black rounded-lg shadow-2xl relative group overflow-hidden border border-gray-800">
            {/* Main Canvas Placeholder */}
            <div className="absolute inset-0 flex items-center justify-center">
                 <div className="text-center">
                     <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-pink-500 to-purple-600 mb-2">
                         GRAND THEFT AUTO VI
                     </h1>
                     <p className="text-2xl font-bold text-pink-500 uppercase tracking-[0.2em]">
                         COMING MAY 26 2026
                     </p>
                 </div>
            </div>

            {/* Overlays / Controls */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition duration-300">
                 <div className="flex items-center justify-between">
                     <div className="flex items-center space-x-4">
                         <button className="text-white hover:text-pink-500 transition"><svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></button>
                         <span className="text-sm font-mono text-gray-300">00:00:00 / 00:41:47</span>
                     </div>
                     <div className="flex items-center space-x-3">
                         <button className="text-gray-300 hover:text-white"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg></button>
                     </div>
                 </div>
            </div>

            {/* Top Bar */}
            <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start opacity-0 group-hover:opacity-100 transition duration-300">
                <div className="bg-black/50 backdrop-blur rounded px-2 py-1 text-xs text-white border border-white/10">
                    1920 x 1080
                </div>
            </div>
        </div>
    )
}
