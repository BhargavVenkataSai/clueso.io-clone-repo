import { useState } from 'react';

export default function ResourcePanel({ projectId }) {
    const [uploading, setUploading] = useState(false);
    const [generating, setGenerating] = useState(false);

    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('document', file);
            await ragAPI.upload(formData);
            alert("Document uploaded successfully!");
        } catch (e) {
            console.error(e);
            alert("Failed to upload document.");
        } finally {
            setUploading(false);
        }
    };

    const handleGenerateScript = async () => {
        setGenerating(true);
        try {
             const res = await ragAPI.generateScript({ prompt: "Create a summary video script from the documents" });
             console.log("Generated script:", res.data);
             alert("Script generated! Check console for JSON output.");
        } catch (e) {
            console.error(e);
            alert("Failed to generate script.");
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div className="flex flex-col h-full">
             <div className="p-4 border-b border-gray-800">
                <h2 className="text-lg font-bold text-white mb-2">Knowledge Base</h2>
                <p className="text-xs text-gray-400">Upload documents to help AI generate better scripts.</p>
            </div>

            <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                <div className="border-2 border-dashed border-gray-700 rounded-lg p-6 flex flex-col items-center justify-center text-center transition hover:border-pink-500/50 hover:bg-gray-800/50 cursor-pointer relative">
                    <input 
                        type="file" 
                        className="absolute inset-0 opacity-0 cursor-pointer" 
                        onChange={handleUpload}
                        disabled={uploading}
                    />
                    <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center mb-3">
                         <svg className="w-5 h-5 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                    </div>
                    {uploading ? (
                         <span className="text-sm text-gray-300">Uploading...</span>
                    ) : (
                        <>
                             <span className="text-sm font-medium text-white">Click to upload</span>
                             <span className="text-xs text-gray-500 mt-1">PDF, TXT, MD allowed</span>
                        </>
                    )}
                </div>

                {/* File List Mock */}
                <div className="space-y-2">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Uploaded Resources</h3>
                    <div className="bg-[#23232f] p-3 rounded-lg flex items-center justify-between">
                         <div className="flex items-center space-x-3">
                             <div className="w-8 h-8 bg-red-900/50 rounded flex items-center justify-center text-red-400 text-xs font-bold">PDF</div>
                             <div className="flex flex-col">
                                 <span className="text-sm text-gray-200">Product_Specs.pdf</span>
                                 <span className="text-[10px] text-gray-500">2.4 MB</span>
                             </div>
                         </div>
                         <button className="text-gray-500 hover:text-red-400"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                    </div>
                </div>
            </div>

            <div className="p-4 border-t border-gray-800">
                 <button 
                    onClick={handleGenerateScript}
                    disabled={generating}
                    className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg py-3 font-bold shadow-lg hover:shadow-pink-500/25 transition disabled:opacity-50"
                >
                    {generating ? 'Reading Docs...' : 'Generate New Script'}
                 </button>
            </div>
        </div>
    )
}
