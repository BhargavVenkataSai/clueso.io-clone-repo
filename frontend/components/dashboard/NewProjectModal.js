import { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { useRouter } from 'next/router';
import { projectAPI } from '../../lib/api';

export default function NewProjectModal({ isOpen, onClose }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [file, setFile] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [processingStatus, setProcessingStatus] = useState('');

  const handleOptionSelect = (type) => {
    setSelectedOption(type);
  };

  const handleBack = () => {
    setSelectedOption(null);
    setFile(null);
    setError('');
    setProcessingStatus('');
  };

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setProcessingStatus('');

    const formData = new FormData();
    formData.append('name', e.target.name.value);
    formData.append('description', e.target.description.value);
    
    if (e.target.website && e.target.website.value) {
        formData.append('website', e.target.website.value);
    }

    if (file) {
        formData.append('file', file);
        
        if (file.type === 'application/pdf') {
            // Let backend handle PDF-to-PNG conversion
            setProcessingStatus('Uploading PDF for processing...');
        } else if (file.type.startsWith('image/')) {
            // For images, treat the image itself as the single slide
            formData.append('slides', file, 'slide-1.jpg');
        } else if (file.type.startsWith('video/')) {
            // Video files will be uploaded separately after project creation
            setProcessingStatus('Video will be uploaded after project creation...');
        }
    }

    setProcessingStatus('Creating project...');

    try {
      const response = await projectAPI.create(formData);
      const project = response.data.data;
      
      // If a video file was selected, upload it to the project
      if (file && file.type.startsWith('video/')) {
        setProcessingStatus('Uploading video...');
        try {
          const videoFormData = new FormData();
          videoFormData.append('video', file);
          await projectAPI.uploadVideo(project._id, videoFormData);
          console.log('✅ Video uploaded successfully');
        } catch (videoErr) {
          console.error('Failed to upload video:', videoErr);
          // Don't fail project creation, just log the error
        }
      }
      
      router.push(`/projects/${project._id}`);
      onClose();
    } catch (err) {
      console.error('Failed to create project:', err);
      setError(err.response?.data?.error || 'Failed to create project');
    } finally {
      setLoading(false);
      setProcessingStatus('');
    }
  };

  const renderSelection = () => (
    <div className="space-y-4">
      <button
        onClick={() => handleOptionSelect('blank')}
        className="w-full flex items-center p-4 bg-[#1a1d21] border border-gray-800 rounded-xl hover:border-blue-500 hover:bg-[#22252a] transition-all group text-left"
      >
        <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 mr-4 group-hover:scale-110 transition-transform">
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </div>
        <div>
          <h4 className="text-white font-semibold text-lg">Start blank project</h4>
          <p className="text-gray-400 text-sm">Create a new project from scratch.</p>
        </div>
      </button>

      <button
        onClick={() => handleOptionSelect('recording')}
        className="w-full flex items-center p-4 bg-[#1a1d21] border border-pink-500/30 rounded-xl hover:border-pink-500 hover:bg-[#22252a] transition-all group text-left relative overflow-hidden"
      >
        <div className="absolute top-2 right-2 bg-pink-500/20 text-pink-400 text-xs px-2 py-1 rounded-full font-medium flex items-center">
          <span className="w-1.5 h-1.5 bg-pink-500 rounded-full mr-1.5 animate-pulse"></span>
          Recommended
        </div>
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center flex-shrink-0 mr-4 group-hover:scale-110 transition-transform">
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </div>
        <div>
          <h4 className="text-white font-semibold text-lg">Capture screen-recording</h4>
          <p className="text-gray-400 text-sm">Record any process on your screen.</p>
        </div>
      </button>

      <button
        onClick={() => handleOptionSelect('video')}
        className="w-full flex items-center p-4 bg-[#1a1d21] border border-gray-800 rounded-xl hover:border-blue-500 hover:bg-[#22252a] transition-all group text-left"
      >
        <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0 mr-4 group-hover:scale-110 transition-transform">
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h4 className="text-white font-semibold text-lg">Upload a video</h4>
          <p className="text-gray-400 text-sm">Upload a screen-recording from your computer.</p>
        </div>
      </button>

      <button
        onClick={() => handleOptionSelect('slide')}
        className="w-full flex items-center p-4 bg-[#1a1d21] border border-gray-800 rounded-xl hover:border-blue-500 hover:bg-[#22252a] transition-all group text-left"
      >
        <div className="w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0 mr-4 group-hover:scale-110 transition-transform">
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div>
          <h4 className="text-white font-semibold text-lg">Upload a slide deck</h4>
          <p className="text-gray-400 text-sm">Turn any PDF or PPT into a narrated video.</p>
        </div>
      </button>
    </div>
  );

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-[#0f1115] border border-gray-800 p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    {selectedOption && (
                      <button 
                        onClick={handleBack}
                        className="p-1 rounded-full hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                    )}
                    <div>
                      <Dialog.Title as="h3" className="text-xl font-bold leading-6 text-white">
                        {!selectedOption ? 'New project' : 'Project Details'}
                      </Dialog.Title>
                      {!selectedOption && (
                        <p className="text-sm text-gray-400 mt-1">Clueso creates stunning videos and step-by-step guides</p>
                      )}
                    </div>
                  </div>
                  <button onClick={onClose} className="text-gray-400 hover:text-white">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded text-red-500 text-sm">
                    {error}
                  </div>
                )}

                {!selectedOption ? renderSelection() : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Project Name
                      </label>
                      <input
                        type="text"
                        name="name"
                        required
                        className="w-full bg-[#1a1d21] border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                        placeholder="My Awesome Project"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Description
                      </label>
                      <textarea
                        name="description"
                        rows="3"
                        className="w-full bg-[#1a1d21] border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                        placeholder="What is this project about?"
                      />
                    </div>

                    {selectedOption === 'slide' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                          Upload Document (PDF, DOCX, TXT, Images)
                        </label>
                        <div className="relative border-2 border-dashed border-gray-700 rounded-lg p-6 hover:border-blue-500 transition-colors">
                            <input
                                type="file"
                                onChange={handleFileChange}
                                accept=".pdf,.docx,.txt,.png,.jpg,.jpeg"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <div className="text-center">
                                {file ? (
                                    <div className="text-blue-400 font-medium truncate">
                                        {file.name}
                                    </div>
                                ) : (
                                    <>
                                        <svg className="mx-auto h-12 w-12 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                        </svg>
                                        <p className="mt-1 text-sm text-gray-400">
                                            Click to upload or drag and drop
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            PDF, DOCX, TXT, PNG, JPG
                                        </p>
                                    </>
                                )}
                            </div>
                        </div>
                      </div>
                    )}

                    {selectedOption === 'video' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                          Upload Video (MP4, MOV)
                        </label>
                        <div className="relative border-2 border-dashed border-gray-700 rounded-lg p-6 hover:border-blue-500 transition-colors">
                            <input
                                type="file"
                                onChange={handleFileChange}
                                accept="video/*"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <div className="text-center">
                                {file ? (
                                    <div className="text-blue-400 font-medium truncate">
                                        {file.name}
                                    </div>
                                ) : (
                                    <>
                                        <svg className="mx-auto h-12 w-12 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                        </svg>
                                        <p className="mt-1 text-sm text-gray-400">
                                            Click to upload video
                                        </p>
                                    </>
                                )}
                            </div>
                        </div>
                      </div>
                    )}

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center" aria-hidden="true">
                        <div className="w-full border-t border-gray-800" />
                      </div>
                      <div className="relative flex justify-center">
                        <span className="bg-[#0f1115] px-2 text-sm text-gray-500">OR</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1">
                        Website URL (Optional)
                      </label>
                      <input
                        type="url"
                        name="website"
                        className="w-full bg-[#1a1d21] border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                        placeholder="https://example.com"
                      />
                    </div>

                    <div className="mt-6 flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                      >
                        {loading ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            {processingStatus || 'Creating...'}
                          </>
                        ) : (
                          'Create Project'
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

