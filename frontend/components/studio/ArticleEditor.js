import { useState, useRef } from 'react';

/**
 * ArticleEditor - Rich text editor for article content
 * Provides formatting toolbar and WYSIWYG editing experience
 */
export default function ArticleEditor({ 
    content, 
    onChange, 
    projectName = 'Untitled',
    screenshots = [],
    isLoading = false 
}) {
    const editorRef = useRef(null);
    const [showLinkInput, setShowLinkInput] = useState(false);
    const [linkUrl, setLinkUrl] = useState('');

    // Execute formatting command
    const execCommand = (command, value = null) => {
        document.execCommand(command, false, value);
        editorRef.current?.focus();
    };

    // Insert link
    const insertLink = () => {
        if (linkUrl) {
            execCommand('createLink', linkUrl);
            setLinkUrl('');
            setShowLinkInput(false);
        }
    };

    // Format button component
    const FormatButton = ({ command, icon, title, active = false }) => (
        <button
            onMouseDown={(e) => {
                e.preventDefault();
                execCommand(command);
            }}
            className={`p-2 rounded hover:bg-gray-700 transition ${active ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
            title={title}
        >
            {icon}
        </button>
    );

    return (
        <div className="flex-1 flex flex-col h-full bg-[#0f1115] overflow-hidden">
            {/* Formatting Toolbar */}
            <div className="flex items-center space-x-1 p-2 bg-[#16181d] border-b border-gray-800">
                {/* Text Style Dropdown */}
                <select className="bg-[#23232f] text-gray-300 text-sm rounded px-2 py-1 border border-gray-700 mr-2">
                    <option value="p">Paragraph</option>
                    <option value="h1">Heading 1</option>
                    <option value="h2">Heading 2</option>
                    <option value="h3">Heading 3</option>
                </select>

                <div className="w-px h-5 bg-gray-700 mx-1"></div>

                {/* Bold */}
                <FormatButton 
                    command="bold" 
                    title="Bold (Ctrl+B)"
                    icon={<span className="font-bold text-sm">B</span>}
                />

                {/* Italic */}
                <FormatButton 
                    command="italic" 
                    title="Italic (Ctrl+I)"
                    icon={<span className="italic text-sm">I</span>}
                />

                {/* Underline */}
                <FormatButton 
                    command="underline" 
                    title="Underline (Ctrl+U)"
                    icon={<span className="underline text-sm">U</span>}
                />

                {/* Strikethrough */}
                <FormatButton 
                    command="strikeThrough" 
                    title="Strikethrough"
                    icon={<span className="line-through text-sm">S</span>}
                />

                <div className="w-px h-5 bg-gray-700 mx-1"></div>

                {/* Link */}
                <div className="relative">
                    <button
                        onClick={() => setShowLinkInput(!showLinkInput)}
                        className="p-2 rounded hover:bg-gray-700 transition text-gray-400 hover:text-white"
                        title="Insert Link"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                    </button>
                    {showLinkInput && (
                        <div className="absolute top-full left-0 mt-1 bg-[#1a1d21] border border-gray-700 rounded-lg p-2 shadow-xl z-10 flex space-x-2">
                            <input
                                type="url"
                                placeholder="https://..."
                                value={linkUrl}
                                onChange={(e) => setLinkUrl(e.target.value)}
                                className="bg-[#23232f] text-white text-sm rounded px-2 py-1 border border-gray-600 w-48"
                            />
                            <button
                                onClick={insertLink}
                                className="px-2 py-1 bg-pink-600 text-white text-sm rounded hover:bg-pink-500"
                            >
                                Add
                            </button>
                        </div>
                    )}
                </div>

                <div className="w-px h-5 bg-gray-700 mx-1"></div>

                {/* Ordered List */}
                <FormatButton 
                    command="insertOrderedList" 
                    title="Numbered List"
                    icon={
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20h14v-2H7v2zm0-10h14V8H7v2zm0-8h14V0H7v2zm-4 6h1V4H2v1h1v3zm-1 4h1v1H2v1h2v1H1v1h3V9H1v1zm1 7c-1 0-1 1-1 1h2v-1H3z" />
                        </svg>
                    }
                />

                {/* Unordered List */}
                <FormatButton 
                    command="insertUnorderedList" 
                    title="Bullet List"
                    icon={
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    }
                />

                <div className="w-px h-5 bg-gray-700 mx-1"></div>

                {/* Code Block */}
                <button
                    onClick={() => execCommand('formatBlock', 'pre')}
                    className="p-2 rounded hover:bg-gray-700 transition text-gray-400 hover:text-white"
                    title="Code Block"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                </button>

                {/* Insert Image */}
                <button
                    className="p-2 rounded hover:bg-gray-700 transition text-gray-400 hover:text-white"
                    title="Insert Image"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                </button>

                <div className="flex-1"></div>

                {/* Undo/Redo */}
                <FormatButton 
                    command="undo" 
                    title="Undo (Ctrl+Z)"
                    icon={
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                        </svg>
                    }
                />
                <FormatButton 
                    command="redo" 
                    title="Redo (Ctrl+Y)"
                    icon={
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
                        </svg>
                    }
                />
            </div>

            {/* Article Content Area */}
            <div className="flex-1 overflow-y-auto p-8 bg-white">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-full">
                        <div className="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-gray-500">Generating article...</p>
                    </div>
                ) : (
                    <div className="max-w-4xl mx-auto">
                        {/* Article Title */}
                        <h1 
                            contentEditable
                            suppressContentEditableWarning
                            className="text-3xl font-bold text-gray-900 mb-6 outline-none border-b-2 border-transparent hover:border-pink-200 focus:border-pink-500 transition pb-2"
                            onBlur={(e) => {
                                // Handle title change
                            }}
                        >
                            {projectName} - Essential Guide
                        </h1>

                        {/* Editable Content */}
                        <div
                            ref={editorRef}
                            contentEditable
                            suppressContentEditableWarning
                            className="prose prose-lg max-w-none outline-none min-h-[400px] text-gray-800"
                            onInput={(e) => onChange?.(e.currentTarget.innerHTML)}
                            dangerouslySetInnerHTML={{ 
                                __html: content || `
                                    <p class="text-gray-600">Start writing your article here or click "Rewrite from video" to generate content from your video recording.</p>
                                    <h2>Getting Started</h2>
                                    <p>This is where your step-by-step instructions will appear...</p>
                                ` 
                            }}
                        />

                        {/* Embedded Screenshots */}
                        {screenshots.length > 0 && (
                            <div className="mt-8 space-y-4">
                                <h3 className="text-lg font-semibold text-gray-700">Screenshots</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    {screenshots.map((screenshot, idx) => (
                                        <div key={idx} className="relative group">
                                            <img 
                                                src={screenshot.url} 
                                                alt={screenshot.caption || `Screenshot ${idx + 1}`}
                                                className="rounded-lg border border-gray-200 shadow-sm"
                                            />
                                            <button className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded opacity-0 group-hover:opacity-100 transition">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
