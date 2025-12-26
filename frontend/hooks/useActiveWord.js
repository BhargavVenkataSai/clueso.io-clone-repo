import { useEffect, useRef, useState, useCallback } from 'react';
import { useVideoStore } from '../stores/videoStore';

/**
 * Binary search to find the word being spoken at a given time.
 * Returns the index of the word, or -1 if no word is active.
 * Time complexity: O(log n)
 * 
 * @param {Array<{text: string, startTime: number, endTime: number}>} words
 * @param {number} time
 * @returns {number}
 */
function findActiveWordIndex(words, time) {
  if (!words || words.length === 0) return -1;
  
  let left = 0;
  let right = words.length - 1;
  
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const word = words[mid];
    
    if (time >= word.startTime && time <= word.endTime) {
      return mid;
    } else if (time < word.startTime) {
      right = mid - 1;
    } else {
      left = mid + 1;
    }
  }
  
  return -1;
}

/**
 * Find which slide is active at a given global time.
 * Returns the slide index and the relative time within that slide.
 * 
 * @param {Array} slides
 * @param {number} globalTime
 * @returns {{slideIndex: number, relativeTime: number}}
 */
function findActiveSlide(slides, globalTime) {
  if (!slides || slides.length === 0) {
    return { slideIndex: -1, relativeTime: 0 };
  }
  
  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i];
    const slideEnd = slide.startTime + slide.duration;
    
    if (globalTime >= slide.startTime && globalTime < slideEnd) {
      return {
        slideIndex: i,
        relativeTime: globalTime - slide.startTime,
      };
    }
  }
  
  // If past all slides, return last slide
  const lastSlide = slides[slides.length - 1];
  return {
    slideIndex: slides.length - 1,
    relativeTime: globalTime - lastSlide.startTime,
  };
}

/**
 * Hook for tracking the currently active word during playback.
 * Uses Zustand subscriptions for 60fps performance without causing React re-renders.
 * 
 * @returns {{slideIndex: number, wordIndex: number, word: Object|null}}
 */
export function useActiveWord() {
  const [activeState, setActiveState] = useState({
    slideIndex: -1,
    wordIndex: -1,
    word: null,
  });
  
  // Use ref to track last known state to avoid unnecessary updates
  const lastStateRef = useRef(activeState);
  
  useEffect(() => {
    // Subscribe to currentTime changes using Zustand's subscribe
    const unsubscribe = useVideoStore.subscribe(
      (state) => ({ currentTime: state.currentTime, slides: state.slides, isPlaying: state.isPlaying }),
      ({ currentTime, slides, isPlaying }) => {
        // Only update when playing to reduce unnecessary computations
        if (!isPlaying && lastStateRef.current.wordIndex !== -1) {
          // Keep last active word when paused
          return;
        }
        
        // Find active slide
        const { slideIndex, relativeTime } = findActiveSlide(slides, currentTime);
        
        if (slideIndex === -1) {
          if (lastStateRef.current.slideIndex !== -1) {
            const newState = { slideIndex: -1, wordIndex: -1, word: null };
            lastStateRef.current = newState;
            setActiveState(newState);
          }
          return;
        }
        
        // Find active word within the slide
        const slide = slides[slideIndex];
        const wordAlignment = slide?.wordAlignment || [];
        const wordIndex = findActiveWordIndex(wordAlignment, relativeTime);
        
        // Only update state if something changed
        if (
          slideIndex !== lastStateRef.current.slideIndex ||
          wordIndex !== lastStateRef.current.wordIndex
        ) {
          const word = wordIndex >= 0 ? wordAlignment[wordIndex] : null;
          const newState = { slideIndex, wordIndex, word };
          lastStateRef.current = newState;
          setActiveState(newState);
        }
      }
    );
    
    return unsubscribe;
  }, []);
  
  return activeState;
}

/**
 * Hook specifically for getting word highlight index for a specific slide.
 * Optimized for use in the ScriptEditor component.
 * 
 * @param {string} slideId - The ID of the slide to track
 * @returns {number} The index of the currently active word in that slide, or -1
 */
export function useActiveWordForSlide(slideId) {
  const [activeWordIndex, setActiveWordIndex] = useState(-1);
  const lastIndexRef = useRef(-1);
  
  useEffect(() => {
    const unsubscribe = useVideoStore.subscribe(
      (state) => ({
        currentTime: state.currentTime,
        slides: state.slides,
        isPlaying: state.isPlaying,
      }),
      ({ currentTime, slides }) => {
        // Find the slide
        const slideIndex = slides.findIndex((s) => s.id === slideId);
        if (slideIndex === -1) {
          if (lastIndexRef.current !== -1) {
            lastIndexRef.current = -1;
            setActiveWordIndex(-1);
          }
          return;
        }
        
        const slide = slides[slideIndex];
        const relativeTime = currentTime - slide.startTime;
        
        // Check if current time is within this slide
        if (relativeTime < 0 || relativeTime > slide.duration) {
          if (lastIndexRef.current !== -1) {
            lastIndexRef.current = -1;
            setActiveWordIndex(-1);
          }
          return;
        }
        
        // Find active word
        const wordIndex = findActiveWordIndex(slide.wordAlignment || [], relativeTime);
        
        if (wordIndex !== lastIndexRef.current) {
          lastIndexRef.current = wordIndex;
          setActiveWordIndex(wordIndex);
        }
      }
    );
    
    return unsubscribe;
  }, [slideId]);
  
  return activeWordIndex;
}

/**
 * Returns a stable callback for handling word clicks.
 * Use this to seek to a word's start time when clicked.
 * 
 * @returns {function(number): void}
 */
export function useWordClickHandler() {
  const handleWordClick = useCallback((startTime) => {
    const { seekTo } = useVideoStore.getState();
    seekTo(startTime);
  }, []);
  
  return handleWordClick;
}
