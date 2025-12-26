import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { useAuth } from '../../contexts/AuthContext';
import { projectAPI, videoAPI, aiAPI } from '../../lib/api';
import ScriptPanel from '../../components/studio/ScriptPanel';
import EditorStage from '../studio/EditorStage';
import ArticleEditor from '../../components/studio/ArticleEditor';
import ArticleAIPanel from '../../components/studio/ArticleAIPanel';

export default function ProjectStudio() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { id } = router.query;

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('script'); // script, elements, templates, music, captions
  const [docSteps, setDocSteps] = useState([]);
  const [zoomPlan, setZoomPlan] = useState([]);
  
  // Canvas State
  const [canvasBackground, setCanvasBackground] = useState('#000000');
  const [aspectRatio, setAspectRatio] = useState('16/9');
  const [activeMenu, setActiveMenu] = useState(null); // 'background', 'aspectRatio', 'insert'
  const [canvasElements, setCanvasElements] = useState([]);
  
  // Background Menu State
  const [bgTab, setBgTab] = useState('Color');
  const [useSameBg, setUseSameBg] = useState(false);

  // Timeline State
  const [timelineClips, setTimelineClips] = useState([
      { id: 1, type: 'video', name: 'Slide 1', duration: 5, start: 0, color: 'bg-gray-700' }
  ]);
  const [audioClips, setAudioClips] = useState([]);
  const [selectedClipId, setSelectedClipId] = useState(null);
  const [activeModal, setActiveModal] = useState(null); // 'import-project'
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);

  // Mock Timeline State
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(300); // 5 mins
  const [isPlaying, setIsPlaying] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(50);

  // EditorStage State - for real-time text preview
  const [previewText, setPreviewText] = useState("Select a slide to see preview...");
  const [viewMode, setViewMode] = useState('canvas'); // 'canvas' or 'preview'

  // Article Editor State
  const [editorMode, setEditorMode] = useState('video'); // 'video' or 'article'
  const [articleContent, setArticleContent] = useState('');
  const [articleLoading, setArticleLoading] = useState(false);

  // Helper to save history
  const saveHistory = (newClips) => {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(newClips);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
  };

  // Derived State for Preview
  const activeClip = timelineClips.find(clip => currentTime >= clip.start && currentTime < clip.start + clip.duration) || timelineClips[0];

  const handleAddAudio = (audioData) => {
      // Calculate start time based on slide position or current time
      const startTime = audioData.slideId 
          ? timelineClips.find(c => c.id === audioData.slideId)?.start || currentTime
          : currentTime;
          
      const newClip = {
          id: Date.now(),
          type: 'audio',
          name: `Voiceover - ${audioData.text.substring(0, 10)}...`,
          src: audioData.url,
          duration: audioData.duration || 5,
          start: startTime,
          startTime: startTime, // For compatibility with video store
          color: 'bg-purple-600',
          slideId: audioData.slideId,
          voice: audioData.voice,
          text: audioData.text,
          wordAlignment: audioData.wordAlignment || [] // Word-level timing for karaoke
      };
      setAudioClips(prev => [...prev, newClip]);
      console.log('🔊 Added audio clip:', newClip.name, 'at', startTime.toFixed(2) + 's');
  };

  const handleAddClip = (type) => {
      const newClip = {
          id: Date.now(),
          type: 'video',
          name: type === 'blank' ? 'Blank Clip' : 'New Clip',
          duration: 5,
          start: timelineClips.length > 0 ? timelineClips[timelineClips.length - 1].start + timelineClips[timelineClips.length - 1].duration : 0,
          color: type === 'blank' ? 'bg-gray-800' : 'bg-blue-900'
      };
      const newClips = [...timelineClips, newClip];
      setTimelineClips(newClips);
      saveHistory(newClips);
      setActiveMenu(null);

      // Auto-select and jump to new clip
      setSelectedClipId(newClip.id);
      setCurrentTime(newClip.start);
  };

  const handleFileUpload = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setActiveMenu(null); // Close the dropdown

      // Check if it's a video file
      if (file.type.startsWith('video/')) {
          try {
              console.log('📹 Uploading video to project...');
              
              // Create FormData and upload to project
              const formData = new FormData();
              formData.append('video', file);
              
              const response = await projectAPI.uploadVideo(id, formData);
              const videoData = response.data.data;
              
              console.log('✅ Video uploaded:', videoData);
              
              // Update local project state with video URL
              setProject(prev => ({
                  ...prev,
                  videoUrl: videoData.videoUrl,
                  videoFilename: videoData.filename
              }));
              
              // Create a local URL for preview in timeline
              const localUrl = URL.createObjectURL(file);
              
              // Add clip to timeline
              const newClip = {
                  id: Date.now(),
                  type: 'video',
                  name: file.name,
                  src: localUrl,
                  duration: 10, // Default duration
                  start: timelineClips.length > 0 
                      ? timelineClips[timelineClips.length - 1].start + timelineClips[timelineClips.length - 1].duration 
                      : 0,
                  color: 'bg-purple-900',
                  serverUrl: videoData.videoUrl
              };
              
              const newClips = [...timelineClips, newClip];
              setTimelineClips(newClips);
              saveHistory(newClips);
              
              // Auto-select and jump to new clip
              setSelectedClipId(newClip.id);
              setCurrentTime(newClip.start);
              
              alert('✅ Video uploaded successfully! AI Rewrite now has access to this video.');
              
          } catch (err) {
              console.error('❌ Failed to upload video:', err);
              alert('Failed to upload video. Please try again.');
          }
      } else if (file.type.startsWith('image/')) {
          // For images, just add to timeline locally
          const localUrl = URL.createObjectURL(file);
          const newClip = {
              id: Date.now(),
              type: 'image',
              name: file.name,
              src: localUrl,
              duration: 5,
              start: timelineClips.length > 0 
                  ? timelineClips[timelineClips.length - 1].start + timelineClips[timelineClips.length - 1].duration 
                  : 0,
              color: 'bg-blue-600'
          };
          
          const newClips = [...timelineClips, newClip];
          setTimelineClips(newClips);
          saveHistory(newClips);
          
          // Auto-select and jump to new clip
          setSelectedClipId(newClip.id);
          setCurrentTime(newClip.start);
      }

      // Reset the input
      e.target.value = '';
  };

  const handleSplit = () => {
      if (!selectedClipId) return;
      const clipIndex = timelineClips.findIndex(c => c.id === selectedClipId);
      if (clipIndex === -1) return;

      const clip = timelineClips[clipIndex];
      
      // Calculate split point relative to clip start
      const relativeSplitPoint = currentTime - clip.start;

      // Validate split point (must be within the clip, with some buffer)
      if (relativeSplitPoint <= 0.1 || relativeSplitPoint >= clip.duration - 0.1) {
          return; // Too close to edge
      }
      
      const clip1 = { ...clip, duration: relativeSplitPoint };
      const clip2 = { 
          ...clip, 
          id: Date.now(), 
          start: clip.start + relativeSplitPoint, 
          duration: clip.duration - relativeSplitPoint,
          name: `${clip.name} (Part 2)`
      };

      const newClips = [...timelineClips];
      newClips.splice(clipIndex, 1, clip1, clip2);
      
      // Adjust subsequent clips
      for (let i = clipIndex + 2; i < newClips.length; i++) {
          newClips[i].start = newClips[i-1].start + newClips[i-1].duration;
      }

      setTimelineClips(newClips);
      saveHistory(newClips);
  };

  const handleDelete = () => {
      if (!selectedClipId) return;
      const newClips = timelineClips.filter(c => c.id !== selectedClipId);
      
      // Recalculate starts
      let currentStart = 0;
      newClips.forEach(clip => {
          clip.start = currentStart;
          currentStart += clip.duration;
      });

      setTimelineClips(newClips);
      setSelectedClipId(null);
      saveHistory(newClips);
  };

  const handleUndo = () => {
      if (historyIndex > 0) {
          setHistoryIndex(historyIndex - 1);
          setTimelineClips(history[historyIndex - 1]);
      }
  };

  const handleRedo = () => {
      if (historyIndex < history.length - 1) {
          setHistoryIndex(historyIndex + 1);
          setTimelineClips(history[historyIndex + 1]);
      }
  };

  // Drag and Drop Handlers
  const handleDragStart = (e, index) => {
      e.dataTransfer.setData('clipIndex', index);
  };

  const handleDrop = (e, dropIndex) => {
      const dragIndex = parseInt(e.dataTransfer.getData('clipIndex'));
      if (dragIndex === dropIndex) return;

      const newClips = [...timelineClips];
      const [draggedClip] = newClips.splice(dragIndex, 1);
      newClips.splice(dropIndex, 0, draggedClip);

      // Recalculate starts
      let currentStart = 0;
      newClips.forEach(clip => {
          clip.start = currentStart;
          currentStart += clip.duration;
      });

      setTimelineClips(newClips);
      saveHistory(newClips);
  };

  const handleDragOver = (e) => {
      e.preventDefault();
  };



  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (id && user) {
      loadProject();
    }
  }, [id, user]);

  useEffect(() => {
    const handleAIComplete = (e) => {
        const data = e.detail;
        if (data.docSteps) setDocSteps(data.docSteps);
        if (data.zoomPlan) setZoomPlan(data.zoomPlan);
    };
    
    window.addEventListener('ai-process-complete', handleAIComplete);
    return () => window.removeEventListener('ai-process-complete', handleAIComplete);
  }, []);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
        if (activeMenu && !event.target.closest('.toolbar-menu') && !event.target.closest('.toolbar-btn')) {
            setActiveMenu(null);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeMenu]);

  // Playback timer - advances currentTime when playing
  useEffect(() => {
    let animationFrameId;
    let lastTime = performance.now();

    const tick = (now) => {
      if (!isPlaying) return;

      const deltaTime = (now - lastTime) / 1000; // Convert to seconds
      lastTime = now;

      setCurrentTime((prevTime) => {
        const newTime = prevTime + deltaTime;
        // Stop at the end of the timeline
        const totalDuration = timelineClips.reduce((sum, clip) => sum + clip.duration, 0);
        if (newTime >= totalDuration) {
          setIsPlaying(false);
          return totalDuration;
        }
        return newTime;
      });

      animationFrameId = requestAnimationFrame(tick);
    };

    if (isPlaying) {
      lastTime = performance.now();
      animationFrameId = requestAnimationFrame(tick);
    }

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isPlaying, timelineClips]);

  const loadProject = async () => {
    try {
      const response = await projectAPI.getById(id);
      const projectData = response.data.data;
      setProject(projectData);
      
      if (projectData.docSteps) setDocSteps(projectData.docSteps);
      if (projectData.zoomPlan) setZoomPlan(projectData.zoomPlan);
      
      // Convert project slides to timeline clips
      if (projectData.slides && projectData.slides.length > 0) {
        const slidesAsClips = projectData.slides.map((slide, index) => ({
          id: Date.now() + index,
          type: slide.type === 'pdf' ? 'image' : slide.type || 'image',
          name: slide.name || `Slide ${index + 1}`,
          src: slide.url ? `${(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace('/api', '')}${slide.url}` : null,
          duration: 5,
          start: index * 5,
          color: slide.type === 'pdf' ? 'bg-purple-700' : 'bg-blue-700'
        }));
        setTimelineClips(slidesAsClips);
        console.log('📄 Loaded', slidesAsClips.length, 'slides from project');
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Failed to load project:', error);
      setLoading(false);
    }
  };

  const handleInsert = (type) => {
      const newElement = {
          id: Date.now(),
          type,
          x: 50, // Center-ish
          y: 50,
          content: type === 'Text' ? 'New Text' : type,
      };
      setCanvasElements([...canvasElements, newElement]);
      setActiveMenu(null);
  };

  if (authLoading || loading) {
    return <div className="min-h-screen bg-[#0f1115] flex items-center justify-center text-white">Loading Studio...</div>;
  }

  return (
    <>
      <Head>
        <title>{project?.name || 'Untitled'} - Clueso Studio</title>
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
                    <span className="font-semibold text-sm">{project?.name || 'Untitled Project'}</span>
                    <span className="text-xs text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">Project</span>
                </div>
            </div>

            <div className="flex items-center space-x-3">
                 <div className="flex items-center bg-[#1a1d21] rounded-lg p-0.5 border border-gray-800">
                    <button 
                        onClick={() => setEditorMode('video')}
                        className={`px-3 py-1.5 text-xs font-medium rounded transition ${editorMode === 'video' ? 'bg-[#23232f] text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                    >
                        Video
                    </button>
                    <button 
                        onClick={() => setEditorMode('article')}
                        className={`px-3 py-1.5 text-xs font-medium rounded transition ${editorMode === 'article' ? 'bg-[#23232f] text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                    >
                        Article
                    </button>
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
            {/* ARTICLE MODE */}
            {editorMode === 'article' && (
                <>
                    {/* Article Editor - Main Content */}
                    <ArticleEditor 
                        content={articleContent}
                        onChange={setArticleContent}
                        projectName={project?.name}
                        isLoading={articleLoading}
                    />
                    
                    {/* AI Assistant Panel - Right Sidebar */}
                    <ArticleAIPanel 
                        projectId={id}
                        videoId={project?.videoId || id}
                        onRewrite={async () => {
                            setArticleLoading(true);
                            try {
                                // Generate article from project data
                                const response = await aiAPI.processRecording({
                                    projectId: id,
                                    rawTranscript: project?.polishedScript || '',
                                    styleGuidelines: 'Professional technical documentation',
                                    docUseCase: 'Step-by-step guide'
                                });
                                if (response.data.data?.docSteps) {
                                    // Convert steps to article format
                                    const article = response.data.data.docSteps
                                        .map(step => `<h2>${step.title || step.step}</h2><p>${step.description}</p>`)
                                        .join('\n');
                                    setArticleContent(article);
                                }
                            } catch (error) {
                                console.error('Failed to generate article:', error);
                                alert('Failed to generate article. Please try again.');
                            } finally {
                                setArticleLoading(false);
                            }
                        }}
                        onImprove={async (instruction) => {
                            setArticleLoading(true);
                            try {
                                // Use AI to improve article based on instruction
                                console.log('Improving article with:', instruction);
                                // For now, just log - actual implementation would call backend
                                alert(`AI will: ${instruction}`);
                            } catch (error) {
                                console.error('Failed to improve article:', error);
                            } finally {
                                setArticleLoading(false);
                            }
                        }}
                    />
                </>
            )}

            {/* VIDEO MODE */}
            {editorMode === 'video' && (
            <>
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
                            videoId={project?.videoId || id}
                            videoUrl={project?.videoUrl}
                            initialScript={project?.polishedScript}
                            currentTime={currentTime}
                            isPlaying={isPlaying}
                            onAddAudio={handleAddAudio}
                            setGenerating={setIsProcessingAudio}
                            audioClips={audioClips}
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
                    
                    {/* Background Button */}
                    <div className="relative">
                        <button 
                            className={`toolbar-btn flex items-center space-x-2 text-xs font-medium hover:text-white ${activeMenu === 'background' ? 'text-white' : 'text-gray-300'}`}
                            onClick={() => setActiveMenu(activeMenu === 'background' ? null : 'background')}
                        >
                            <div className="w-4 h-4 rounded-full border border-gray-600" style={{ backgroundColor: canvasBackground }}></div>
                            <span>Background</span>
                        </button>
                        {activeMenu === 'background' && (
                            <div className="toolbar-menu absolute top-full left-0 mt-2 bg-[#1a1d21] border border-gray-800 rounded-xl shadow-2xl w-80 z-20 overflow-hidden">
                                {/* Header */}
                                <div className="flex items-center justify-between p-4 border-b border-gray-800">
                                    <h3 className="text-sm font-bold text-white">Background</h3>
                                    <button onClick={() => setActiveMenu(null)} className="text-gray-400 hover:text-white">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>

                                {/* Settings */}
                                <div className="p-4 border-b border-gray-800">
                                    <h4 className="text-xs font-bold text-gray-500 mb-3 uppercase">SETTINGS</h4>
                                    <div className="bg-[#23232f] rounded-lg p-3 flex items-center justify-between">
                                        <span className="text-sm text-gray-300">Use same background for all clips</span>
                                        <button 
                                            onClick={() => setUseSameBg(!useSameBg)}
                                            className={`w-10 h-5 rounded-full relative transition-colors ${useSameBg ? 'bg-pink-600' : 'bg-gray-600'}`}
                                        >
                                            <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-transform ${useSameBg ? 'left-6' : 'left-1'}`}></div>
                                        </button>
                                    </div>
                                </div>

                                {/* Backgrounds */}
                                <div className="p-4">
                                    <h4 className="text-xs font-bold text-gray-500 mb-3 uppercase">BACKGROUNDS</h4>
                                    
                                    <button className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium mb-4 flex items-center justify-center space-x-2 transition-colors">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                        <span>Upload media</span>
                                    </button>

                                    {/* Tabs */}
                                    <div className="flex space-x-2 mb-4">
                                        <button className="p-2 text-gray-400 hover:text-white rounded bg-[#23232f]"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg></button>
                                        {['Color', 'Image', 'Video'].map(tab => (
                                            <button 
                                                key={tab}
                                                onClick={() => setBgTab(tab)}
                                                className={`px-3 py-1.5 text-sm rounded transition-colors ${bgTab === tab ? 'bg-[#23232f] text-white border border-gray-600' : 'text-gray-500 hover:text-gray-300'}`}
                                            >
                                                {tab}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Tab Content (Color) */}
                                    {bgTab === 'Color' && (
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-white font-medium">Primary Color</span>
                                                <div className="flex items-center space-x-2">
                                                    <div className="w-6 h-6 rounded-full border border-gray-600" style={{ backgroundColor: canvasBackground }}></div>
                                                    <span className="text-xs text-gray-400 font-mono uppercase">{canvasBackground}</span>
                                                </div>
                                            </div>
                                            
                                            <div className="grid grid-cols-5 gap-2">
                                                {['#000000', '#ffffff', '#1f2937', '#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#6366f1'].map(color => (
                                                    <button 
                                                        key={color}
                                                        className="w-8 h-8 rounded-full border border-gray-700 hover:scale-110 transition focus:ring-2 ring-offset-2 ring-offset-[#1a1d21] ring-blue-500"
                                                        style={{ backgroundColor: color }}
                                                        onClick={() => setCanvasBackground(color)}
                                                    />
                                                ))}
                                                <label className="w-8 h-8 rounded-full border border-gray-700 flex items-center justify-center text-gray-400 hover:text-white bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-500 cursor-pointer relative overflow-hidden">
                                                    <input 
                                                        type="color" 
                                                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                                        value={canvasBackground}
                                                        onChange={(e) => setCanvasBackground(e.target.value)}
                                                    />
                                                    <svg className="w-4 h-4 text-white drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                                </label>
                                            </div>
                                        </div>
                                    )}
                                    {bgTab !== 'Color' && (
                                        <div className="text-center py-8 text-gray-500 text-xs">
                                            No {bgTab.toLowerCase()}s available
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="w-px h-4 bg-gray-700"></div>

                    {/* Aspect Ratio Button */}
                    <div className="relative">
                        <button 
                            className={`toolbar-btn flex items-center space-x-2 text-xs font-medium hover:text-white ${activeMenu === 'aspectRatio' ? 'text-white' : 'text-gray-300'}`}
                            onClick={() => setActiveMenu(activeMenu === 'aspectRatio' ? null : 'aspectRatio')}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" /></svg>
                            <span>{aspectRatio.replace('/', ':')}</span>
                        </button>
                        {activeMenu === 'aspectRatio' && (
                            <div className="toolbar-menu absolute top-full left-1/2 transform -translate-x-1/2 mt-2 bg-[#1a1d21] border border-gray-800 rounded-lg shadow-xl py-1 w-32 z-20">
                                {['16/9', '9/16', '1/1', '4/3'].map(ratio => (
                                    <button 
                                        key={ratio}
                                        className="w-full text-left px-4 py-2 text-xs text-gray-300 hover:bg-gray-800 hover:text-white"
                                        onClick={() => { setAspectRatio(ratio); setActiveMenu(null); }}
                                    >
                                        {ratio.replace('/', ':')}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="w-px h-4 bg-gray-700"></div>

                    {/* Insert Button */}
                    <div className="relative">
                        <button 
                            className={`toolbar-btn flex items-center space-x-2 text-xs font-medium hover:text-white ${activeMenu === 'insert' ? 'text-white' : 'text-gray-300'}`}
                            onClick={() => setActiveMenu(activeMenu === 'insert' ? null : 'insert')}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                            <span>Insert</span>
                        </button>
                        {activeMenu === 'insert' && (
                            <div className="toolbar-menu absolute top-full right-0 mt-2 bg-[#1a1d21] border border-gray-800 rounded-lg shadow-xl py-1 w-40 z-20">
                                {['Clip', 'Zoom', 'Rectangle', 'Text', 'Image', 'Arrow', 'Callout', 'Spotlight', 'Music'].map(item => (
                                    <button 
                                        key={item}
                                        className="w-full text-left px-4 py-2 text-xs text-gray-300 hover:bg-gray-800 hover:text-white flex items-center space-x-2"
                                        onClick={() => handleInsert(item)}
                                    >
                                        {/* Simple icons for menu items */}
                                        <div className="w-4 h-4 bg-gray-700 rounded-sm flex items-center justify-center text-[8px]">{item[0]}</div>
                                        <span>{item}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="w-px h-4 bg-gray-700"></div>

                    {/* View Mode Toggle */}
                    <div className="flex items-center bg-[#23232f] rounded-lg p-0.5 border border-gray-700">
                        <button 
                            onClick={() => setViewMode('canvas')}
                            className={`px-3 py-1 text-xs font-medium rounded transition ${viewMode === 'canvas' ? 'bg-pink-600 text-white' : 'text-gray-400 hover:text-white'}`}
                        >
                            Canvas
                        </button>
                        <button 
                            onClick={() => setViewMode('preview')}
                            className={`px-3 py-1 text-xs font-medium rounded transition ${viewMode === 'preview' ? 'bg-pink-600 text-white' : 'text-gray-400 hover:text-white'}`}
                        >
                            Preview
                        </button>
                    </div>
                 </div>

                {/* Video Preview Canvas */}
                <div className="flex-1 flex items-center justify-center p-8 overflow-hidden relative">
                    {/* Loading Overlay */}
                    {isProcessingAudio && (
                        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm">
                            <div className="bg-[#1a1d21] p-6 rounded-xl border border-gray-700 shadow-2xl flex flex-col items-center space-y-4">
                                <div className="relative w-16 h-16">
                                    <div className="absolute inset-0 border-4 border-gray-700 rounded-full"></div>
                                    <div className="absolute inset-0 border-4 border-pink-500 rounded-full border-t-transparent animate-spin"></div>
                                </div>
                                <div className="text-center">
                                    <h3 className="text-white font-bold text-lg">Generating Speech</h3>
                                    <p className="text-gray-400 text-sm">AI is synthesizing voiceover...</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* EditorStage Preview Mode */}
                    {viewMode === 'preview' && (
                        <div className="w-full h-full flex items-center justify-center">
                            <EditorStage 
                                videoUrl={project?.videoUrl || ""}
                                activeText={previewText}
                                isPlaying={isPlaying}
                                currentTime={currentTime}
                            />
                        </div>
                    )}

                    {/* Canvas Mode - Original Preview */}
                    {viewMode === 'canvas' && (
                    <div className="flex space-x-4 w-full max-w-6xl h-full items-center justify-center">
                        {/* Video Player Container */}
                        <div 
                            className="bg-white rounded-lg shadow-2xl relative overflow-hidden group transition-all duration-300"
                            style={{ 
                                aspectRatio: aspectRatio,
                                backgroundColor: canvasBackground,
                                height: aspectRatio === '9/16' ? '90%' : 'auto',
                                width: aspectRatio === '16/9' ? '100%' : 'auto',
                                maxWidth: '100%',
                                maxHeight: '100%'
                            }}
                        >
                            {/* Video Content */}
                            <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
                                {activeClip ? (
                                    <div className="w-full h-full flex items-center justify-center bg-black">
                                        {activeClip.type === 'video' && (
                                            activeClip.src ? (
                                                <video 
                                                    src={activeClip.src} 
                                                    className="w-full h-full object-contain"
                                                    ref={(el) => {
                                                        if (el) {
                                                            el.currentTime = Math.max(0, currentTime - activeClip.start);
                                                            if (isPlaying) el.play(); else el.pause();
                                                        }
                                                    }}
                                                />
                                            ) : (
                                                <div className="text-center">
                                                    <div className={`w-32 h-32 mx-auto mb-4 rounded-lg flex items-center justify-center ${activeClip.color || 'bg-gray-800'}`}>
                                                        <svg className="w-12 h-12 text-white opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                                    </div>
                                                    <h3 className="text-xl font-bold text-white">{activeClip.name}</h3>
                                                    <p className="text-gray-400 text-sm mt-2">
                                                        Time: {Math.floor(currentTime)}s / Duration: {activeClip.duration}s
                                                    </p>
                                                </div>
                                            )
                                        )}
                                        {activeClip.type === 'image' && (
                                            <img src={activeClip.src || "/placeholder.png"} alt={activeClip.name} className="max-w-full max-h-full object-contain" />
                                        )}
                                    </div>
                                ) : (
                                    /* Placeholder if no clip is active */
                                    <div className="text-center">
                                        {canvasElements.length === 0 && (
                                            <>
                                                <svg className="w-16 h-16 text-gray-700 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                                <p className="text-gray-500 text-sm">No Clip Selected</p>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Render Inserted Elements */}
                            {canvasElements.map((el) => (
                                <div 
                                    key={el.id}
                                    className="absolute border-2 border-blue-500 bg-blue-500/20 text-white px-2 py-1 rounded cursor-move"
                                    style={{ left: `${el.x}%`, top: `${el.y}%`, transform: 'translate(-50%, -50%)' }}
                                >
                                    {el.type === 'Text' ? el.content : el.type}
                                </div>
                            ))}

                            {/* Audio Players (Hidden) */}
                            {audioClips.map(clip => (
                                <audio
                                    key={clip.id}
                                    src={clip.src}
                                    ref={el => {
                                        if (el) {
                                            const relativeTime = currentTime - clip.start;
                                            if (isPlaying && relativeTime >= 0 && relativeTime < clip.duration) {
                                                if (el.paused) {
                                                    el.currentTime = relativeTime;
                                                    el.play().catch(e => console.error("Audio play failed", e));
                                                } else if (Math.abs(el.currentTime - relativeTime) > 0.5) {
                                                     el.currentTime = relativeTime;
                                                }
                                            } else {
                                                if (!el.paused) el.pause();
                                            }
                                        }
                                    }}
                                />
                            ))}

                            {/* Zoom Markers Overlay */}
                            {zoomPlan.map((zoom, idx) => (
                                <div 
                                    key={idx}
                                    className="absolute w-4 h-4 bg-yellow-500 rounded-full border-2 border-white shadow-lg transform -translate-x-1/2 -translate-y-1/2 cursor-pointer hover:scale-125 transition"
                                    style={{ left: `${(zoom.timestamp / duration) * 100}%`, bottom: '10px' }}
                                    title={`Zoom: ${zoom.zoom_level}% - ${zoom.reason}`}
                                ></div>
                            ))}

                            {/* Hover overlay hint */}
                            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition duration-300 pointer-events-none">
                                <div className="bg-black/80 backdrop-blur text-white text-xs px-3 py-1.5 rounded-full border border-gray-700 shadow-lg">
                                    Click on "Generate Speech" to update the voiceover
                                </div>
                            </div>
                        </div>

                        {/* Documentation Side Panel (if available) */}
                        {docSteps.length > 0 && (
                            <div className="w-80 bg-[#16181d] border border-gray-800 rounded-lg overflow-hidden flex flex-col">
                                <div className="p-4 border-b border-gray-800 bg-[#1a1d21]">
                                    <h3 className="font-bold text-white">Documentation</h3>
                                </div>
                                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                                    {docSteps.map((step, idx) => (
                                        <div key={idx} className="flex space-x-3">
                                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-900/50 text-purple-300 flex items-center justify-center text-xs font-bold border border-purple-500/30">
                                                {step.step}
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-300">{step.description}</p>
                                                                                                <span className="text-xs text-gray-600 font-mono">
                                                                                                    {typeof step.timestamp === 'number' && !isNaN(step.timestamp)
                                                                                                        ? new Date(step.timestamp * 1000).toISOString().substr(14, 5)
                                                                                                        : '--:--'}
                                                                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    )}
                </div>

                {/* Timeline Area (Bottom) */}
                <div className="h-48 bg-[#16181d] border-t border-gray-800 flex flex-col relative">
                    
                    {/* Import Project Modal */}
                    {activeModal === 'import-project' && (
                        <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center">
                            <div className="bg-[#1a1d21] border border-gray-700 rounded-lg p-6 w-96 shadow-2xl">
                                <h3 className="text-lg font-bold text-white mb-4">Import from Project</h3>
                                <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
                                    {[1, 2, 3].map(i => (
                                        <button 
                                            key={i}
                                            className="w-full text-left p-3 rounded bg-[#23232f] hover:bg-[#2d3039] text-sm text-gray-300 flex items-center justify-between group"
                                            onClick={() => {
                                                handleAddClip('import');
                                                setActiveModal(null);
                                            }}
                                        >
                                            <span>Previous Project {i}</span>
                                            <span className="text-xs text-gray-500 group-hover:text-white">Import</span>
                                        </button>
                                    ))}
                                </div>
                                <button 
                                    className="w-full py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm"
                                    onClick={() => setActiveModal(null)}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Timeline Controls */}
                    <div className="h-10 border-b border-gray-800 flex items-center justify-between px-4">
                         <div className="flex items-center space-x-2">
                            <button 
                                onClick={handleSplit}
                                disabled={!selectedClipId}
                                className="text-xs font-medium text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-white/5 flex items-center space-x-1 disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" /></svg>
                                <span>Split</span>
                            </button>

                            <button 
                                onClick={handleDelete}
                                disabled={!selectedClipId}
                                className="text-xs font-medium text-gray-400 hover:text-red-400 px-2 py-1 rounded hover:bg-white/5 flex items-center space-x-1 disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                <span>Delete</span>
                            </button>
                            
                            {/* Add Clip Dropdown */}
                            <div className="relative">
                                <button 
                                    className={`text-xs font-medium hover:text-white px-2 py-1 rounded hover:bg-white/5 flex items-center space-x-1 ${activeMenu === 'addClip' ? 'text-white' : 'text-gray-400'}`}
                                    onClick={() => setActiveMenu(activeMenu === 'addClip' ? null : 'addClip')}
                                >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                    <span>Add Clip</span>
                                </button>
                                {activeMenu === 'addClip' && (
                                    <div className="toolbar-menu absolute bottom-full left-0 mb-2 bg-[#1a1d21] border border-gray-800 rounded-lg shadow-xl py-1 w-48 z-20">
                                        <label className="w-full text-left px-4 py-2 text-xs text-gray-300 hover:bg-gray-800 hover:text-white flex items-center space-x-2 cursor-pointer">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                            <span>Upload from Device</span>
                                            <input type="file" className="hidden" accept="video/*,image/*" onChange={handleFileUpload} />
                                        </label>
                                        <button 
                                            className="w-full text-left px-4 py-2 text-xs text-gray-300 hover:bg-gray-800 hover:text-white flex items-center space-x-2"
                                            onClick={() => handleAddClip('blank')}
                                        >
                                            <div className="w-4 h-4 border border-gray-500 rounded-sm"></div>
                                            <span>Blank Clip</span>
                                        </button>
                                        <button 
                                            className="w-full text-left px-4 py-2 text-xs text-gray-300 hover:bg-gray-800 hover:text-white flex items-center space-x-2"
                                            onClick={() => { setActiveModal('import-project'); setActiveMenu(null); }}
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg>
                                            <span>Import Project</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                         </div>

                         <div className="flex items-center space-x-4">
                             <button 
                                onClick={() => setCurrentTime(Math.max(0, currentTime - 5))}
                                className="p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-white/10"
                                title="Skip Back 5s"
                             >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" /></svg>
                             </button>

                             <button 
                                onClick={() => setIsPlaying(!isPlaying)}
                                className="p-3 rounded-full bg-pink-600 text-white hover:bg-pink-500 shadow-lg transform hover:scale-105 transition flex items-center justify-center"
                             >
                                {isPlaying ? (
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                                ) : (
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                                )}
                             </button>

                             <button 
                                onClick={() => setCurrentTime(Math.min(duration, currentTime + 5))}
                                className="p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-white/10"
                                title="Skip Forward 5s"
                             >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
                             </button>

                             <span className="text-xs font-mono text-gray-400 min-w-[100px] text-center">
                                                                {typeof currentTime === 'number' && !isNaN(currentTime)
                                                                    ? new Date(currentTime * 1000).toISOString().substr(11, 8)
                                                                    : '--:--:--'}
                                                                {' / '}
                                                                {typeof duration === 'number' && !isNaN(duration)
                                                                    ? new Date(duration * 1000).toISOString().substr(11, 8)
                                                                    : '--:--:--'}
                             </span>
                         </div>

                         <div className="flex items-center space-x-3">
                             <div className="flex items-center bg-[#23232f] rounded-lg p-0.5">
                                 <button 
                                    onClick={handleUndo}
                                    disabled={historyIndex <= 0}
                                    className="p-1.5 rounded text-gray-400 hover:text-white disabled:opacity-30 hover:bg-white/5"
                                    title="Undo"
                                 >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                                 </button>
                                 <div className="w-px h-4 bg-gray-700 mx-1"></div>
                                 <button 
                                    onClick={handleRedo}
                                    disabled={historyIndex >= history.length - 1}
                                    className="p-1.5 rounded text-gray-400 hover:text-white disabled:opacity-30 hover:bg-white/5"
                                    title="Redo"
                                 >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" /></svg>
                                 </button>
                             </div>

                             <div className="w-px h-6 bg-gray-800"></div>

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
                             <div className="h-16 bg-gray-800/50 rounded-lg relative overflow-hidden border border-gray-700/50 group flex">
                                 {/* Striped Pattern Background */}
                                 <div className="absolute inset-0 opacity-10 pointer-events-none" 
                                    style={{backgroundImage: 'repeating-linear-gradient(45deg, #000 25%, transparent 25%, transparent 75%, #000 75%, #000), repeating-linear-gradient(45deg, #000 25%, #222 25%, #222 75%, #000 75%, #000)', backgroundPosition: '0 0, 10px 10px', backgroundSize: '20px 20px'}}>
                                 </div>
                                 
                                 {/* Clips */}
                                 {timelineClips.map((clip, index) => (
                                     <div 
                                        key={clip.id}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, index)}
                                        onDragOver={handleDragOver}
                                        onDrop={(e) => handleDrop(e, index)}
                                        onClick={() => { setSelectedClipId(clip.id); setCurrentTime(clip.start); }}
                                        className={`relative h-full rounded-lg border-r border-gray-600 flex items-center cursor-move transition-all overflow-hidden ${selectedClipId === clip.id ? 'ring-2 ring-pink-500 z-10' : 'opacity-90 hover:opacity-100'}`}
                                        style={{ width: `${clip.duration * 20}px` }} // Mock width scaling
                                     >
                                         {/* Filmstrip Effect */}
                                         <div className="absolute inset-0 flex items-center overflow-hidden bg-gray-900">
                                             {/* Repeating thumbnails */}
                                             {Array.from({ length: Math.ceil((clip.duration * 20) / 64) }).map((_, i) => (
                                                 <div key={i} className="w-16 h-full flex-shrink-0 border-r border-gray-800 relative">
                                                     {clip.type === 'video' ? (
                                                         <div className="w-full h-full bg-gray-800 flex items-center justify-center overflow-hidden">
                                                             {/* Mock Thumbnail Content */}
                                                             <div className="w-full h-full opacity-50 bg-gradient-to-br from-gray-700 to-gray-900 transform scale-150">
                                                                 {/* Random shapes to simulate content */}
                                                                 <div className="absolute top-2 left-2 w-4 h-4 bg-gray-600 rounded-full"></div>
                                                                 <div className="absolute bottom-2 right-2 w-8 h-2 bg-gray-600 rounded"></div>
                                                             </div>
                                                         </div>
                                                     ) : (
                                                         <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                                                             <span className="text-[8px] text-gray-500">Blank</span>
                                                         </div>
                                                     )}
                                                 </div>
                                             ))}
                                         </div>

                                         {/* Clip Label Overlay */}
                                         <div className="absolute bottom-1 left-1 bg-black/60 px-1.5 py-0.5 rounded text-[9px] font-mono text-white truncate max-w-full z-10 backdrop-blur-sm border border-white/10">
                                             {clip.name}
                                         </div>
                                     </div>
                                 ))}
                             </div>

                             {/* Audio Track */}
                             <div className="h-12 bg-purple-900/20 rounded-lg relative overflow-hidden border border-purple-500/30">
                                  <div className="absolute left-0 top-0 bottom-0 w-full flex items-center">
                                      {audioClips.map(clip => (
                                          <div 
                                            key={clip.id}
                                            className="absolute h-full bg-purple-600/50 border border-purple-400 rounded flex items-center justify-center text-[10px] text-white truncate px-1"
                                            style={{ 
                                                left: `${(clip.startTime / (duration || 1)) * 100}%`,
                                                width: `${(clip.duration / (duration || 1)) * 100}%`
                                            }}
                                            title={clip.label || 'Audio Clip'}
                                          >
                                              <span className="truncate">{clip.label || 'Audio'}</span>
                                          </div>
                                      ))}
                                  </div>
                             </div>
                        </div>
                    </div>
                </div>
            </div>
            </>
            )}
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

export async function getServerSideProps(context) {
  return {
    props: {}, // will be passed to the page component as props
  }
}
