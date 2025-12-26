import { useEffect, useRef, useCallback } from 'react';
import { useVideoStore } from '../stores/videoStore';

/**
 * Hook for bidirectional synchronization between the video/audio player and UI.
 * 
 * Handles:
 * - Audio element time updates -> store.currentTime (Video -> Text)
 * - Click-to-seek -> audio element seek (Text -> Video)
 * - Play/pause synchronization
 * 
 * @returns {Object} Sync utilities
 */
export function useVideoSync() {
  const audioRef = useRef(null);
  const animationFrameRef = useRef(null);
  
  /**
   * Attach the hook to an audio element.
   * Call this with a ref to your audio element.
   */
  const attachAudio = useCallback((audio) => {
    audioRef.current = audio;
  }, []);
  
  /**
   * Handle word click - seeks to the word's start time.
   * This is the Text -> Video direction of sync.
   * @param {number} globalStartTime
   */
  const handleWordClick = useCallback((globalStartTime) => {
    const { seekTo } = useVideoStore.getState();
    
    // Update store
    seekTo(globalStartTime);
    
    // Update audio element if attached
    if (audioRef.current) {
      audioRef.current.currentTime = globalStartTime;
    }
  }, []);
  
  /**
   * Handle timeline click - seeks to the clicked position.
   * @param {number} time
   */
  const handleTimelineClick = useCallback((time) => {
    handleWordClick(time);
  }, [handleWordClick]);
  
  /**
   * Toggle play/pause state.
   */
  const togglePlayPause = useCallback(() => {
    const { isPlaying, play, pause } = useVideoStore.getState();
    
    if (isPlaying) {
      pause();
      if (audioRef.current) {
        audioRef.current.pause();
      }
    } else {
      play();
      if (audioRef.current) {
        audioRef.current.play().catch(console.error);
      }
    }
  }, []);
  
  /**
   * Start playback.
   */
  const startPlayback = useCallback(() => {
    const { play } = useVideoStore.getState();
    play();
    if (audioRef.current) {
      audioRef.current.play().catch(console.error);
    }
  }, []);
  
  /**
   * Pause playback.
   */
  const stopPlayback = useCallback(() => {
    const { pause } = useVideoStore.getState();
    pause();
    if (audioRef.current) {
      audioRef.current.pause();
    }
  }, []);
  
  // Sync audio element time to store at 60fps using requestAnimationFrame
  useEffect(() => {
    const updateTime = () => {
      if (audioRef.current && !audioRef.current.paused) {
        const { setCurrentTime } = useVideoStore.getState();
        setCurrentTime(audioRef.current.currentTime);
      }
      animationFrameRef.current = requestAnimationFrame(updateTime);
    };
    
    animationFrameRef.current = requestAnimationFrame(updateTime);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);
  
  // Subscribe to store play/pause state and sync to audio
  useEffect(() => {
    const unsubscribe = useVideoStore.subscribe(
      (state) => state.isPlaying,
      (isPlaying) => {
        if (!audioRef.current) return;
        
        if (isPlaying && audioRef.current.paused) {
          audioRef.current.play().catch(console.error);
        } else if (!isPlaying && !audioRef.current.paused) {
          audioRef.current.pause();
        }
      }
    );
    
    return unsubscribe;
  }, []);
  
  return {
    audioRef,
    attachAudio,
    handleWordClick,
    handleTimelineClick,
    togglePlayPause,
    startPlayback,
    stopPlayback,
  };
}

/**
 * Lightweight hook for just the seek functionality.
 * Use this when you don't need the full audio sync features.
 * 
 * @returns {function(number): void}
 */
export function useSeekTo() {
  return useCallback((time) => {
    const { seekTo } = useVideoStore.getState();
    seekTo(time);
  }, []);
}

/**
 * Hook for getting playhead position for the Timeline component.
 * Uses requestAnimationFrame for smooth 60fps updates.
 * 
 * @returns {{positionRef: React.MutableRefObject<number>, getPosition: function(): number}}
 */
export function usePlayheadPosition() {
  const positionRef = useRef(0);
  
  useEffect(() => {
    const unsubscribe = useVideoStore.subscribe(
      (state) => state.currentTime,
      (currentTime) => {
        positionRef.current = currentTime;
      }
    );
    
    return unsubscribe;
  }, []);
  
  const getPosition = useCallback(() => positionRef.current, []);
  
  return { positionRef, getPosition };
}
