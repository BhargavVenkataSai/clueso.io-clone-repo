import { useState, useEffect } from 'react';
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

  // NEW STATE for Text Sync with EditorStage
  const [previewText, setPreviewText] = useState("Let's dive in.");

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
                            onActiveTextChange={(text) => setPreviewText(text)}
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

                {/* Video Preview Canvas - REPLACED WITH EditorStage */}
                <EditorStage 
                    videoUrl={video?.files?.original?.path || video?.filename ? `/uploads/${video.filename}` : ""}
                    activeText={previewText}
                    isPlaying={isPlaying}
                    currentTime={currentTime}
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
                                onClick={() => setIsPlaying(!isPlaying)}
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
                    <div className="flex-1 overflow-x-auto relative custom-scrollbar">
                        {/* Time Ruler */}
                        <div className="h-6 border-b border-gray-800 flex items-end px-4 text-[10px] text-gray-500 select-none">
                            <span className="mr-16">1s</span>
                            <span className="mr-16">2s</span>
                            <span className="mr-16">3s</span>
                            <span className="mr-16">4s</span>
                            <div className="absolute top-0 bottom-0 left-[50px] w-px bg-pink-500 z-10">
                                <div className="absolute -top-1 -left-1.5 w-3 h-3 bg-pink-500 rotate-45 transform"></div>
                            </div>
                        </div>

                        {/* Tracks */}
                        <div className="p-4 space-y-2">
                             {/* Video Track */}
                             <div className="h-16 bg-gray-800/50 rounded-lg relative overflow-hidden border border-gray-700/50 group">
                                 {/* Striped Pattern Background */}
                                 <div className="absolute inset-0 opacity-10" 
                                    style={{backgroundImage: 'repeating-linear-gradient(45deg, #000 25%, transparent 25%, transparent 75%, #000 75%, #000), repeating-linear-gradient(45deg, #000 25%, #222 25%, #222 75%, #000 75%, #000)', backgroundPosition: '0 0, 10px 10px', backgroundSize: '20px 20px'}}>
                                 </div>
                                 
                                 {/* Clip */}
                                 <div className="absolute left-0 top-0 bottom-0 w-64 bg-gray-700 rounded-l-lg border-r border-gray-600 flex items-center px-4">
                                     <div className="bg-black/30 px-2 py-0.5 rounded text-[10px] font-mono text-gray-300">
                                         1 Slide
                                     </div>
                                 </div>
                             </div>

                             {/* Audio Track */}
                             <div className="h-12 bg-purple-900/20 rounded-lg relative overflow-hidden border border-purple-500/30">
                                  <div className="absolute left-0 top-0 bottom-0 w-64 bg-purple-900/40 rounded-l-lg flex items-center justify-center">
                                      <svg className="w-full h-8 text-purple-500 opacity-50" viewBox="0 0 100 20" preserveAspectRatio="none">
                                          <path d="M0,10 Q10,20 20,10 T40,10 T60,10 T80,10 T100,10" fill="none" stroke="currentColor" strokeWidth="1" />
                                      </svg>
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
