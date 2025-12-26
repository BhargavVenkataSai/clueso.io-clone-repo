// frontend/components/studio/EditorStage.js
import React, { useState, useRef, useEffect } from 'react';

export default function EditorStage({ videoUrl, activeText, isPlaying, currentTime }) {
  // Position state for the text box (draggable)
  const [position, setPosition] = useState({ x: 10, y: 50 }); // % coordinates
  const [isDragging, setIsDragging] = useState(false);
  const videoRef = useRef(null);

  // Sync video play/pause with parent state
  useEffect(() => {
    if (videoRef.current) {
        if (isPlaying) videoRef.current.play();
        else videoRef.current.pause();
    }
  }, [isPlaying]);

  // Sync video time
  useEffect(() => {
      if (videoRef.current && Math.abs(videoRef.current.currentTime - currentTime) > 0.5) {
          videoRef.current.currentTime = currentTime;
      }
  }, [currentTime]);

  return (
    <div className="flex-1 bg-black flex items-center justify-center p-8 overflow-hidden">
       {/* 1. THE STAGE CONTAINER (16:9 Aspect Ratio) */}
       <div className="relative w-full max-w-6xl aspect-video bg-[#0F0F12] shadow-2xl rounded-lg overflow-hidden border border-white/10 group">
          
          {/* 2. VIDEO LAYER */}
          <video 
            ref={videoRef}
            src={videoUrl}
            className="absolute inset-0 w-full h-full object-contain"
            muted // Muted because audio usually comes from the separate audio track/TTS
          />

          {/* 3. CLUESO OVERLAY LAYER */}
          {/* This absolute layer sits ON TOP of the video */}
          <div className="absolute inset-0 z-20 pointer-events-none">
             
             {/* The Floating Script Box */}
             <div 
               className="absolute pointer-events-auto cursor-move transition-transform duration-75"
               style={{ 
                   left: `${position.x}%`, 
                   top: `${position.y}%`,
                   transform: 'translate(-50%, -50%)' // Center anchor
               }}
               draggable="true"
               onDragEnd={(e) => {
                   // Calculate percentage position to stay responsive
                   const rect = e.target.offsetParent.getBoundingClientRect();
                   const x = ((e.clientX - rect.left) / rect.width) * 100;
                   const y = ((e.clientY - rect.top) / rect.height) * 100;
                   setPosition({ x, y });
               }}
             >
                {/* GLASSMORPHISM CARD */}
                <div className="bg-black/60 backdrop-blur-md border border-white/10 p-4 rounded-2xl flex items-center gap-4 shadow-2xl min-w-[300px] max-w-[500px]">
                   
                   {/* Avatar Bubble */}
                   <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white font-bold text-sm shadow-lg border border-white/20">
                      AI
                   </div>

                   {/* The Text Content */}
                   <div className="flex flex-col flex-1">
                      <span className="text-[10px] text-gray-400 font-mono uppercase tracking-wider mb-0.5">
                          Slide Content
                      </span>
                      <p className="text-white text-lg font-medium leading-snug drop-shadow-md">
                          {activeText || "Select a slide to edit..."}
                      </p>
                   </div>
                </div>
             </div>

          </div>

          {/* 4. Top/Bottom Overlay Controls (Like Clueso) */}
          <div className="absolute top-4 left-4 z-30 opacity-0 group-hover:opacity-100 transition-opacity">
               <div className="bg-black/50 backdrop-blur px-3 py-1 rounded text-xs text-white border border-white/10">
                   1920 x 1080
               </div>
          </div>
       </div>
    </div>
  );
}