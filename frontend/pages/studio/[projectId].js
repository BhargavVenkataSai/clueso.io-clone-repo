import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import ScriptPanel from '../../components/studio/ScriptPanel';
import ResourcePanel from '../../components/studio/ResourcePanel';
import VideoPreview from '../../components/studio/VideoPreview';
import Timeline from '../../components/studio/Timeline';
import { projectAPI } from '../../lib/api';

export default function StudioPage() {
  const router = useRouter();
  const { projectId } = router.query;
  
  const [activeTab, setActiveTab] = useState('script'); // script, resources, elements
  const [project, setProject] = useState(null);

  useEffect(() => {
    if (projectId) {
      // Fetch project data
      // setProject(data)
    }
  }, [projectId]);

  return (
    <div className="flex flex-col h-screen bg-[#0f0f15] text-white overflow-hidden font-sans">
      <Head>
        <title>Studio - Clueso Clone</title>
      </Head>

      {/* Header */}
      <header className="h-14 border-b border-gray-800 flex items-center justify-between px-4 bg-[#1a1a24]">
        <div className="flex items-center space-x-4">
            <div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-purple-600 rounded-lg flex items-center justify-center font-bold">
                Cl
            </div>
            <h1 className="font-medium text-gray-200">Untitled Project</h1>
        </div>
        
        <div className="flex items-center space-x-2">
             <div className="flex bg-gray-800 rounded-lg p-1">
                 <button className="px-3 py-1 bg-gray-700 rounded-md text-sm font-medium">Video</button>
                 <button className="px-3 py-1 text-gray-400 text-sm font-medium hover:text-white">Article</button>
             </div>
        </div>

        <div className="flex items-center space-x-3">
            <button className="p-2 text-gray-400 hover:text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15v4a2 2 0 002 2h14a2 2 0 002-2v-4M17 9l-5 5-5-5M12 12.875V3" /></svg>
            </button>
            <button className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-4 py-1.5 rounded-lg text-sm font-bold flex items-center space-x-1 hover:brightness-110">
                <span>Share</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
            </button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <aside className="w-16 flex-shrink-0 bg-[#16161e] border-r border-gray-800 flex flex-col items-center py-4 space-y-6">
             <SidebarIcon label="Script" active={activeTab === 'script'} onClick={() => setActiveTab('script')} icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />} />
             <SidebarIcon label="Resources" active={activeTab === 'resources'} onClick={() => setActiveTab('resources')} icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />} />
             <SidebarIcon label="Media" active={activeTab === 'media'} onClick={() => setActiveTab('media')} icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />} />
        </aside>

        {/* Secondary Sidebar (Panel Content) */}
        <aside className="w-80 bg-[#1a1a24] border-r border-gray-800 flex flex-col min-w-[320px]">
            {activeTab === 'script' && <ScriptPanel projectId={projectId} />}
            {activeTab === 'resources' && <ResourcePanel projectId={projectId} />}
            {activeTab === 'media' && <div className="p-4 text-gray-400">Media Library</div>}
        </aside>

        {/* Canvas / Preview Area */}
        <main className="flex-1 bg-[#0f0f15] relative flex flex-col">
            <div className="flex-1 p-8 flex items-center justify-center relative bg-grid-pattern">
                 <VideoPreview />
            </div>
            
            {/* Bottom Timeline */}
            <div className="h-64 bg-[#16161e] border-t border-gray-800">
                <Timeline />
            </div>
        </main>
      </div>
    </div>
  );
}

function SidebarIcon({ icon, label, active, onClick }) {
    return (
        <button 
            onClick={onClick}
            className={`flex flex-col items-center space-y-1 group ${active ? 'text-pink-500' : 'text-gray-400 hover:text-gray-200'}`}
        >
            <div className={`p-2 rounded-lg transition ${active ? 'bg-pink-500/10' : 'group-hover:bg-gray-800'}`}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {icon}
                </svg>
            </div>
            <span className="text-[10px] font-medium">{label}</span>
        </button>
    )
}
