import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { useAuth } from '../../contexts/AuthContext';
import { videoAPI } from '../../lib/api';
import ScriptPanel from '../../components/studio/ScriptPanel';
import EditorStage from '../studio/EditorStage';

export default function VideoEditor() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { id } = router.query;

  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('script'); // script, elements, templates, music, captions
  
  // Mock Timeline State
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(300); // 5 mins
  const [isPlaying, setIsPlaying] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(50);

  // Timeline clips state - draggable positions
  const [videoClipStart, setVideoClipStart] = useState(0); // Start position in pixels
  const [audioClipStart, setAudioClipStart] = useState(0);
  const [draggingClip, setDraggingClip] = useState(null); // 'video' | 'audio' | null
  const [playheadPosition, setPlayheadPosition] = useState(50); // Playhead position in pixels
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);
  const timelineRef = useRef(null);

  // NEW STATE for Text Sync with EditorStage
  const [previewText, setPreviewText] = useState("Let's dive in.");
  
  // Audio sync state - for synchronized video + voice playback
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioSlides, setAudioSlides] = useState([]); // Store slides with timing info
  const audioRef = useRef(null);
  const videoRef = useRef(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (id && user) {
      loadVideo();
    }
  }, [id, user]);

  // Track play promises to avoid AbortError
  const videoPlayPromise = useRef(null);
  const audioPlayPromise = useRef(null);
  const syncIntervalRef = useRef(null);
  const isTogglingRef = useRef(false); // Debounce rapid clicks
  const isSeekingRef = useRef(false); // Prevent sync during seek

  // Sync audio to video continuously during playback
  const startSyncInterval = useCallback(() => {
    // Clear any existing interval
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
    }
    
    // Sync audio to video every 100ms
    syncIntervalRef.current = setInterval(() => {
      // Don't sync during seek operations
      if (isSeekingRef.current) return;
      
      if (videoRef.current && audioRef.current && audioUrl) {
        const videoCurrent = videoRef.current.currentTime;
        const audioCurrent = audioRef.current.currentTime;
        const drift = Math.abs(videoCurrent - audioCurrent);
        
        // If drift is more than 0.15s, resync
        if (drift > 0.15) {
          audioRef.current.currentTime = videoCurrent;
        }
      }
    }, 100);
  }, [audioUrl]);

  const stopSyncInterval = useCallback(() => {
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
      syncIntervalRef.current = null;
    }
  }, []);

  // Cleanup sync interval on unmount
  useEffect(() => {
    return () => stopSyncInterval();
  }, [stopSyncInterval]);

  // Handle synchronized play/pause with debounce
  const handlePlayPause = useCallback(async () => {
    // Prevent rapid clicking
    if (isTogglingRef.current) return;
    isTogglingRef.current = true;
    
    const newIsPlaying = !isPlaying;
    setIsPlaying(newIsPlaying);
    
    if (newIsPlaying) {
      // Sync audio time to video time before playing
      if (videoRef.current && audioRef.current && audioUrl) {
        audioRef.current.currentTime = videoRef.current.currentTime;
      }
      
      // Play both video and audio simultaneously - only if not already playing
      try {
        const playPromises = [];
        
        if (videoRef.current && videoRef.current.paused) {
          videoPlayPromise.current = videoRef.current.play();
          playPromises.push(videoPlayPromise.current);
        }
        
        if (audioRef.current && audioUrl && audioRef.current.paused) {
          audioPlayPromise.current = audioRef.current.play();
          playPromises.push(audioPlayPromise.current);
        }
        
        if (playPromises.length > 0) {
          await Promise.allSettled(playPromises);
        }
        startSyncInterval();
      } catch (e) {
        // Ignore AbortError
      }
      
    } else {
      // Stop sync interval first
      stopSyncInterval();
      
      // Wait for play promises to settle before pausing
      await Promise.allSettled([
        videoPlayPromise.current,
        audioPlayPromise.current
      ].filter(Boolean));
      
      // Now safe to pause both - only if not already paused
      if (videoRef.current && !videoRef.current.paused) videoRef.current.pause();
      if (audioRef.current && !audioRef.current.paused) audioRef.current.pause();
    }
    
    // Allow toggling again after a short delay
    setTimeout(() => {
      isTogglingRef.current = false;
    }, 100);
  }, [isPlaying, audioUrl, startSyncInterval, stopSyncInterval]);

  // Handle time update from video - update UI time display
  const handleTimeUpdate = useCallback((time) => {
    setCurrentTime(time);
  }, []);

  // Handle seeking - sync audio when video is seeked
  const handleSeek = useCallback(async (newTime) => {
    // Mark that we're seeking to prevent sync interference
    isSeekingRef.current = true;
    
    // If currently playing, pause first to avoid AbortError during seek
    const wasPlaying = isPlaying && videoRef.current && !videoRef.current.paused;
    
    if (wasPlaying) {
      // Pause both before seeking
      try {
        await Promise.allSettled([videoPlayPromise.current, audioPlayPromise.current].filter(Boolean));
      } catch (e) {}
      if (videoRef.current) videoRef.current.pause();
      if (audioRef.current) audioRef.current.pause();
    }
    
    // Now seek
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
    if (audioRef.current && audioUrl) {
      audioRef.current.currentTime = newTime;
    }
    setCurrentTime(newTime);
    
    // Resume if was playing
    if (wasPlaying) {
      try {
        const playPromises = [];
        if (videoRef.current) {
          videoPlayPromise.current = videoRef.current.play();
          playPromises.push(videoPlayPromise.current);
        }
        if (audioRef.current && audioUrl) {
          audioPlayPromise.current = audioRef.current.play();
          playPromises.push(audioPlayPromise.current);
        }
        await Promise.allSettled(playPromises);
      } catch (e) {}
    }
    
    // Done seeking
    isSeekingRef.current = false;
  }, [audioUrl, isPlaying]);

  // Handle audio URL update from ScriptPanel
  const handleAudioReady = useCallback((url, slides) => {
    console.log('🔊 Audio ready for sync:', url);
    setAudioUrl(url);
    if (slides) setAudioSlides(slides);
    
    // Reset playback position when new audio is loaded
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
    }
    setCurrentTime(0);
    setIsPlaying(false);
  }, []);

  // Timeline clip drag handlers - using refs to avoid stale closure issues
  const handleClipDragStart = (e, clipType) => {
    e.preventDefault();
    e.stopPropagation();
    
    const startX = e.clientX;
    const startPos = clipType === 'video' ? videoClipStart : audioClipStart;
    
    const handleMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const newPos = Math.max(0, startPos + deltaX);
      const maxPos = 600; // Max drag distance
      const clampedPos = Math.min(newPos, maxPos);
      
      if (clipType === 'video') {
        setVideoClipStart(clampedPos);
      } else {
        setAudioClipStart(clampedPos);
      }
    };
    
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      setDraggingClip(null);
    };
    
    setDraggingClip(clipType);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Playhead drag handler - for scrubbing through timeline
  const handlePlayheadDragStart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('🎯 Playhead drag started');
    
    const startX = e.clientX;
    const startPos = playheadPosition;
    
    setIsDraggingPlayhead(true);
    
    const handleMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const newPos = Math.max(16, startPos + deltaX); // Min 16px from left (padding)
      const maxPos = 800; // Max position
      const clampedPos = Math.min(newPos, maxPos);
      
      console.log('🎯 Playhead moving to:', clampedPos);
      setPlayheadPosition(clampedPos);
      
      // Convert pixel position to time and seek video/audio
      const pixelsPerSecond = 64; // Approximate: each second = 64px
      const timeInSeconds = (clampedPos - 16) / pixelsPerSecond;
      handleSeek(Math.max(0, timeInSeconds));
    };
    
    const handleMouseUp = () => {
      console.log('🎯 Playhead drag ended');
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      setIsDraggingPlayhead(false);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Click on timeline to move playhead
  const handleTimelineClick = (e) => {
    if (draggingClip || isDraggingPlayhead) return;
    
    const timelineRect = timelineRef.current?.getBoundingClientRect();
    if (!timelineRect) return;
    
    const clickX = e.clientX - timelineRect.left + (timelineRef.current?.scrollLeft || 0);
    const newPos = Math.max(16, clickX);
    
    setPlayheadPosition(newPos);
    
    // Convert to time
    const pixelsPerSecond = 64;
    const timeInSeconds = (newPos - 16) / pixelsPerSecond;
    handleSeek(Math.max(0, timeInSeconds));
  };

  const loadVideo = async () => {
    try {
      const response = await videoAPI.getById(id);
      setVideo(response.data.data);
      if (response.data.data.files?.original?.duration) {
          setDuration(response.data.data.files.original.duration);
      }
      setLoading(false);
    } catch (error) {
      console.error('Failed to load video:', error);
      // alert('Failed to load video'); // Suppress for now during dev
      // router.push('/dashboard');
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return <div className="min-h-screen bg-[#0f1115] flex items-center justify-center text-white">Loading Studio...</div>;
  }

  return (
    <>
      <Head>
        <title>{video?.title || 'Untitled'} - Clueso Studio</title>
      </Head>

      <div className="flex flex-col h-screen bg-[#0f1115] text-white overflow-hidden">
        {/* Top Navigation Bar */}
        <header className="h-14 bg-[#0f1115] border-b border-gray-800 flex items-center justify-between px-4 z-20">
            <div className="flex items-center space-x-4">
                <Link href="/dashboard" className="text-gray-400 hover:text-white transition">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                </Link>
                <div className="h-6 w-px bg-gray-800 mx-2"></div>
                <div className="flex items-center space-x-2">
                    <span className="font-semibold text-sm">{video?.title || 'Untitled Project'}</span>
                    <span className="text-xs text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">Video</span>
                </div>
            </div>

            <div className="flex items-center space-x-3">
                 <div className="flex items-center bg-[#1a1d21] rounded-lg p-0.5 border border-gray-800">
                    <button className="px-3 py-1.5 text-xs font-medium bg-[#23232f] rounded text-white shadow-sm">Video</button>
                    <button className="px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-white transition">Article</button>
                 </div>
                 
                 <div className="h-6 w-px bg-gray-800 mx-2"></div>

                 <button className="p-2 text-gray-400 hover:text-white transition">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15v4a2 2 0 002 2h14a2 2 0 002-2v-4M17 9l-5 5-5-5M12 12.828V2.172" /></svg>
                 </button>
                 <button className="p-2 text-gray-400 hover:text-white transition">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                 </button>
                 
                 <button className="px-4 py-1.5 border border-gray-700 hover:border-gray-500 text-sm font-medium rounded-lg transition flex items-center space-x-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" /></svg>
                    <span>Translate</span>
                 </button>
                 
                 <button className="px-4 py-1.5 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white text-sm font-bold rounded-lg shadow-lg flex items-center space-x-2 transition">
                    <span>Export</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                 </button>
            </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
            {/* Left Sidebar (Navigation + Panel) */}
            <div className="w-[360px] flex border-r border-gray-800 bg-[#0f1115]">
                {/* Icons Rail */}
                <div className="w-16 flex flex-col items-center py-4 space-y-6 border-r border-gray-800 bg-[#0f1115]">
                    <NavIcon icon="script" label="Script" active={activeTab === 'script'} onClick={() => setActiveTab('script')} />
                    <NavIcon icon="elements" label="Elements" active={activeTab === 'elements'} onClick={() => setActiveTab('elements')} />
                    <NavIcon icon="templates" label="Templates" active={activeTab === 'templates'} onClick={() => setActiveTab('templates')} />
                    <NavIcon icon="music" label="Music" active={activeTab === 'music'} onClick={() => setActiveTab('music')} />
                    <NavIcon icon="captions" label="Captions" active={activeTab === 'captions'} onClick={() => setActiveTab('captions')} />
                    
                    <div className="mt-auto pb-4">
                        <NavIcon icon="support" label="Support" onClick={() => {}} />
                    </div>
                </div>

                {/* Content Panel */}
                <div className="flex-1 bg-[#16181d] flex flex-col h-full overflow-hidden">
                    {activeTab === 'script' && (
                        <ScriptPanel 
                            projectId={id} 
                            videoId={id}
                            currentTime={currentTime}
                            isPlaying={isPlaying}
                            onActiveTextChange={(text) => setPreviewText(text)}
                            onAudioReady={handleAudioReady}
                        />
                    )}
                    {activeTab !== 'script' && (
                        <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                            <p>Panel ({activeTab}) coming soon</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Canvas Area */}
            <div className="flex-1 flex flex-col relative bg-[#0a0a0a]">
                
                 {/* Canvas Toolbar */}
                 <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-[#1a1d21] border border-gray-800 rounded-full px-4 py-2 flex items-center space-x-4 shadow-xl z-10">
                    <button className="flex items-center space-x-2 text-xs font-medium text-gray-300 hover:text-white">
                        <div className="w-4 h-4 rounded-full bg-white"></div>
                        <span>Background</span>
                    </button>
                    <div className="w-px h-4 bg-gray-700"></div>
                    <button className="flex items-center space-x-2 text-xs font-medium text-gray-300 hover:text-white">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" /></svg>
                        <span>16:9</span>
                    </button>
                    <div className="w-px h-4 bg-gray-700"></div>
                     <button className="flex items-center space-x-2 text-xs font-medium text-gray-300 hover:text-white">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        <span>Insert</span>
                    </button>
                 </div>

                {/* Hidden Audio Element for TTS Voice - always rendered to avoid recreation */}
                <audio 
                  ref={audioRef}
                  src={audioUrl || ''} 
                  preload="auto"
                  onEnded={() => {
                    // Audio ended but don't stop video - let video continue playing
                    // Only stop everything when VIDEO ends, not audio
                    console.log('🔊 Audio track ended');
                  }}
                  style={{ display: 'none' }}
                />

                {/* Video Preview Canvas - REPLACED WITH EditorStage */}
                <EditorStage 
                    videoUrl={video?.files?.original?.path || video?.filename ? `/uploads/${video.filename}` : ""}
                    activeText={previewText}
                    isPlaying={isPlaying}
                    currentTime={currentTime}
                    onTimeUpdate={handleTimeUpdate}
                    onVideoEnded={() => {
                      console.log('🎬 Video playback finished');
                      setIsPlaying(false);
                      stopSyncInterval();
                    }}
                    videoRef={videoRef}
                />

                {/* Timeline Area (Bottom) */}
                <div className="h-48 bg-[#16181d] border-t border-gray-800 flex flex-col">
                    
                    {/* Timeline Controls */}
                    <div className="h-10 border-b border-gray-800 flex items-center justify-between px-4">
                         <div className="flex items-center space-x-2">
                            <button className="text-xs font-medium text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-white/5 flex items-center space-x-1">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" /></svg>
                                <span>Split</span>
                            </button>
                            <button className="text-xs font-medium text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-white/5 flex items-center space-x-1">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                <span>Add Clip</span>
                            </button>
                         </div>

                         <div className="flex items-center space-x-4">
                             <button className="p-1.5 rounded-full bg-[#23232f] text-gray-300 hover:text-white">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                             </button>
                             <button 
                                onClick={handlePlayPause}
                                className="p-2 rounded-full bg-pink-600 text-white hover:bg-pink-500 shadow-lg"
                             >
                                {isPlaying ? (
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                ) : (
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                )}
                             </button>
                             <button className="p-1.5 rounded-full bg-[#23232f] text-gray-300 hover:text-white">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                             </button>
                             <span className="text-xs font-mono text-gray-400">00:00:00 / 00:05:00</span>
                         </div>

                         <div className="flex items-center space-x-2 w-32">
                             <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
                             <input 
                                type="range" 
                                min="10" max="100" 
                                value={zoomLevel} 
                                onChange={(e) => setZoomLevel(e.target.value)}
                                className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-pink-500"
                             />
                             <span className="text-xs text-gray-500">{zoomLevel}%</span>
                         </div>
                    </div>

                    {/* Timeline Tracks */}
                    <div 
                        ref={timelineRef} 
                        className="flex-1 overflow-x-auto relative custom-scrollbar"
                        onClick={handleTimelineClick}
                    >
                        {/* Time Ruler */}
                        <div className="h-6 border-b border-gray-800 flex items-end px-4 text-[10px] text-gray-500 select-none">
                            <span className="mr-16">1s</span>
                            <span className="mr-16">2s</span>
                            <span className="mr-16">3s</span>
                            <span className="mr-16">4s</span>
                            <span className="mr-16">5s</span>
                            <span className="mr-16">6s</span>
                            <span className="mr-16">7s</span>
                            <span className="mr-16">8s</span>
                        </div>
                        
                        {/* Draggable Playhead / Time Indicator */}
                        <div 
                            className="absolute top-0 bottom-0 z-20"
                            style={{ left: `${playheadPosition}px` }}
                        >
                            {/* Wider invisible hit area for easier grabbing */}
                            <div 
                                className="absolute top-0 bottom-0 -left-3 w-6 cursor-ew-resize"
                                onMouseDown={handlePlayheadDragStart}
                                onClick={(e) => e.stopPropagation()}
                            />
                            
                            {/* Visible playhead line */}
                            <div className={`absolute top-0 bottom-0 left-0 w-0.5 ${isDraggingPlayhead ? 'bg-pink-400' : 'bg-pink-500'}`} />
                            
                            {/* Playhead Handle (top) - larger and more visible */}
                            <div 
                                className={`absolute -top-1 -left-2 w-5 h-5 bg-pink-500 rounded cursor-grab active:cursor-grabbing ${isDraggingPlayhead ? 'bg-pink-400 scale-110' : 'hover:bg-pink-400 hover:scale-105'} transition-all shadow-lg flex items-center justify-center`}
                                onMouseDown={handlePlayheadDragStart}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="w-1 h-3 bg-white/50 rounded-full" />
                            </div>
                        </div>

                        {/* Tracks */}
                        <div className="p-4 space-y-2 min-w-[800px]">
                             {/* Video Track */}
                             <div className="h-16 bg-gray-800/50 rounded-lg relative overflow-visible border border-gray-700/50 group">
                                 {/* Striped Pattern Background */}
                                 <div className="absolute inset-0 opacity-10 rounded-lg" 
                                    style={{backgroundImage: 'repeating-linear-gradient(45deg, #000 25%, transparent 25%, transparent 75%, #000 75%, #000), repeating-linear-gradient(45deg, #000 25%, #222 25%, #222 75%, #000 75%, #000)', backgroundPosition: '0 0, 10px 10px', backgroundSize: '20px 20px'}}>
                                 </div>
                                 
                                 {/* Draggable Video Clip */}
                                 <div 
                                     className={`absolute top-0 bottom-0 w-64 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg border-2 ${draggingClip === 'video' ? 'border-white shadow-lg shadow-blue-500/50' : 'border-blue-500/50'} flex items-center px-3 cursor-grab active:cursor-grabbing select-none transition-shadow`}
                                     style={{ left: `${videoClipStart}px` }}
                                     onMouseDown={(e) => handleClipDragStart(e, 'video')}
                                 >
                                     {/* Drag Handle Left */}
                                     <div className="absolute left-0 top-0 bottom-0 w-2 bg-blue-400/50 rounded-l-lg hover:bg-blue-400 cursor-ew-resize" />
                                     
                                     {/* Clip Content */}
                                     <div className="flex items-center gap-2 ml-3">
                                         <svg className="w-4 h-4 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                         </svg>
                                         <span className="text-xs font-medium text-white">Video Clip</span>
                                     </div>
                                     
                                     {/* Duration Badge */}
                                     <div className="ml-auto bg-black/30 px-2 py-0.5 rounded text-[10px] font-mono text-blue-200">
                                         0:30
                                     </div>
                                     
                                     {/* Drag Handle Right */}
                                     <div className="absolute right-0 top-0 bottom-0 w-2 bg-blue-400/50 rounded-r-lg hover:bg-blue-400 cursor-ew-resize" />
                                 </div>
                             </div>

                             {/* Audio Track */}
                             <div className="h-12 bg-purple-900/20 rounded-lg relative overflow-visible border border-purple-500/30">
                                  {/* Draggable Audio Clip */}
                                  <div 
                                      className={`absolute top-0 bottom-0 w-64 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg border-2 ${draggingClip === 'audio' ? 'border-white shadow-lg shadow-purple-500/50' : 'border-purple-500/50'} flex items-center px-3 cursor-grab active:cursor-grabbing select-none transition-shadow`}
                                      style={{ left: `${audioClipStart}px` }}
                                      onMouseDown={(e) => handleClipDragStart(e, 'audio')}
                                  >
                                      {/* Drag Handle Left */}
                                      <div className="absolute left-0 top-0 bottom-0 w-2 bg-purple-400/50 rounded-l-lg hover:bg-purple-400 cursor-ew-resize" />
                                      
                                      {/* Waveform Visual */}
                                      <svg className="absolute inset-0 w-full h-full text-white/20 pointer-events-none" viewBox="0 0 200 40" preserveAspectRatio="none">
                                          <path d="M0,20 Q10,5 20,20 T40,20 T60,20 T80,20 T100,20 T120,20 T140,20 T160,20 T180,20 T200,20" fill="none" stroke="currentColor" strokeWidth="2" />
                                      </svg>
                                      
                                      {/* Clip Content */}
                                      <div className="flex items-center gap-2 ml-3 relative z-10">
                                          <svg className="w-4 h-4 text-purple-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                          </svg>
                                          <span className="text-xs font-medium text-white">Voice</span>
                                      </div>
                                      
                                      {/* Duration Badge */}
                                      <div className="ml-auto bg-black/30 px-2 py-0.5 rounded text-[10px] font-mono text-purple-200 relative z-10">
                                          0:15
                                      </div>
                                      
                                      {/* Drag Handle Right */}
                                      <div className="absolute right-0 top-0 bottom-0 w-2 bg-purple-400/50 rounded-r-lg hover:bg-purple-400 cursor-ew-resize" />
                                  </div>
                             </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </div>

       <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          height: 8px;
          background-color: #16181d;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #333;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: #444;
        }
      `}</style>
    </>
  );
}

// Nav Icon Component
function NavIcon({ icon, label, active, onClick }) {
    return (
        <button 
            onClick={onClick}
            className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl transition group ${active ? 'bg-[#23232f] text-pink-500' : 'text-gray-500 hover:text-white hover:bg-[#23232f]'}`}
        >
            <div className="mb-1">
                {icon === 'script' && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
                {icon === 'elements' && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>}
                {icon === 'templates' && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" /></svg>}
                {icon === 'music' && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg>}
                {icon === 'captions' && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>}
                {icon === 'support' && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" /></svg>}
            </div>
            <span className="text-[10px] font-medium">{label}</span>
        </button>
    )
}
