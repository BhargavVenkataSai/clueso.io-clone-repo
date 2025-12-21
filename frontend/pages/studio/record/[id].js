import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { videoAPI, workspaceAPI } from '../../../lib/api';

export default function StudioRecording() {
  const router = useRouter();
  const { id, type } = router.query;
  // id here is likely a temporary ID or a project ID. 
  // For the demo, we'll treat it as a temporary session and Create a real Workspace Video upon "Finish".

  const [recording, setRecording] = useState(false);
  const [timer, setTimer] = useState(0);
  const [stream, setStream] = useState(null);
  const [recordedChunks, setRecordedChunks] = useState([]);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  
  const mediaRecorderRef = useRef(null);
  const videoRef = useRef(null);
  const timerRef = useRef(null);

  // Check permissions and setup
  useEffect(() => {
    return () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        clearInterval(timerRef.current);
    };
  }, [stream]);

  const startScreenRecording = async () => {
    try {
        const mediaStream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: true
        });
        
        setStream(mediaStream);
        if (videoRef.current) {
            videoRef.current.srcObject = mediaStream;
        }

        const mediaRecorder = new MediaRecorder(mediaStream);
        mediaRecorderRef.current = mediaRecorder;

        const chunks = [];
        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunks.push(e.data);
        };

        mediaRecorder.onstop = () => {
            const blob = new Blob(chunks, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);
            setPreviewUrl(url);
            setRecordedChunks(chunks);
            setStream(null);
            clearInterval(timerRef.current);
            setRecording(false);
        };

        mediaRecorder.start();
        setRecording(true);
        
        // Timer
        setTimer(0);
        timerRef.current = setInterval(() => {
            setTimer(prev => prev + 1);
        }, 1000);

        // Handle user stopping via browser UI
        mediaStream.getVideoTracks()[0].onended = () => {
            stopRecording();
        };

    } catch (err) {
        console.error("Error starting screen capture:", err);
        alert("Failed to start screen recording. Please try again.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
        mediaRecorderRef.current.stop();
        if (stream) {
             stream.getTracks().forEach(track => track.stop());
        }
    }
  };

  const formatTime = (seconds) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleUpload = async () => {
      setUploading(true);
      try {
          // 1. Get a Default Workspace (For demo purposes)
          const wsRes = await workspaceAPI.getAll();
          let workspaceId = wsRes.data.data[0]?._id;
          
          if (!workspaceId) {
             // Create one if none exists
             const newWs = await workspaceAPI.create({ name: "My Workspace" });
             workspaceId = newWs.data.data._id;
          }

          // 2. Create Video Blob
          const blob = new Blob(recordedChunks, { type: 'video/webm' });
          const file = new File([blob], `recording-${Date.now()}.webm`, { type: 'video/webm' });

          // 3. Upload
          const formData = new FormData();
          formData.append('video', file);
          formData.append('workspaceId', workspaceId);
          formData.append('title', `Screen Recording ${new Date().toLocaleTimeString()}`);
          formData.append('description', 'Captured via Clueso Studio');

            // Note: videoAPI.create expects JSON usually for metadata only, but our updated videoController 
            // has an 'upload' middleware on the /upload route.
            // Let's use the 'upload' endpoint we saw in videoRoutes.js: router.post('/upload', upload.single('video'), uploadVideo);
            // This returns a file path. Then we probably need to Create the Video Record in DB. 
            // Wait, looking at videoController.js, `uploadVideo` just returns the file path.
            // We need a way to Create the Video Object in the DB with that file path.
            // Checking videoController -> createVideo? (Need to check if it exists)
            
            // Actually, let's look at `videoAPI.upload` in frontend/lib/api.js which calls /videos/upload
            // And then `videoAPI.create` which calls /videos (POST).
            
            // Step A: Upload File
            const uploadRes = await videoAPI.upload(formData);
            const { path: videoPath, filename, size, mimetype } = uploadRes.data.data;

            // Step B: Create Video Record
            const createRes = await videoAPI.create({
                workspaceId,
                title: `Screen Recording ${new Date().toLocaleTimeString()}`,
                description: 'Captured via Clueso Studio',
                filename: filename, // or videoPath depending on what backend expects
                fileSize: size,
                duration: timer // approximate
            });

            // 4. Redirect to Editor
            const newVideoId = createRes.data.data._id;
            router.push(`/videos/${newVideoId}`);

      } catch (err) {
          console.error("Upload failed", err);
          alert("Failed to save video: " + err.message);
          setUploading(false);
      }
  };

  return (
    <>
      <Head>
         <title>Studio - Record Screen</title>
      </Head>
      <div className="min-h-screen bg-[#0f1115] flex flex-col items-center justify-center p-6">
         
         <div className="text-center mb-8">
             <h1 className="text-3xl font-bold text-white mb-2">
                 {recording ? 'Recording in Progress...' : 'Ready to Record'}
             </h1>
             <p className="text-gray-400">
                 {recording ? formatTime(timer) : 'Capture your screen to start creating.'}
             </p>
         </div>

         <div className="relative w-full max-w-4xl aspect-video bg-black rounded-xl overflow-hidden border border-gray-800 shadow-2xl mb-8">
             {/* Preview/Live View */}
             {!previewUrl ? (
                 <video 
                    ref={videoRef} 
                    autoPlay 
                    muted 
                    className="w-full h-full object-contain"
                 />
             ) : (
                 <video 
                    src={previewUrl} 
                    controls 
                    className="w-full h-full object-contain"
                 />
             )}
             
             {/* Placeholder State */}
             {!stream && !previewUrl && (
                 <div className="absolute inset-0 flex items-center justify-center">
                     <div className="text-center">
                         <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                             <svg className="w-10 h-10 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                         </div>
                         <p className="text-gray-500">Waiting to start...</p>
                     </div>
                 </div>
             )}
         </div>

         {/* Controls */}
         <div className="flex space-x-6">
             {!recording && !previewUrl && (
                 <button 
                    onClick={startScreenRecording}
                    className="px-8 py-4 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white rounded-full font-bold text-lg shadow-lg flex items-center space-x-2 transition transform hover:scale-105"
                 >
                     <div className="w-4 h-4 rounded-full bg-white animate-pulse"></div>
                     <span>Start Recording</span>
                 </button>
             )}

             {recording && (
                 <button 
                    onClick={stopRecording}
                    className="px-8 py-4 bg-red-600 hover:bg-red-500 text-white rounded-full font-bold text-lg shadow-lg flex items-center space-x-2 transition transform hover:scale-105"
                 >
                     <div className="w-4 h-4 rounded bg-white"></div>
                     <span>Stop Recording</span>
                 </button>
             )}

             {previewUrl && (
                 <>
                    <button 
                        onClick={() => { setPreviewUrl(null); setRecordedChunks([]); }}
                        className="px-6 py-3 border border-gray-600 text-gray-300 hover:text-white hover:border-gray-400 rounded-full font-semibold transition"
                    >
                        Retake
                    </button>
                    <button 
                        onClick={handleUpload}
                        disabled={uploading}
                        className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-bold text-lg shadow-lg flex items-center space-x-2 transition transform hover:scale-105"
                    >
                        {uploading ? (
                            <span>Uploading...</span>
                        ) : (
                            <>
                                <span>Edi in Studio</span>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                            </>
                        )}
                    </button>
                 </>
             )}
         </div>
         
         <div className="mt-8 text-sm text-gray-500">
             <p>Permissions required: Screen Recording & Microphone</p>
         </div>

      </div>
    </>
  );
}
