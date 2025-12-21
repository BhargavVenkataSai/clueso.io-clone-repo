import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { useAuth } from '../../contexts/AuthContext';
import { projectAPI, feedbackAPI, aiAPI } from '../../lib/api';

export default function ProjectDetails() {
  const { user, logout, loading: authLoading } = useAuth();
  const router = useRouter();
  const { id } = router.query;
  
  const [project, setProject] = useState(null);
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [projectSummary, setProjectSummary] = useState(null);
  const [generatingSummary, setGeneratingSummary] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && id) {
      loadProjectData();
    }
  }, [user, id]);

  const loadProjectData = async () => {
    try {
      const [projectRes, feedbackRes] = await Promise.all([
        projectAPI.getById(id),
        feedbackAPI.getAll(id)
      ]);
      
      setProject(projectRes.data.data);
      setFeedbacks(feedbackRes.data.data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load project data:', error);
      setLoading(false);
    }
  };

  const handleGenerateProjectSummary = async () => {
    setGeneratingSummary(true);
    try {
      const response = await aiAPI.summarizeProject(id);
      setProjectSummary(response.data.data);
    } catch (error) {
      alert('Failed to generate summary: ' + (error.response?.data?.error || error.message));
    } finally {
      setGeneratingSummary(false);
    }
  };

  const handleDeleteFeedback = async (feedbackId) => {
    if (!confirm('Are you sure you want to delete this feedback?')) return;
    
    try {
      await feedbackAPI.delete(feedbackId);
      setFeedbacks(feedbacks.filter(f => f._id !== feedbackId));
      if (selectedFeedback && selectedFeedback._id === feedbackId) {
        setSelectedFeedback(null);
      }
    } catch (error) {
      alert('Failed to delete feedback: ' + (error.response?.data?.error || error.message));
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-xl text-white">Loading...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-xl text-white">Project not found</div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{project.name} - Clueso Clone</title>
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex">
        {/* Sidebar */}
        <div className="w-64 bg-gray-900 bg-opacity-90 flex flex-col border-r border-gray-800">
          <div className="p-6">
            <Link href="/dashboard" className="flex items-center space-x-2 text-white text-xl font-bold">
              <span className="text-pink-500">●</span>
              <span>Clueso</span>
            </Link>
          </div>
          
          <nav className="flex-1 px-2">
            <Link href="/dashboard">
              <div className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg mb-1 transition text-gray-400 hover:text-white hover:bg-gray-800`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span>Home</span>
              </div>
            </Link>
            <div className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg mb-1 transition bg-gray-800 text-white`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <span>Projects</span>
            </div>
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="flex items-center space-x-4 mb-2">
                <Link href="/dashboard" className="text-gray-400 hover:text-white">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </Link>
                <h1 className="text-3xl font-bold text-white">{project.name}</h1>
              </div>
              <p className="text-gray-400">{project.description}</p>
            </div>
            <div className="flex space-x-3">
              <button 
                onClick={handleGenerateProjectSummary}
                disabled={generatingSummary}
                className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white px-4 py-2 rounded-lg hover:from-purple-600 hover:to-indigo-600 disabled:opacity-50"
              >
                {generatingSummary ? 'Generating...' : 'Generate AI Summary'}
              </button>
              <Link href={`/submit/${project.publicSlug}`} target="_blank">
                <button className="bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-700 hover:bg-gray-700">
                  Public Form
                </button>
              </Link>
            </div>
          </div>

          {/* AI Summary Section */}
          {projectSummary && (
            <div className="bg-gradient-to-br from-indigo-900/50 to-purple-900/50 rounded-xl p-6 border border-indigo-500/30 mb-8">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                <svg className="w-6 h-6 mr-2 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                AI Project Summary
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gray-900/50 p-4 rounded-lg">
                  <h4 className="text-sm font-semibold text-gray-400 uppercase mb-2">Overall Sentiment</h4>
                  <div className="text-2xl font-bold capitalize text-white">
                    {projectSummary.sentiment}
                  </div>
                </div>
                
                <div className="bg-gray-900/50 p-4 rounded-lg">
                  <h4 className="text-sm font-semibold text-gray-400 uppercase mb-2">Key Themes</h4>
                  <ul className="list-disc list-inside text-gray-200 space-y-1">
                    {projectSummary.themes?.map((theme, i) => (
                      <li key={i}>{theme}</li>
                    ))}
                  </ul>
                </div>
                
                <div className="bg-gray-900/50 p-4 rounded-lg">
                  <h4 className="text-sm font-semibold text-gray-400 uppercase mb-2">Actionable Insights</h4>
                  <ul className="list-disc list-inside text-gray-200 space-y-1">
                    {projectSummary.insights?.map((insight, i) => (
                      <li key={i}>{insight}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Feedback List */}
          <div className="bg-gray-800 bg-opacity-50 rounded-xl overflow-hidden border border-gray-700">
            <div className="p-6 border-b border-gray-700 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-white">Feedback ({feedbacks.length})</h2>
            </div>
            
            <table className="w-full">
              <thead>
                <tr className="bg-gray-900 bg-opacity-50">
                  <th className="text-left px-6 py-4 text-gray-400 font-semibold text-sm">Message</th>
                  <th className="text-left px-6 py-4 text-gray-400 font-semibold text-sm">Sentiment</th>
                  <th className="text-left px-6 py-4 text-gray-400 font-semibold text-sm">Date</th>
                  <th className="text-right px-6 py-4 text-gray-400 font-semibold text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {feedbacks.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-12 text-center text-gray-400">
                      No feedback collected yet.
                    </td>
                  </tr>
                ) : (
                  feedbacks.map((feedback) => (
                    <tr 
                      key={feedback._id} 
                      className="border-b border-gray-700 hover:bg-gray-700 hover:bg-opacity-30 cursor-pointer"
                      onClick={() => setSelectedFeedback(feedback)}
                    >
                      <td className="px-6 py-4">
                        <div className="text-white font-medium truncate max-w-md">{feedback.message}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium capitalize
                          ${feedback.sentiment === 'positive' ? 'bg-green-900 text-green-300' : 
                            feedback.sentiment === 'negative' ? 'bg-red-900 text-red-300' : 
                            'bg-gray-700 text-gray-300'}`}>
                          {feedback.sentiment}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-400 text-sm">
                        {new Date(feedback.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDeleteFeedback(feedback._id); }}
                          className="text-gray-500 hover:text-red-400"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Feedback Detail Modal */}
        {selectedFeedback && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-xl max-w-2xl w-full p-6 border border-gray-700 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-2xl font-bold text-white">Feedback Details</h2>
                <button 
                  onClick={() => setSelectedFeedback(null)}
                  className="text-gray-400 hover:text-white"
                >
                  Close
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 uppercase mb-2">Message</h3>
                  <div className="bg-gray-900 p-4 rounded-lg text-white whitespace-pre-wrap">
                    {selectedFeedback.message}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-400 uppercase mb-2">Sentiment</h3>
                  <p className="text-white capitalize">{selectedFeedback.sentiment}</p>
                </div>

                {selectedFeedback.submitter && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-400 uppercase mb-2">Submitter</h3>
                    <div className="bg-gray-700 bg-opacity-30 p-3 rounded-lg">
                      <p className="text-white text-sm font-medium">{selectedFeedback.submitter.name || 'Anonymous'}</p>
                      <p className="text-gray-400 text-xs">{selectedFeedback.submitter.email}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
