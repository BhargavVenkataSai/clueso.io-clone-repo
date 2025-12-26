import React, { memo, useCallback, useMemo } from 'react';
import { useActiveWordForSlide, useWordClickHandler } from '../../hooks/useActiveWord';
import { useVideoStore, useIsPlaying } from '../../stores/videoStore';

/**
 * Individual word span component - memoized for performance.
 * Only re-renders when its active state changes.
 */
const WordSpan = memo(function WordSpan({ 
  word, 
  wordIndex, 
  isActive, 
  globalStartTime,
  onWordClick 
}) {
  const handleClick = useCallback(() => {
    onWordClick(globalStartTime);
  }, [globalStartTime, onWordClick]);

  return (
    <span
      className={`word-span ${isActive ? 'active-highlight' : ''}`}
      onClick={handleClick}
      data-word-index={wordIndex}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleClick();
        }
      }}
    >
      {word.text}
    </span>
  );
});

/**
 * Interactive transcript display - renders words with highlighting during playback.
 * Uses the karaoke-style highlighting where the current word is emphasized.
 */
const InteractiveTranscript = memo(function InteractiveTranscript({ 
  slideId, 
  wordAlignment,
  slideStartTime = 0 
}) {
  const activeWordIndex = useActiveWordForSlide(slideId);
  const handleWordClick = useWordClickHandler();

  if (!wordAlignment || wordAlignment.length === 0) {
    return (
      <div className="interactive-transcript empty">
        <p className="text-gray-500 text-sm italic">No word alignment data available.</p>
      </div>
    );
  }

  return (
    <div className="interactive-transcript w-full bg-black/30 backdrop-blur-sm text-gray-200 text-sm p-4 rounded-lg border border-white/[0.06] min-h-[120px] leading-relaxed">
      {wordAlignment.map((word, index) => (
        <React.Fragment key={index}>
          <WordSpan
            word={word}
            wordIndex={index}
            isActive={index === activeWordIndex}
            globalStartTime={slideStartTime + word.startTime}
            onWordClick={handleWordClick}
          />
          {' '}
        </React.Fragment>
      ))}
    </div>
  );
});

/**
 * Editable text area component for when the video is paused.
 */
const EditableScriptArea = memo(function EditableScriptArea({ 
  script, 
  onScriptChange,
  placeholder = "Enter your script here..."
}) {
  const handleChange = useCallback((e) => {
    onScriptChange(e.target.value);
  }, [onScriptChange]);

  return (
    <textarea
      value={script}
      onChange={handleChange}
      placeholder={placeholder}
      className="w-full bg-black/30 backdrop-blur-sm text-gray-200 text-sm p-4 rounded-lg border border-white/[0.06] focus:border-purple-500/50 focus:bg-black/40 outline-none resize-none min-h-[120px] leading-relaxed transition-all placeholder-gray-500"
      spellCheck="false"
    />
  );
});

/**
 * Main InteractiveScriptEditor component.
 * 
 * Features:
 * - Shows editable textarea when paused
 * - Shows interactive transcript with word highlighting when playing
 * - Supports click-to-seek on any word
 * 
 * @param {Object} props
 * @param {string} props.slideId - Unique identifier for the slide
 * @param {string} props.script - The full script text
 * @param {Array} props.wordAlignment - Array of Word objects with timing
 * @param {number} props.slideStartTime - Global start time of the slide
 * @param {function} props.onScriptChange - Callback when script is edited
 * @param {boolean} props.forceEditMode - Force edit mode regardless of play state
 */
export default function InteractiveScriptEditor({
  slideId,
  script,
  wordAlignment,
  slideStartTime = 0,
  onScriptChange,
  forceEditMode = false,
}) {
  const isPlaying = useIsPlaying();
  const hasAlignment = wordAlignment && wordAlignment.length > 0;
  
  // Show transcript view when playing AND we have alignment data
  const showTranscript = isPlaying && hasAlignment && !forceEditMode;

  return (
    <div className="interactive-script-editor">
      {showTranscript ? (
        <InteractiveTranscript
          slideId={slideId}
          wordAlignment={wordAlignment}
          slideStartTime={slideStartTime}
        />
      ) : (
        <EditableScriptArea
          script={script}
          onScriptChange={onScriptChange}
        />
      )}
    </div>
  );
}

/**
 * Standalone transcript viewer without edit functionality.
 * Use this for read-only transcript displays.
 */
export function TranscriptViewer({ slideId, wordAlignment, slideStartTime = 0 }) {
  return (
    <InteractiveTranscript
      slideId={slideId}
      wordAlignment={wordAlignment}
      slideStartTime={slideStartTime}
    />
  );
}

/**
 * CSS styles for the interactive transcript.
 * Add these to your global CSS or component styles.
 */
export const transcriptStyles = `
  .interactive-transcript {
    font-family: inherit;
    line-height: 1.8;
  }

  .word-span {
    cursor: pointer;
    transition: all 0.1s ease;
    padding: 1px 2px;
    border-radius: 3px;
    display: inline;
  }

  .word-span:hover {
    background-color: rgba(139, 92, 246, 0.2);
    color: #e9d5ff;
  }

  .word-span:focus {
    outline: 2px solid rgba(139, 92, 246, 0.4);
    outline-offset: 1px;
  }

  .active-highlight {
    background-color: rgba(139, 92, 246, 0.5);
    color: white;
    font-weight: 500;
    transform: scale(1.02);
    box-shadow: 0 0 8px rgba(139, 92, 246, 0.3);
  }

  .interactive-transcript.empty {
    display: flex;
    align-items: center;
    justify-content: center;
  }
`;
