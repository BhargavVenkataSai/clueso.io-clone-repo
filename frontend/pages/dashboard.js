import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';
import { workspaceAPI, videoAPI, projectAPI } from '../lib/api';
import NewProjectModal from '../components/dashboard/NewProjectModal';
import ConfirmModal from '../components/common/ConfirmModal';

export default function Dashboard() {
  const { user, logout, loading: authLoading } = useAuth();
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState([]);
  const [currentWorkspace, setCurrentWorkspace] = useState(null);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateWorkspace, setShowCreateWorkspace] = useState(false);
  const [showCreateVideo, setShowCreateVideo] = useState(false);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [projects, setProjects] = useState([]);
  const [activeMenu, setActiveMenu] = useState('projects');
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, projectId: null, projectName: '' });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      loadWorkspaces();
      loadProjects();
    }
  }, [user]);

  useEffect(() => {
    if (currentWorkspace) {
      loadVideos();
    }
  }, [currentWorkspace]);

  const loadWorkspaces = async () => {
    try {
      const response = await workspaceAPI.getAll();
      const workspaceList = response.data.data;
      setWorkspaces(workspaceList);
      
      // Set first workspace as current if available
      if (workspaceList.length > 0 && !currentWorkspace) {
        setCurrentWorkspace(workspaceList[0]);
      } else if (workspaceList.length === 0) {
        setShowCreateWorkspace(true);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Failed to load workspaces:', error);
      setLoading(false);
    }
  };

  const loadVideos = async () => {
    if (!currentWorkspace) return;
    
    try {
      const response = await videoAPI.getAll(currentWorkspace._id);
      setVideos(response.data.data);
    } catch (error) {
      console.error('Failed to load videos:', error);
    }
  };

  const loadProjects = async () => {
    try {
      const response = await projectAPI.getAll();
      setProjects(response.data.data);
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  };

  const handleDeleteProject = async (projectId) => {
    try {
      await projectAPI.delete(projectId);
      setProjects(projects.filter(p => p._id !== projectId));
    } catch (error) {
      alert('Failed to delete project: ' + (error.response?.data?.error || error.message));
    }
  };

  const openDeleteConfirm = (project) => {
    setDeleteConfirm({ isOpen: true, projectId: project._id, projectName: project.name });
  };

  const closeDeleteConfirm = () => {
    setDeleteConfirm({ isOpen: false, projectId: null, projectName: '' });
  };

  const handleCreateWorkspace = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    try {
      const response = await workspaceAPI.create({
        name: formData.get('name'),
        description: formData.get('description'),
      });
      
      const newWorkspace = response.data.data;
      setWorkspaces([...workspaces, newWorkspace]);
      setCurrentWorkspace(newWorkspace);
      setShowCreateWorkspace(false);
    } catch (error) {
      alert('Failed to create workspace: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleCreateVideo = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    // Check if workspace exists
    if (!currentWorkspace) {
      alert('Please create a workspace first before creating videos.');
      setShowCreateVideo(false);
      setShowCreateWorkspace(true);
      return;
    }
    
    try {
      const response = await videoAPI.create({
        workspaceId: currentWorkspace._id,
        title: formData.get('title'),
        description: formData.get('description'),
        filename: 'demo-recording.mp4',
        fileSize: 15000000,
        duration: 120
      });
      
      setVideos([response.data.data, ...videos]);
      setShowCreateVideo(false);
      alert('Video uploaded! AI processing started...');
    } catch (error) {
      alert('Failed to create video: ' + (error.response?.data?.error || error.message));
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-xl text-white">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Dashboard - Clueso Clone</title>
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex">
        {/* Sidebar */}
        <div className="w-64 bg-gray-900 bg-opacity-90 flex flex-col border-r border-gray-800">
          {/* Logo */}
          <div className="p-6">
            <div className="flex items-center space-x-2 text-white text-xl font-bold">
              <span className="text-pink-500">●</span>
              <span>Clueso</span>
            </div>
          </div>

          {/* New Video Button */}
          <div className="px-4 mb-4">
            <button
              onClick={() => setShowNewProjectModal(true)}
              className="w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white px-4 py-3 rounded-lg hover:from-pink-600 hover:to-purple-600 transition font-semibold"
            >
              + New video
            </button>
          </div>

          {/* Search */}
          <div className="px-4 mb-6">
            <div className="relative">
              <input
                type="text"
                placeholder="Search..."
                className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg pl-10 focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
              <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2">
            <button
              onClick={() => setActiveMenu('home')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg mb-1 transition ${
                activeMenu === 'home' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span>Home</span>
            </button>

            <button
              onClick={() => setActiveMenu('projects')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg mb-1 transition ${
                activeMenu === 'projects' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <span>All Projects</span>
            </button>

            <button
              onClick={() => setActiveMenu('templates')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg mb-1 transition ${
                activeMenu === 'templates' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
              </svg>
              <span>Video Templates</span>
            </button>

            <button
              onClick={() => setActiveMenu('auto-update')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg mb-1 transition ${
                activeMenu === 'auto-update' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>Auto-update</span>
            </button>

            <button
              onClick={() => setActiveMenu('team')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg mb-1 transition ${
                activeMenu === 'team' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span>Team</span>
            </button>

            <button
              onClick={() => setActiveMenu('analytics')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg mb-1 transition ${
                activeMenu === 'analytics' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span>Analytics</span>
            </button>
          </nav>

          {/* Bottom Section */}
          <div className="p-4 space-y-1 border-t border-gray-800">
            <button className="w-full flex items-center space-x-3 px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Settings</span>
            </button>

            {/* User Profile */}
            <div className="py-2">
              <div className="flex items-center space-x-3 px-4 py-2 rounded-lg hover:bg-gray-800 transition cursor-pointer">
                <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-white font-semibold overflow-hidden flex-shrink-0">
                  {user?.avatar ? (
                    <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    <span>{user?.name?.charAt(0).toUpperCase() || 'U'}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm truncate">{user?.name || 'User'}</p>
                  <p className="text-gray-500 text-xs truncate">{user?.email || 'user@example.com'}</p>
                </div>
              </div>
            </div>

            {/* Sign Out */}
            <button 
              onClick={logout}
              className="w-full flex items-center space-x-3 px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Sign out</span>
            </button>

            {/* Team Switcher */}
            <div className="pt-2 border-t border-gray-800 mt-2">
              <button className="w-full flex items-center justify-between px-4 py-3 rounded-lg hover:bg-gray-800 transition group">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
                    {user?.name?.charAt(0).toUpperCase() || 'T'}
                  </div>
                  <div className="text-left">
                    <p className="text-white font-medium text-sm">{user?.name ? `${user.name.split(' ')[0]}'s Team` : 'My Team'}</p>
                  </div>
                </div>
                <svg className="w-4 h-4 text-gray-500 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          {/* Hero Section */}
          {activeMenu === 'home' && (
            <>
          <div className="relative px-12 py-16 text-center">
            {/* Decorative Graphics */}
            <div className="absolute left-0 top-0 w-64 h-64 opacity-30">
              <svg viewBox="0 0 200 200" className="text-purple-500">
                <path fill="currentColor" d="M30,50 Q50,20 80,40 T130,60 Q150,80 140,110 T100,150 Q70,160 50,140 T30,90 Z" opacity="0.3"/>
              </svg>
            </div>
            <div className="absolute right-0 top-0 w-64 h-64 opacity-30">
              <svg viewBox="0 0 200 200" className="text-pink-500">
                <path fill="currentColor" d="M170,40 Q180,70 160,100 T110,140 Q80,150 60,130 T50,80 Q60,50 90,45 T140,50 Z" opacity="0.3"/>
              </svg>
            </div>

            <div className="relative z-10">
              <h1 className="text-5xl font-bold text-white mb-4">Make something awesome</h1>
              <p className="text-xl text-gray-300 mb-12">Create stunning product videos and docs</p>
            </div>
          </div>

          {/* Create a new video Section */}
          <div className="px-12 mb-12">
            <div className="flex items-center space-x-2 text-white mb-4">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <h2 className="text-xl font-semibold">Create a new video</h2>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {/* Record Screen */}
              <button 
                onClick={() => setShowNewProjectModal(true)}
                className="bg-gray-800 bg-opacity-50 rounded-xl p-6 text-left hover:bg-opacity-70 transition group border border-gray-700"
              >
                <h3 className="text-white font-semibold mb-2">Record screen</h3>
                <p className="text-gray-400 text-sm mb-4">Turn a screen recording into a studio-style video.</p>
                <div className="bg-gray-700 rounded-lg h-32 flex items-center justify-center">
                  <svg className="w-16 h-16 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
              </button>

              {/* Upload a video */}
              <button 
                onClick={() => setShowCreateVideo(true)}
                className="bg-gray-800 bg-opacity-50 rounded-xl p-6 text-left hover:bg-opacity-70 transition group border border-gray-700"
              >
                <h3 className="text-white font-semibold mb-2">Upload a video</h3>
                <p className="text-gray-400 text-sm mb-4">Upload a screen recording. Get a studio-style video.</p>
                <div className="bg-gray-700 rounded-lg h-32 flex items-center justify-center">
                  <svg className="w-16 h-16 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
              </button>

              {/* Upload a slide deck */}
              <button
                onClick={() => setShowNewProjectModal(true)}
                className="bg-gray-800 bg-opacity-50 rounded-xl p-6 text-left hover:bg-opacity-70 transition group border border-gray-700"
              >
                <h3 className="text-white font-semibold mb-2">Upload a slide deck</h3>
                <p className="text-gray-400 text-sm mb-4">Turn any PDF or PPT into a narrated video.</p>
                <div className="bg-gray-700 rounded-lg h-32 flex items-center justify-center">
                  <svg className="w-16 h-16 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </button>
            </div>
          </div>

          {/* AI Tools Section */}
          <div className="px-12 mb-12">
            <div className="flex items-center space-x-2 text-white mb-4">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <h2 className="text-xl font-semibold">AI tools</h2>
              <span className="bg-pink-500 text-white text-xs px-2 py-1 rounded-full font-semibold">NEW</span>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {/* Cuts */}
              <div className="bg-gray-800 bg-opacity-50 rounded-xl p-6 border border-gray-700">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-white font-semibold mb-1">Cuts</h3>
                    <p className="text-gray-400 text-sm">Break down a long video into bite-sized clips and docs.</p>
                  </div>
                  <svg className="w-6 h-6 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
                  </svg>
                </div>
              </div>

              {/* Auto-update */}
              <div className="bg-gray-800 bg-opacity-50 rounded-xl p-6 border border-gray-700">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-white font-semibold mb-1">Auto-update</h3>
                    <p className="text-gray-400 text-sm">Update content when your product changes.</p>
                  </div>
                  <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
              </div>

              {/* Translator */}
              <div className="bg-gray-800 bg-opacity-50 rounded-xl p-6 border border-gray-700">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-white font-semibold mb-1">Translator</h3>
                    <p className="text-gray-400 text-sm">Dub a video into 37+ languages.</p>
                  </div>
                  <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Videos Table */}
          <div className="px-12 mb-12">
            <h2 className="text-xl font-semibold text-white mb-4">Recent videos</h2>
            
            <div className="bg-gray-800 bg-opacity-50 rounded-xl overflow-hidden border border-gray-700">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left px-6 py-4 text-gray-400 font-semibold text-sm">Project</th>
                    <th className="text-left px-6 py-4 text-gray-400 font-semibold text-sm">Creator</th>
                    <th className="text-left px-6 py-4 text-gray-400 font-semibold text-sm">Updated</th>
                    <th className="text-left px-6 py-4 text-gray-400 font-semibold text-sm">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {videos.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="px-6 py-8 text-center">
                        <div className="text-gray-400">
                          <p className="text-lg mb-2">No projects yet</p>
                          <p className="text-sm">Create your first video to get started</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    videos.map((video) => (
                      <tr key={video._id} className="border-b border-gray-700 hover:bg-gray-700 hover:bg-opacity-30 cursor-pointer" onClick={() => router.push(`/videos/${video._id}`)}>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded bg-gradient-to-r from-pink-500 to-purple-500 flex items-center justify-center text-white">
                              {video.title.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-white font-medium">{video.title}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <div className="w-6 h-6 rounded-full bg-gray-600 flex items-center justify-center text-white text-xs">
                              {user?.name?.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-gray-300 text-sm">{user?.name}</span>
                            <br />
                            <span className="text-gray-500 text-xs">{user?.email}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-300 text-sm">
                          {new Date(video.updatedAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-6 py-4 text-gray-300 text-sm">
                          {new Date(video.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Getting Started Section */}
          <div className="px-12 mb-12">
            <h2 className="text-xl font-semibold text-white mb-4">Getting started</h2>
            
            <div className="grid md:grid-cols-3 gap-6">
              {/* Introduction to Clueso */}
              <div className="bg-gray-800 bg-opacity-50 rounded-xl overflow-hidden border border-gray-700 hover:border-gray-600 transition cursor-pointer">
                <div className="bg-gradient-to-br from-pink-500 to-purple-600 h-40 flex items-center justify-center">
                  <div className="text-white text-center">
                    <svg className="w-12 h-12 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm1 11H9v-2h2v2zm0-4H9V5h2v4z"/>
                    </svg>
                    <p className="text-sm">Tutorial</p>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="text-white font-semibold mb-1">Introduction to Clueso</h3>
                  <p className="text-gray-400 text-sm">Learn the basics</p>
                </div>
              </div>

              {/* Create your first video */}
              <div className="bg-gray-800 bg-opacity-50 rounded-xl overflow-hidden border border-gray-700 hover:border-gray-600 transition cursor-pointer">
                <div className="bg-gradient-to-br from-blue-500 to-cyan-600 h-40 flex items-center justify-center">
                  <div className="text-white text-center">
                    <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <p className="text-sm">Get Started</p>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="text-white font-semibold mb-1">Create your first video</h3>
                  <p className="text-gray-400 text-sm">Quick start guide</p>
                </div>
              </div>

              {/* Invite team members */}
              <div className="bg-gray-800 bg-opacity-50 rounded-xl p-6 border border-gray-700 flex flex-col justify-center">
                <div className="flex items-start space-x-3 mb-4">
                  <svg className="w-8 h-8 text-pink-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <div className="flex-1">
                    <h3 className="text-white font-semibold mb-1">Invite team members</h3>
                    <p className="text-gray-400 text-sm mb-3">Create great content with your team</p>
                  </div>
                </div>
                <button className="bg-gradient-to-r from-pink-500 to-purple-500 text-white px-4 py-2 rounded-lg hover:from-pink-600 hover:to-purple-600 transition text-sm font-semibold">
                  Add users
                </button>
              </div>
            </div>
          </div>

            </>
          )}

          {/* Projects View */}
          {activeMenu === 'projects' && (
            <div className="px-12 py-8">
              <div className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-bold text-white">Recent projects</h1>
                <button
                  onClick={() => setShowNewProjectModal(true)}
                  className="bg-gradient-to-r from-pink-500 to-purple-500 text-white px-6 py-3 rounded-lg hover:from-pink-600 hover:to-purple-600 transition font-semibold flex items-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>New Project</span>
                </button>
              </div>

              {projects.length === 0 ? (
                <div className="bg-gray-800 bg-opacity-50 rounded-xl border border-gray-700 p-12 text-center">
                  <div className="text-gray-400 mb-4">
                    <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <p className="text-xl font-semibold mb-2">No projects yet</p>
                    <p>Create a project to start collecting feedback</p>
                  </div>
                  <button
                    onClick={() => setShowNewProjectModal(true)}
                    className="text-pink-400 hover:text-pink-300 font-medium"
                  >
                    Create your first project &rarr;
                  </button>
                </div>
              ) : (
                <div className="bg-gray-800 bg-opacity-50 rounded-xl border border-gray-700 overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-900 bg-opacity-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Project</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Creator</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Updated</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Created</th>
                        <th className="px-6 py-4 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {projects.map((project) => (
                        <tr 
                          key={project._id}
                          className="hover:bg-gray-700 hover:bg-opacity-30 transition group"
                        >
                          <td className="px-6 py-4">
                            <div 
                              onClick={() => router.push(`/projects/${project._id}`)}
                              className="flex items-center space-x-3 cursor-pointer"
                            >
                              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                                {project.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-white font-medium group-hover:text-pink-400 transition">{project.name}</p>
                                {project.description && (
                                  <p className="text-gray-400 text-sm line-clamp-1">{project.description}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-white text-xs font-bold">
                                {user?.name?.charAt(0).toUpperCase() || 'U'}
                              </div>
                              <div>
                                <p className="text-white text-sm">{user?.name || 'Unknown User'}</p>
                                <p className="text-gray-400 text-xs">{user?.email || ''}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-gray-300 text-sm">
                            {new Date(project.updatedAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="px-6 py-4 text-gray-300 text-sm">
                            {new Date(project.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openDeleteConfirm(project);
                              }}
                              className="text-gray-400 hover:text-red-400 transition p-2 rounded-lg hover:bg-red-900 hover:bg-opacity-20"
                              title="Delete project"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Create Video Modal */}
        {showCreateVideo && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-xl max-w-md w-full p-6 border border-gray-700">
              <h2 className="text-2xl font-bold text-white mb-4">Create Video</h2>
              <form onSubmit={handleCreateVideo} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Video Title</label>
                  <input
                    name="title"
                    type="text"
                    required
                    className="w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500 focus:outline-none"
                    placeholder="How to use feature X"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                  <textarea
                    name="description"
                    className="w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500 focus:outline-none"
                    rows={3}
                    placeholder="Optional description..."
                  />
                </div>
                <div className="bg-blue-900 bg-opacity-30 border border-blue-700 p-3 rounded-lg text-sm text-blue-300">
                  📝 Note: File upload is mocked. In production, you would upload actual video files here.
                </div>
                <div className="flex space-x-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateVideo(false)}
                    className="flex-1 px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg hover:from-pink-600 hover:to-purple-600"
                  >
                    Upload
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Create Workspace Modal */}
        {showCreateWorkspace && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-xl max-w-md w-full p-6 border border-gray-700">
              <h2 className="text-2xl font-bold text-white mb-4">Create Workspace</h2>
              <form onSubmit={handleCreateWorkspace} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Workspace Name</label>
                  <input
                    name="name"
                    type="text"
                    required
                    className="w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500 focus:outline-none"
                    placeholder="My Awesome Workspace"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Description (Optional)</label>
                  <textarea
                    name="description"
                    className="w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500 focus:outline-none"
                    rows={3}
                    placeholder="Description for your workspace..."
                  />
                </div>
                <div className="flex space-x-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateWorkspace(false)}
                    className="flex-1 px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg hover:from-pink-600 hover:to-purple-600"
                  >
                    Create
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        
        {/* New Project Modal */}
        <NewProjectModal 
            isOpen={showNewProjectModal} 
            onClose={() => setShowNewProjectModal(false)}
        />

        {/* Delete Confirmation Modal */}
        <ConfirmModal
          isOpen={deleteConfirm.isOpen}
          onClose={closeDeleteConfirm}
          onConfirm={() => handleDeleteProject(deleteConfirm.projectId)}
          title="Delete Project"
          message={`Are you sure you want to delete "${deleteConfirm.projectName}"? This action cannot be undone.`}
          confirmText="Delete Project"
          variant="danger"
        />
        
      </div>
    </>
  );
}
