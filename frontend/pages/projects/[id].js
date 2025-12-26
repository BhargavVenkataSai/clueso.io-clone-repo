import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import { useAuth } from "../../contexts/AuthContext";
import { projectAPI, videoAPI, aiAPI } from "../../lib/api";
import ScriptPanel from "../../components/studio/ScriptPanel";
import EditorStage from "../studio/EditorStage";
import ArticleEditor from "../../components/studio/ArticleEditor";
import ArticleAIPanel from "../../components/studio/ArticleAIPanel";

export default function ProjectStudio() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { id } = router.query;

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("script"); // script, elements, templates, music, captions
  const [editorMode, setEditorMode] = useState("video"); // 'video' or 'article'

  // Canvas & Preview State
  const [canvasBackground, setCanvasBackground] = useState("#000000");
  const [aspectRatio, setAspectRatio] = useState("16/9");
  const [activeMenu, setActiveMenu] = useState(null);
  const [viewMode, setViewMode] = useState("canvas"); // 'canvas' or 'preview'
  const [previewText, setPreviewText] = useState("");

  // Timeline State
  const [timelineClips, setTimelineClips] = useState([
    {
      id: 1,
      type: "placeholder", // Changed from "video" to prevent NotSupportedError
      name: "Slide 1",
      src: null,
      duration: 5,
      start: 0,
      color: "bg-gray-700",
    },
  ]);
  const [audioClips, setAudioClips] = useState([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedClipId, setSelectedClipId] = useState(null);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const [contextMenu, setContextMenu] = useState(null); // { x, y, clipId }
  const fileInputRef = useRef(null);

  // History State
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Article State
  const [articleContent, setArticleContent] = useState("");
  const [articleLoading, setArticleLoading] = useState(false);

  const videoRef = useRef(null);

  // Derive active clip
  const activeClip =
    timelineClips.find(
      (clip) =>
        currentTime >= clip.start && currentTime < clip.start + clip.duration
    ) || timelineClips[0];

  // Auth Guard
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Load Project Data
  useEffect(() => {
    if (id && user) {
      loadProject();
    }
  }, [id, user]);

  const loadProject = async () => {
    try {
      setLoading(true);
      const response = await projectAPI.getById(id);
      const projectData = response?.data?.data;
      if (!projectData) {
        throw new Error("Project data not found");
      }
      setProject(projectData);

      // Convert project slides to timeline clips
      if (projectData.slides && projectData.slides.length > 0) {
        // Only overwrite if we are at initial state (1 default clip)
        setTimelineClips(prev => {
          if (prev.length > 1) return prev;
          
          const slidesAsClips = projectData.slides.map((slide, index) => ({
            id: slide.id || `slide-${index}`,
            type: slide.type === "pdf" ? "image" : slide.type || "image",
            name: slide.name || `Slide ${index + 1}`,
            src: slide.url
              ? `${(
                  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
                ).replace("/api", "")}${slide.url}`
              : null,
            duration: slide.duration || 5,
            start: index * 5,
            color: slide.type === "pdf" ? "bg-purple-700" : "bg-blue-700",
          }));
          return slidesAsClips;
        });
      }

      setLoading(false);
    } catch (error) {
      console.error("Failed to load project:", error);
      setLoading(false);
    }
  };

  // Playback Logic - Use video timeupdate for videos, animationFrame for others
  useEffect(() => {
    let animationFrameId;
    let lastTime = performance.now();

    // Determine if we should use video-driven playback
    const hasValidVideo = videoRef.current && 
                          activeClip?.type === "video" && 
                          activeClip?.src &&
                          typeof activeClip.src === "string" &&
                          (activeClip.src.startsWith("blob:") || activeClip.src.startsWith("http"));

    // VIDEO PLAYBACK PATH
    if (hasValidVideo && isPlaying) {
      const video = videoRef.current;

      const handleTimeUpdate = () => {
        if (activeClip) {
          const videoTime = video.currentTime;
          const timelineTime = activeClip.start + videoTime;
          setCurrentTime(timelineTime);

          // Check if we've reached the end of the clip
          if (videoTime >= activeClip.duration) {
            setIsPlaying(false);
            setCurrentTime(activeClip.start + activeClip.duration);
          }
        }
      };

      const handleEnded = () => {
        setIsPlaying(false);
        if (activeClip) {
          setCurrentTime(activeClip.start + activeClip.duration);
        }
      };

      video.addEventListener("timeupdate", handleTimeUpdate);
      video.addEventListener("ended", handleEnded);

      return () => {
        video.removeEventListener("timeupdate", handleTimeUpdate);
        video.removeEventListener("ended", handleEnded);
      };
    }

    // NON-VIDEO PLAYBACK PATH (placeholder, image, or no valid video source)
    const tick = (now) => {
      if (!isPlaying) return;

      const deltaTime = (now - lastTime) / 1000;
      lastTime = now;

      setCurrentTime((prevTime) => {
        const newTime = prevTime + deltaTime;
        const totalDuration = timelineClips.reduce(
          (sum, clip) => sum + clip.duration,
          0
        );
        if (newTime >= totalDuration) {
          setIsPlaying(false);
          return totalDuration;
        }
        return newTime;
      });

      animationFrameId = requestAnimationFrame(tick);
    };

    // Start ticker for non-video clips when playing
    if (isPlaying && !hasValidVideo) {
      console.log("🎬 Starting animation frame playback for non-video clip");
      lastTime = performance.now();
      animationFrameId = requestAnimationFrame(tick);
    }

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [isPlaying, timelineClips]); // Removed activeClip to break dependency cycle

  // Video Sync Logic - Handle seeking and play/pause
  useEffect(() => {
    if (videoRef.current && activeClip?.type === "video" && activeClip?.src) {
      const video = videoRef.current;
      const targetTime = Math.max(0, currentTime - activeClip.start);

      // Only seek if difference is significant (and not currently playing to avoid conflicts)
      if (!isPlaying && Math.abs(video.currentTime - targetTime) > 0.1) {
        video.currentTime = targetTime;
      }
    }
  }, [currentTime, isPlaying]); // Removed activeClip to prevent loops

  // Separate effect for play/pause control
  useEffect(() => {
    if (videoRef.current && activeClip?.type === "video" && activeClip?.src) {
      const video = videoRef.current;

      if (isPlaying) {
        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise.catch((e) => {
            console.error("Video play error:", e);
            setIsPlaying(false);
          });
        }
      } else {
        video.pause();
      }
    }
  }, [isPlaying]); // Removed activeClip to prevent loops

  // Save history helper
  const saveHistory = (newClips) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newClips);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleSplit = () => {
    if (!selectedClipId) return;
    const clipIndex = timelineClips.findIndex((c) => c.id === selectedClipId);
    if (clipIndex === -1) return;

    const clip = timelineClips[clipIndex];
    const relativeSplitPoint = currentTime - clip.start;

    if (relativeSplitPoint <= 0.1 || relativeSplitPoint >= clip.duration - 0.1)
      return;

    const clip1 = { ...clip, duration: relativeSplitPoint };
    const clip2 = {
      ...clip,
      id: Date.now(),
      start: clip.start + relativeSplitPoint,
      duration: clip.duration - relativeSplitPoint,
      name: `${clip.name} (Part 2)`,
    };

    const newClips = [...timelineClips];
    newClips.splice(clipIndex, 1, clip1, clip2);

    for (let i = clipIndex + 2; i < newClips.length; i++) {
      newClips[i].start = newClips[i - 1].start + newClips[i - 1].duration;
    }

    setTimelineClips(newClips);
    saveHistory(newClips);
  };

  const handleDelete = () => {
    if (!selectedClipId) return;
    const newClips = timelineClips.filter((c) => c.id !== selectedClipId);

    let currentStart = 0;
    newClips.forEach((clip) => {
      clip.start = currentStart;
      currentStart += clip.duration;
    });

    setTimelineClips(newClips);
    setSelectedClipId(null);
    saveHistory(newClips);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevClips = history[historyIndex - 1];
      setTimelineClips(prevClips);
      setHistoryIndex(historyIndex - 1);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextClips = history[historyIndex + 1];
      setTimelineClips(nextClips);
      setHistoryIndex(historyIndex + 1);
    }
  };

  const handleAddAudio = (audioData) => {
    const startTime = audioData.slideId
      ? timelineClips.find((c) => c.id === audioData.slideId)?.start ||
        currentTime
      : currentTime;

    const newClip = {
      id: Date.now(),
      type: "audio",
      name: `AI Voice`,
      src: audioData.url,
      duration: audioData.duration || 5,
      start: startTime,
      startTime: startTime,
      color: "bg-purple-600",
      slideId: audioData.slideId,
      text: audioData.text,
      wordAlignment: audioData.wordAlignment, // Include word alignment for karaoke
    };
    
    // Replace existing audio for the same slide, or add new if no match
    setAudioClips((prev) => {
      // Remove any existing audio for this slide
      const filtered = prev.filter(clip => clip.slideId !== audioData.slideId);
      return [...filtered, newClip];
    });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const localUrl = URL.createObjectURL(file);
    const startTime = timelineClips.reduce((sum, c) => sum + c.duration, 0);

    if (file.type.startsWith("video/")) {
      try {
        // Get video duration
        const getVideoDuration = () => {
          return new Promise((resolve) => {
            const video = document.createElement("video");
            video.preload = "metadata";
            video.src = localUrl;
            video.onloadedmetadata = () => {
              resolve(video.duration || 10);
            };
            video.onerror = () => {
              resolve(10); // Default duration on error
            };
          });
        };

        const duration = await getVideoDuration();

        // Try to upload to backend (optional)
        try {
          const formData = new FormData();
          formData.append("video", file);
          await projectAPI.uploadVideo(id, formData);
        } catch (err) {
          console.warn("Backend upload failed, using local file:", err);
        }

        const newClip = {
          id: Date.now(),
          type: "video",
          name: file.name,
          src: localUrl,
          duration: Math.ceil(duration),
          start: startTime,
          color: "bg-gray-600",
        };

        const newClips = [...timelineClips, newClip];
        setTimelineClips(newClips);
        saveHistory(newClips);
        setCurrentTime(newClip.start);
      } catch (err) {
        console.error("Upload failed:", err);
        alert("Failed to process video file");
      }
    } else if (file.type.startsWith("image/")) {
      // Handle image uploads as slides
      const newClip = {
        id: Date.now(),
        type: "image",
        name: file.name,
        src: localUrl,
        duration: 5, // Default 5 seconds for images
        start: startTime,
        color: "bg-gray-600",
      };

      const newClips = [...timelineClips, newClip];
      setTimelineClips(newClips);
      saveHistory(newClips);
      setCurrentTime(newClip.start);
    }
    e.target.value = "";
  };

  const handleAddClip = () => {
    fileInputRef.current?.click();
  };

  // Context menu handlers
  const handleContextMenu = (e, clipId) => {
    e.preventDefault();
    e.stopPropagation();

    // Get button position relative to viewport
    const buttonRect = e.currentTarget.getBoundingClientRect();

    // Get scroll position
    const scrollX = window.scrollX || window.pageXOffset;
    const scrollY = window.scrollY || window.pageYOffset;

    // Check if menu would go off screen to the right
    const menuWidth = 200; // min-w-[200px]
    const spaceOnRight = window.innerWidth - buttonRect.right;
    const spaceOnLeft = buttonRect.left;

    let menuX, menuY;

    // If not enough space on right, show on left side
    if (spaceOnRight < menuWidth + 8 && spaceOnLeft > menuWidth + 8) {
      menuX = buttonRect.left - menuWidth - 8;
    } else {
      // Show to the right (default) - use viewport coordinates for fixed positioning
      menuX = buttonRect.right + 8;
    }

    // Position menu to open UPWARD from the button (bottom-aligned to button top)
    const menuHeight = 200; // Estimated menu height
    menuY = buttonRect.top - menuHeight;
    
    // If menu would go off top of screen, show it below instead
    if (menuY < 0) {
      menuY = buttonRect.bottom + 8;
    }

    // Position menu to the right of the button, opening upward
    setContextMenu({
      x: menuX,
      y: menuY,
      clipId,
    });
  };

  const closeContextMenu = () => {
    setContextMenu(null);
  };

  const handleMoveClipLeft = (clipId) => {
    const clipIndex = timelineClips.findIndex((c) => c.id === clipId);
    if (clipIndex <= 0) return;

    const newClips = [...timelineClips];
    [newClips[clipIndex - 1], newClips[clipIndex]] = [
      newClips[clipIndex],
      newClips[clipIndex - 1],
    ];

    // Recalculate start times
    let currentStart = 0;
    newClips.forEach((clip) => {
      clip.start = currentStart;
      currentStart += clip.duration;
    });

    setTimelineClips(newClips);
    saveHistory(newClips);
    closeContextMenu();
  };

  const handleMoveClipRight = (clipId) => {
    const clipIndex = timelineClips.findIndex((c) => c.id === clipId);
    if (clipIndex >= timelineClips.length - 1) return;

    const newClips = [...timelineClips];
    [newClips[clipIndex], newClips[clipIndex + 1]] = [
      newClips[clipIndex + 1],
      newClips[clipIndex],
    ];

    // Recalculate start times
    let currentStart = 0;
    newClips.forEach((clip) => {
      clip.start = currentStart;
      currentStart += clip.duration;
    });

    setTimelineClips(newClips);
    saveHistory(newClips);
    closeContextMenu();
  };

  const handleMergeWithPrevious = (clipId) => {
    const clipIndex = timelineClips.findIndex((c) => c.id === clipId);
    if (clipIndex <= 0) return;

    const newClips = [...timelineClips];
    const prevClip = newClips[clipIndex - 1];
    const currentClip = newClips[clipIndex];

    prevClip.duration += currentClip.duration;
    newClips.splice(clipIndex, 1);

    // Recalculate start times
    let currentStart = 0;
    newClips.forEach((clip) => {
      clip.start = currentStart;
      currentStart += clip.duration;
    });

    setTimelineClips(newClips);
    saveHistory(newClips);
    closeContextMenu();
  };

  const handleMergeWithNext = (clipId) => {
    const clipIndex = timelineClips.findIndex((c) => c.id === clipId);
    if (clipIndex >= timelineClips.length - 1) return;

    const newClips = [...timelineClips];
    const currentClip = newClips[clipIndex];
    const nextClip = newClips[clipIndex + 1];

    currentClip.duration += nextClip.duration;
    newClips.splice(clipIndex + 1, 1);

    // Recalculate start times
    let currentStart = 0;
    newClips.forEach((clip) => {
      clip.start = currentStart;
      currentStart += clip.duration;
    });

    setTimelineClips(newClips);
    saveHistory(newClips);
    closeContextMenu();
  };

  const handleDuplicateClip = (clipId) => {
    const clip = timelineClips.find((c) => c.id === clipId);
    if (!clip) return;

    const clipIndex = timelineClips.findIndex((c) => c.id === clipId);
    const newClip = {
      ...clip,
      id: Date.now(),
      start: clip.start + clip.duration,
    };

    const newClips = [...timelineClips];
    newClips.splice(clipIndex + 1, 0, newClip);

    // Recalculate start times
    let currentStart = 0;
    newClips.forEach((c) => {
      c.start = currentStart;
      currentStart += c.duration;
    });

    setTimelineClips(newClips);
    saveHistory(newClips);
    closeContextMenu();
  };

  const handleDeleteClip = (clipId) => {
    const newClips = timelineClips.filter((c) => c.id !== clipId);

    // Recalculate start times
    let currentStart = 0;
    newClips.forEach((clip) => {
      clip.start = currentStart;
      currentStart += clip.duration;
    });

    setTimelineClips(newClips);
    setSelectedClipId(null);
    saveHistory(newClips);
    closeContextMenu();
  };

  // Close context menu on outside click
  useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenu) {
        closeContextMenu();
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [contextMenu]);

  const handleExport = () => {
    alert("Exporting project...");
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#0a0b0d] flex flex-col items-center justify-center text-white space-y-6">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 border-4 border-purple-900/40 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <div className="text-center">
          <p className="text-xl font-bold tracking-tight text-white/90">
            Clueso Studio
          </p>
          <p className="text-sm text-gray-500 mt-1 animate-pulse font-medium">
            Preparing your workspace...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#0a0b0d] overflow-hidden font-sans text-gray-200">
      <Head>
        <title>{project?.name || "Untitled"} - Clueso Studio</title>
      </Head>

      {/* Sidebar Rail */}
      <div className="w-16 flex flex-col items-center py-4 border-r border-white/5 bg-[#0f1115] z-50">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 flex items-center justify-center text-gray-500 hover:text-white transition-all active:scale-90 mb-6"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
        </button>

        <Link
          href="/dashboard"
          className="w-8 h-8 bg-purple-600 rounded-lg mb-8 flex items-center justify-center shadow-lg shadow-purple-500/20 hover:scale-110 transition active:scale-95 group"
        >
          <svg
            className="w-5 h-5 text-white group-hover:rotate-12 transition-transform"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
        </Link>

        <div className="flex-1 flex flex-col space-y-4">
          {[
            {
              id: "script",
              icon: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
              label: "Script",
            },
            {
              id: "elements",
              icon: "M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z",
              label: "Elements",
            },
            {
              id: "templates",
              icon: "M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 12a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1v-7z",
              label: "Templates",
            },
            {
              id: "music",
              icon: "M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3",
              label: "Music",
            },
            {
              id: "captions",
              icon: "M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z",
              label: "Captions",
            },
          ].map((item) => (
            <button
              key={item.id}
              className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-300 group relative ${
                activeTab === item.id
                  ? "sidebar-active"
                  : "text-gray-600 hover:text-white hover:bg-white/5"
              }`}
              onClick={() => setActiveTab(item.id)}
            >
              <svg
                className="w-5 h-5 mb-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={item.icon}
                />
              </svg>
              <span className="text-[9px] font-black uppercase tracking-tighter transition-all opacity-80 group-hover:opacity-100">
                {item.label}
              </span>
            </button>
          ))}
        </div>

        <div className="mt-auto flex flex-col items-center space-y-6">
          <button className="flex flex-col items-center space-y-1 group transition-all">
            <div className="w-6 h-6 rounded-lg bg-gray-800 flex items-center justify-center text-gray-500 group-hover:bg-purple-600 group-hover:text-white transition-all">
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <span className="text-[9px] font-black uppercase tracking-tighter text-gray-600 group-hover:text-gray-400">
              Support
            </span>
          </button>
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 border border-white/10 shadow-lg cursor-pointer"></div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Navbar */}
        <header className="h-14 border-b border-white/5 bg-[#0f1115] flex items-center justify-between px-6 z-40 shadow-sm relative overflow-hidden">
          {/* Decorative bar */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 opacity-50"></div>

          <div className="flex items-center space-x-5">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <Link
                href="/dashboard"
                className="text-gray-400 hover:text-white transition"
              >
                <span className="text-[10px] font-black tracking-widest uppercase">
                  File
                </span>
              </Link>
              <span className="text-sm font-bold text-white tracking-tight">
                {project?.name || "Untitled (3)"}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-6">
            {/* Center Tabs */}
            <div className="flex p-1 rounded-2xl relative bg-black/20 border border-white/5">
              <button
                onClick={() => setEditorMode("video")}
                className={`px-5 py-2 text-[11px] font-black uppercase tracking-wider transition-all relative z-10 ${
                  editorMode === "video"
                    ? "text-white"
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                  <span>Video</span>
                </div>
              </button>
              <button
                onClick={() => setEditorMode("article")}
                className={`px-5 py-2 text-[11px] font-black uppercase tracking-wider transition-all relative z-10 ${
                  editorMode === "article"
                    ? "text-white"
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <span>Article</span>
                </div>
              </button>
              {/* Animated Underline */}
              <div
                className="absolute bottom-0 h-0.5 bg-purple-600 transition-all duration-300"
                style={{
                  left: editorMode === "video" ? "12px" : "calc(50% + 4px)",
                  width: editorMode === "video" ? "80px" : "85px",
                }}
              ></div>
            </div>

            {/* Right Side Controls */}
            <div className="flex items-center space-x-4">
              {/* Background Button */}
              <button className="px-4 py-2 text-white text-[11px] font-black uppercase tracking-widest rounded-xl border border-white/10 hover:bg-white/5 transition">
                Background
              </button>

              {/* 16:9 Dropdown */}
              <button className="px-4 py-2 text-gray-400 hover:text-white text-[11px] font-black uppercase tracking-widest rounded-xl border border-white/10 hover:bg-white/5 transition flex items-center space-x-2">
                <span>16:9</span>
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {/* + Insert Button */}
              <button className="px-4 py-2 text-gray-400 hover:text-white text-[11px] font-black uppercase tracking-widest rounded-xl border border-white/10 hover:bg-white/5 transition flex items-center space-x-2">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                <span>Insert</span>
              </button>

              <div className="w-px h-6 bg-white/10"></div>

              {/* Eye Icon */}
              <button className="text-gray-500 hover:text-white transition p-2">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              </button>

              {/* Question Mark Icon */}
              <button className="text-gray-500 hover:text-white transition p-2">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </button>

              {/* Translate Button */}
              <button className="flex items-center space-x-2 text-gray-400 hover:text-white transition px-4 py-2 border border-white/10 rounded-xl text-[11px] font-black uppercase tracking-widest">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M3 5h12M9 3v2m10 16l-4-4m4 4l-4-4m4-4l-4 4m4 4l-4-4"
                  />
                </svg>
                <span>Translate</span>
              </button>

              {/* Share Button */}
              <button
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-xl text-[11px] font-black shadow-lg transition-all transform hover:-translate-y-0.5 active:scale-95 flex items-center space-x-2 uppercase tracking-widest"
                onClick={handleExport}
              >
                <span>Share</span>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M5 10l7-7m0 0l7 7m-7-7v18"
                  />
                </svg>
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 flex min-h-0 relative">
          {/* Collapsible Panel */}
          {activeTab && (
            <div className="w-[420px] bg-[#0f1115] flex flex-col border-r border-white/5 relative z-[70] overflow-hidden shadow-[10px_0_30px_rgba(0,0,0,0.2)]">
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {editorMode === "video" ? (
                  <>
                    {activeTab === "script" && (
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
                        onSeek={(time) => setCurrentTime(time)}
                        onActiveTextChange={(text) => setPreviewText(text)}
                      />
                    )}
                    {activeTab !== "script" && (
                      <div className="flex flex-col items-center justify-center h-full p-12 text-center">
                        <div className="w-16 h-16 bg-white/5 rounded-3xl flex items-center justify-center mb-6">
                          <svg
                            className="w-8 h-8 text-gray-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1}
                              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                            />
                          </svg>
                        </div>
                        <h3 className="text-white font-bold text-lg mb-2 capitalize">
                          {activeTab} Panel
                        </h3>
                        <p className="text-gray-500 text-sm max-w-xs leading-relaxed">
                          We're building more powerful creation tools. This
                          feature is coming very soon!
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <ArticleEditor
                    content={articleContent}
                    onChange={setArticleContent}
                    projectName={project?.name}
                    isLoading={articleLoading}
                  />
                )}
              </div>
            </div>
          )}

          {/* Canvas & Timeline */}
          <div className="flex-1 flex flex-col min-w-0 bg-[#07080a] relative">
            <div className="flex-1 flex flex-col relative overflow-hidden">
              {/* Floating Toolbar - Clueso Exact labels */}
              <div className="absolute top-8 left-1/2 transform -translate-x-1/2 bg-[#121418]/80 backdrop-blur-3xl border border-white/5 rounded-2xl p-1.5 flex items-center space-x-1.5 shadow-2xl z-[60] ring-1 ring-white/5">
                <button className="px-4 py-2 text-[10px] font-black tracking-widest text-gray-400 hover:text-white transition rounded-xl hover:bg-white/5 flex items-center space-x-3 group uppercase">
                  <div className="w-3.5 h-3.5 rounded-lg bg-indigo-600 shadow-[0_0_10px_rgba(79,70,229,0.4)] group-hover:scale-110 transition-transform"></div>
                  <span>Background</span>
                </button>
                <div className="w-px h-4 bg-white/10"></div>
                <button className="px-4 py-2 text-[10px] font-black tracking-widest text-gray-400 hover:text-white transition rounded-xl hover:bg-white/5 uppercase flex items-center space-x-2">
                  <span>16:9</span>
                  <svg
                    className="w-2.5 h-2.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
                <div className="w-px h-4 bg-white/10"></div>
                <button className="px-5 py-2 text-[10px] font-black tracking-widest text-gray-400 hover:text-white transition rounded-xl hover:bg-white/5 uppercase flex items-center space-x-2 border border-transparent hover:border-white/10">
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  <span>Insert</span>
                </button>
              </div>

              {/* Preview Canvas - White Background */}
              <div className="flex-1 flex items-center justify-center p-12 lg:p-20 relative bg-white">
                {viewMode === "preview" ? (
                  <div className="w-full h-full max-w-4xl flex items-center justify-center">
                    <div className="w-full relative shadow-[0_50px_100px_-20px_rgba(0,0,0,0.9)] rounded-2xl overflow-hidden ring-1 ring-white/20">
                      <EditorStage
                        videoUrl={project?.videoUrl || ""}
                        activeText={previewText}
                        isPlaying={isPlaying}
                        currentTime={currentTime}
                      />
                    </div>
                  </div>
                ) : (
                  <div
                    className="relative bg-white rounded-lg shadow-2xl overflow-hidden group transition-all duration-700"
                    style={{
                      aspectRatio: aspectRatio === "16/9" ? "16/9" : "9/16",
                      width: aspectRatio === "16/9" ? "1100px" : "500px",
                      maxWidth: "100%",
                      maxHeight: "100%",
                    }}
                  >
                    {activeClip?.type === "video" && activeClip?.src && (
                      typeof activeClip.src === 'string' && 
                      (activeClip.src.startsWith('blob:') || activeClip.src.startsWith('http'))
                    ) ? (
                      <video
                        key={activeClip.id}
                        ref={videoRef}
                        src={activeClip.src}
                        className="w-full h-full object-contain"
                        muted
                        playsInline
                        preload="auto"
                        onCanPlay={() => {
                          if (videoRef.current) {
                            const targetTime = Math.max(
                              0,
                              currentTime - activeClip.start
                            );
                            videoRef.current.currentTime = Math.min(
                              targetTime,
                              videoRef.current.duration || 0
                            );
                            if (isPlaying && videoRef.current.paused && videoRef.current.readyState >= 2) {
                              videoRef.current.play().catch((e) => {
                                if (e.name !== 'AbortError') {
                                    console.error("Video play error:", e);
                                    setIsPlaying(false);
                                }
                              });
                            }
                          }
                        }}
                        onError={(e) => {
                          const video = e.currentTarget;
                          console.error("Video load error details:", {
                            error: video.error,
                            src: video.src,
                            readyState: video.readyState,
                            networkState: video.networkState
                          });
                        }}
                      />
                    ) : activeClip?.type === "image" && activeClip?.src ? (
                      <img
                        key={activeClip.id}
                        src={activeClip.src}
                        alt={activeClip.name}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-white">
                        <div className="relative mb-8">
                          <div className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                          <div className="relative bg-white px-4">
                            <svg
                              className="w-16 h-16 text-gray-300"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={0.5}
                                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                              />
                            </svg>
                          </div>
                        </div>
                        <p className="text-gray-400 font-bold uppercase tracking-[0.3em] text-[10px]">
                          No Media Attached
                        </p>
                        <p className="text-gray-500 text-xs mt-3 max-w-[200px] text-center leading-relaxed">
                          Upload a recording or pick a template to start
                          building.
                        </p>
                      </div>
                    )}

                    <div className="absolute inset-0 pointer-events-none flex flex-col justify-end p-12 text-center bg-gradient-to-t from-black/40 via-transparent to-transparent">
                      <p className="text-3xl lg:text-4xl font-black text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)] leading-tight tracking-tight">
                        {previewText}
                      </p>
                    </div>

                    <div className="absolute top-6 left-6 flex items-center space-x-3 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                      <div className="bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-[10px] font-black text-white/90 tracking-widest uppercase">
                        {activeClip?.name}
                      </div>
                      <div className="bg-purple-600/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-purple-500/30 text-[10px] font-black text-white tracking-widest">
                        {currentTime.toFixed(1)}S
                      </div>
                    </div>

                    {/* Instruction Tooltip */}
                    {!previewText && (
                      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-900/90 backdrop-blur-md text-white px-6 py-3 rounded-xl text-sm font-medium shadow-xl border border-white/10 z-10">
                        Click on 'Generate Speech' to update the voiceover.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Timeline Area (Floating Look) */}
            <div className="p-4 pt-0 z-40">
              <div className="h-48 bg-[#0f1115]/80 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] flex flex-col shadow-[0_20px_50px_-10px_rgba(0,0,0,0.5)] ring-1 ring-white/5 relative overflow-hidden">
                {/* Decorative elements */}
                <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/5 to-transparent"></div>

                {/* Controls Header - Exact Clueso style */}
                <div className="h-12 border-b border-white/5 flex items-center justify-between px-6 relative bg-[#121418]/50">
                  <div className="flex items-center space-x-6">
                    <div className="flex items-center bg-black/40 rounded-xl p-1 border border-white/5">
                      <button
                        onClick={handleSplit}
                        className="flex items-center space-x-2 px-4 py-2 text-[11px] font-black text-white hover:bg-white/5 transition rounded-lg tracking-widest uppercase"
                      >
                        <svg
                          className="w-3.5 h-3.5 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2.5}
                            d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758L5 19m11-5.938A4.5 4.5 0 1114.062 10 4.5 4.5 0 0116 13.062z"
                          />
                        </svg>
                        <span>Split</span>
                      </button>
                    </div>
                    <button
                      onClick={handleAddClip}
                      className="flex items-center space-x-2 pl-2 pr-4 py-2 text-[11px] font-black text-white hover:bg-white/5 transition rounded-lg tracking-widest uppercase group border border-white/5"
                    >
                      <svg
                        className="w-3.5 h-3.5 text-gray-400 group-hover:text-white transition-colors"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2.5}
                          d="M12 4v16m8-8H4"
                        />
                      </svg>
                      <span>Add Clip</span>
                    </button>
                  </div>

                  {/* Playback Controls - Centered */}
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center space-x-8">
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => {
                          const newTime = Math.max(0, currentTime - 1);
                          setCurrentTime(newTime);
                        }}
                        className="text-gray-500 hover:text-white transition p-1.5"
                      >
                        <svg
                          className="w-5 h-5 fill-current"
                          viewBox="0 0 24 24"
                        >
                          <path d="M6 18V6h2v12H6zm3.5-6L18 18V6l-8.5 6z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setIsPlaying(!isPlaying)}
                        className="w-10 h-10 flex items-center justify-center bg-pink-500 text-white rounded-full hover:scale-110 active:scale-90 transition-all shadow-lg"
                      >
                        {isPlaying ? (
                          <svg
                            className="w-5 h-5 fill-current"
                            viewBox="0 0 24 24"
                          >
                            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                          </svg>
                        ) : (
                          <svg
                            className="w-5 h-5 fill-current ml-0.5"
                            viewBox="0 0 24 24"
                          >
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        )}
                      </button>
                      <button
                        onClick={() => {
                          const totalDuration = timelineClips.reduce(
                            (sum, c) => sum + c.duration,
                            0
                          );
                          const newTime = Math.min(
                            totalDuration,
                            currentTime + 1
                          );
                          setCurrentTime(newTime);
                        }}
                        className="text-gray-500 hover:text-white transition p-1.5"
                      >
                        <svg
                          className="w-5 h-5 fill-current"
                          viewBox="0 0 24 24"
                        >
                          <path d="M16 18V6h-2v12h2zM6 18l8.5-6L6 6v12z" />
                        </svg>
                      </button>
                    </div>

                    <div className="bg-[#1a1d21] rounded-2xl px-5 py-2.5 border border-white/5 text-[12px] font-black font-mono tracking-widest tabular-nums flex items-center space-x-2 shadow-inner">
                      <span className="text-white">
                        {String(Math.floor(currentTime / 60)).padStart(2, "0")}:
                        {String(Math.floor(currentTime % 60)).padStart(2, "0")}:
                        {String(Math.floor((currentTime % 1) * 30)).padStart(2, "0")}
                      </span>
                      <span className="text-gray-700">/</span>
                      <span className="text-gray-500">
                        {String(
                          Math.floor(
                            timelineClips.reduce(
                              (sum, c) => sum + c.duration,
                              0
                            ) / 60
                          )
                        ).padStart(2, "0")}
                        :
                        {String(
                          Math.floor(
                            timelineClips.reduce(
                              (sum, c) => sum + c.duration,
                              0
                            ) % 60
                          )
                        ).padStart(2, "0")}
                        : 00
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-6">
                    <div className="flex bg-black/40 rounded-xl p-1 border border-white/5">
                      <button
                        onClick={handleUndo}
                        className="p-2 text-gray-500 hover:text-white transition rounded-lg hover:bg-white/5"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2.5}
                            d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={handleRedo}
                        className="p-2 text-gray-500 hover:text-white transition rounded-lg hover:bg-white/5"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2.5}
                            d="M21 10h-10a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6"
                          />
                        </svg>
                      </button>
                    </div>
                    <button className="flex items-center space-x-3 bg-black/40 px-4 py-2 rounded-xl border border-white/5 group hover:bg-black/60 transition">
                      <svg
                        className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2.5}
                          d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                        />
                      </svg>
                    </button>
                    <div className="flex items-center space-x-3 bg-black/40 px-4 py-2 rounded-xl border border-white/5 group">
                      <input
                        type="range"
                        className="w-24 accent-pink-500"
                        defaultValue="50"
                      />
                      <span className="text-[10px] font-black text-gray-500 w-8">
                        50%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Tracks Container */}
                <div className="flex-1 overflow-x-auto overflow-y-hidden relative custom-scrollbar bg-[#0a0a0a]/30">
                  {/* Playhead Ruler */}
                  <div
                    className="absolute top-0 left-0 right-0 h-8 border-b border-white/5 bg-[#121418]/50 flex items-end cursor-pointer"
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const clickX = e.clientX - rect.left;
                      const clickedTime = clickX / 50; // 50px per second
                      const totalDuration = timelineClips.reduce(
                        (sum, c) => sum + c.duration,
                        0
                      );
                      setCurrentTime(
                        Math.max(0, Math.min(clickedTime, totalDuration))
                      );
                    }}
                  >
                    {Array.from({ length: 200 }).map((_, i) => (
                      <div
                        key={i}
                        className={`flex-shrink-0 w-5 border-l border-white/[0.03] transition-colors hover:border-white/10 ${
                          i % 10 === 0 ? "h-5 border-white/20" : i % 5 === 0 ? "h-3" : "h-1.5"
                        }`}
                      >
                        {i % 10 === 0 && (
                          <span className="text-[9px] font-black text-gray-600 ml-1.5 mb-1.5 block tabular-nums tracking-tighter opacity-50">
                            {i/2}s
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col pt-10 min-w-[4000px] relative h-full bg-zebra">
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20 pointer-events-none"></div>

                    {/* Playhead Line - Pink */}
                    <div
                      className="absolute top-0 bottom-0 w-[2px] bg-pink-500 z-50 pointer-events-none shadow-[0_0_15px_rgba(236,72,153,0.6)]"
                      style={{ left: `${currentTime * 50}px` }}
                    >
                      {/* Playhead Cap - Exact Clueso style */}
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-4 bg-pink-500 rounded-full border-2 border-[#121418] shadow-lg flex items-center justify-center">
                        <div className="w-1 h-1 bg-white rounded-full"></div>
                      </div>
                    </div>

                    {/* Main Video Track */}
                    <div className="relative px-8 h-14">
                      {/* Active Track Pink Handle */}
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-10 bg-pink-500 rounded-r-full shadow-[0_0_10px_rgba(236,72,153,0.8)] z-30"></div>

                      {timelineClips.map((clip, index) => {
                        const isSelected = selectedClipId === clip.id;
                        return (
                          <div
                            key={clip.id}
                            className="absolute h-10 group"
                            style={{
                              left: `${clip.start * 50 + 48}px`,
                              width: `${clip.duration * 50}px`,
                            }}
                            onClick={() => {
                              setSelectedClipId(clip.id);
                              setCurrentTime(clip.start);
                            }}
                            onContextMenu={(e) => handleContextMenu(e, clip.id)}
                          >
                            {/* Clip Bar - Light gray with pink border */}
                            <div
                              className={`h-full rounded-lg border-2 transition-all duration-200 relative overflow-hidden ${
                                isSelected
                                  ? "bg-gray-300 border-pink-500 shadow-lg"
                                  : "bg-gray-400 border-pink-500/80 hover:border-pink-500"
                              }`}
                            >
                              {/* Gradient effect */}
                              <div className="absolute inset-0 bg-gradient-to-b from-gray-300 via-gray-400 to-gray-500 opacity-60"></div>

                              {/* Content */}
                              <div className="relative h-full flex items-center justify-between px-2">
                                {/* Left: Slide label */}
                                <div className="bg-gray-600 rounded-md px-2 py-1 flex-shrink-0">
                                  <span className="text-[10px] font-black text-white">
                                    {index + 1} Slide
                                  </span>
                                </div>

                                {/* Right: Duration and menu */}
                                <div className="flex items-center space-x-1 flex-shrink-0">
                                  <div className="bg-gray-600 rounded-md px-2 py-1">
                                    <span className="text-[10px] font-black text-white">
                                      {clip.duration} s
                                    </span>
                                  </div>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleContextMenu(e, clip.id);
                                    }}
                                    className="bg-gray-600 rounded-md px-1.5 py-1 hover:bg-gray-700 transition-colors"
                                  >
                                    <svg
                                      className="w-3 h-3 text-white"
                                      fill="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                                    </svg>
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {/* Add Clip Button - positioned at end */}
                      <button
                        onClick={handleAddClip}
                        className="absolute h-12 w-16 rounded-lg border-2 border-dashed border-gray-600 flex flex-col items-center justify-center text-gray-500 hover:text-white hover:border-pink-500 transition-all group active:scale-95"
                        style={{
                          left: `${
                            timelineClips.reduce(
                              (sum, c) => sum + c.duration,
                              0
                            ) *
                              50 +
                            48
                          }px`,
                        }}
                      >
                        <svg
                          className="w-5 h-5 group-hover:scale-110 transition-transform"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2.5}
                            d="M12 4v16m8-8H4"
                          />
                        </svg>
                      </button>
                    </div>

                    {/* Spacer / Track Divider */}
                    <div className="h-px w-full bg-white/5 my-2 mx-12"></div>

                    {/* Audio Track */}
                    <div className="flex px-12 h-16 relative items-center">
                      {audioClips.map((clip) => (
                        <div
                          key={clip.id}
                          className="absolute h-10 bg-purple-900/40 border border-purple-500/40 rounded-2xl py-1 px-4 flex items-center space-x-3 overflow-hidden shadow-2xl backdrop-blur-xl ring-1 ring-purple-400/20"
                          style={{
                            left: `${clip.start * 50 + 48}px`,
                            width: `${clip.duration * 50}px`,
                          }}
                        >
                          <div className="w-6 h-6 rounded-xl bg-purple-500/20 flex items-center justify-center shadow-inner">
                            <svg
                              className="w-3.5 h-3.5 text-purple-400"
                              fill="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                            </svg>
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-[9px] font-black text-purple-300 truncate uppercase tracking-tighter">
                              AI VOICE
                            </span>
                            <div className="flex items-end space-x-[2px] h-3 opacity-60">
                              {Array.from({ length: 30 }).map((_, i) => (
                                <div
                                  key={i}
                                  className="bg-purple-400 w-[1px] rounded-full"
                                  style={{
                                    height: `${Math.random() * 80 + 20}%`,
                                  }}
                                ></div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Article AI Panel */}
          {editorMode === "article" && (
            <div className="w-[380px] border-l border-white/5 bg-[#0f1115] relative z-20 hidden 2xl:block shadow-[-10px_0_30px_rgba(0,0,0,0.2)]">
              <ArticleAIPanel
                projectId={id}
                videoId={project?.videoId || id}
                onRewrite={async () => {
                  setArticleLoading(true);
                  try {
                    const response = await aiAPI.processRecording({
                      projectId: id,
                      rawTranscript: project?.polishedScript || "",
                      styleGuidelines: "Professional technical documentation",
                      docUseCase: "Step-by-step guide",
                    });
                    if (response.data.data?.docSteps) {
                      const article = response.data.data.docSteps
                        .map(
                          (step) =>
                            `<h2>${step.title || step.step}</h2><p>${
                              step.description
                            }</p>`
                        )
                        .join("\n");
                      setArticleContent(article);
                    }
                  } catch (error) {
                    console.error("Failed to generate article:", error);
                  } finally {
                    setArticleLoading(false);
                  }
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*,image/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Context Menu - Render using Portal to avoid overflow issues */}
      {contextMenu && typeof window !== "undefined"
        ? createPortal(
            <>
              {/* Backdrop to close menu on outside click */}
              <div
                className="fixed inset-0 z-[99]"
                onClick={closeContextMenu}
                onContextMenu={(e) => {
                  e.preventDefault();
                  closeContextMenu();
                }}
              />
              <div
                data-context-menu
                className="fixed bg-gray-800 border border-gray-700 rounded-lg shadow-2xl z-[100] py-2 min-w-[200px]"
                style={{
                  left: `${contextMenu.x}px`,
                  top: `${contextMenu.y}px`,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => handleMoveClipLeft(contextMenu.clipId)}
                  className="w-full px-4 py-2 text-left text-white text-sm hover:bg-gray-700 flex items-center space-x-3 transition-colors"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l-2 2m0 0l2 2m-2-2h14M15 12l2-2m0 0l-2-2m2 2H5"
                    />
                  </svg>
                  <span>Move clip left</span>
                </button>
                <button
                  onClick={() => handleMoveClipRight(contextMenu.clipId)}
                  className="w-full px-4 py-2 text-left text-white text-sm hover:bg-gray-700 flex items-center space-x-3 transition-colors"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12l2 2m0 0l-2 2m2-2H5m10-4l-2-2m0 0l2-2m-2 2h14"
                    />
                  </svg>
                  <span>Move clip right</span>
                </button>
                <button
                  onClick={() => handleMergeWithPrevious(contextMenu.clipId)}
                  disabled={
                    timelineClips.findIndex(
                      (c) => c.id === contextMenu.clipId
                    ) <= 0
                  }
                  className="w-full px-4 py-2 text-left text-gray-500 text-sm hover:bg-gray-700 flex items-center space-x-3 transition-colors disabled:cursor-not-allowed"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l-2 2m0 0l2 2m-2-2h14M15 12l2-2m0 0l-2-2m2 2H5"
                    />
                  </svg>
                  <span>Merge with previous</span>
                </button>
                <button
                  onClick={() => handleMergeWithNext(contextMenu.clipId)}
                  disabled={
                    timelineClips.findIndex(
                      (c) => c.id === contextMenu.clipId
                    ) >=
                    timelineClips.length - 1
                  }
                  className="w-full px-4 py-2 text-left text-gray-500 text-sm hover:bg-gray-700 flex items-center space-x-3 transition-colors disabled:cursor-not-allowed"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12l2 2m0 0l-2 2m2-2H5m10-4l-2-2m0 0l2-2m-2 2h14"
                    />
                  </svg>
                  <span>Merge with next</span>
                </button>
                <button
                  onClick={() => handleDuplicateClip(contextMenu.clipId)}
                  className="w-full px-4 py-2 text-left text-white text-sm hover:bg-gray-700 flex items-center space-x-3 transition-colors"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                  <span>Duplicate clip</span>
                </button>
                <div className="h-px bg-gray-700 my-1"></div>
                <button
                  onClick={() => handleDeleteClip(contextMenu.clipId)}
                  className="w-full px-4 py-2 text-left text-red-400 text-sm hover:bg-gray-700 flex items-center space-x-3 transition-colors"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                  <span>Delete clip</span>
                </button>
              </div>
            </>,
            document.body
          )
        : null}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.08);
          border-radius: 20px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.15);
        }

        input[type="range"] {
          -webkit-appearance: none;
          background: rgba(255, 255, 255, 0.03);
          height: 4px;
          border-radius: 10px;
          box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.4);
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 14px;
          height: 14px;
          background: white;
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 0 12px rgba(168, 85, 247, 0.5);
          border: 3px solid #9333ea;
          transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        input[type="range"]::-webkit-slider-thumb:hover {
          transform: scale(1.3);
          box-shadow: 0 0 20px rgba(168, 85, 247, 0.7);
        }
      `}</style>
    </div>
  );
}

export async function getServerSideProps(context) {
  return { props: {} };
}
