import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

/**
 * Global video store using Zustand with subscribeWithSelector middleware.
 * This allows components to subscribe to specific slices of state for 60fps performance.
 * 
 * @typedef {Object} Word
 * @property {string} text
 * @property {number} startTime - Global time in seconds
 * @property {number} endTime
 * 
 * @typedef {Object} Slide
 * @property {string} id
 * @property {string} pdfPageUrl - PDF page image URL
 * @property {string} script - Full text content
 * @property {string} audioUrl - Generated audio URL
 * @property {Word[]} wordAlignment - Word-level timestamps
 * @property {number} duration - Slide duration in seconds
 * @property {number} startTime - Global start time in the timeline
 * 
 * @typedef {Object} AudioClip
 * @property {string} id
 * @property {string} url
 * @property {string} text
 * @property {number} duration
 * @property {string} voice
 * @property {string} slideId
 * @property {number} startTime
 */

export const useVideoStore = create(
  subscribeWithSelector((set, get) => ({
    // Initial state
    slides: [],
    currentTime: 0,
    isPlaying: false,
    currentSlideIndex: 0,
    totalDuration: 0,
    audioClips: [],

    // Set current time (called frequently during playback)
    setCurrentTime: (time) => {
      const { slides } = get();
      
      // Find which slide is active based on time
      let newSlideIndex = 0;
      let accumulatedTime = 0;
      
      for (let i = 0; i < slides.length; i++) {
        if (time >= accumulatedTime && time < accumulatedTime + slides[i].duration) {
          newSlideIndex = i;
          break;
        }
        accumulatedTime += slides[i].duration;
        if (i === slides.length - 1) {
          newSlideIndex = i; // Last slide
        }
      }
      
      set({ currentTime: time, currentSlideIndex: newSlideIndex });
    },

    // Seek to a specific time (used for click-to-seek)
    seekTo: (time) => {
      const { totalDuration, setCurrentTime } = get();
      const clampedTime = Math.max(0, Math.min(time, totalDuration));
      setCurrentTime(clampedTime);
    },

    // Play the video/audio
    play: () => set({ isPlaying: true }),

    // Pause the video/audio
    pause: () => set({ isPlaying: false }),

    // Toggle play/pause
    togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),

    // Set all slides (typically on initial load)
    setSlides: (slides) => {
      // Calculate total duration and start times
      let accumulatedTime = 0;
      const slidesWithStartTime = slides.map((slide) => {
        const slideWithStart = { ...slide, startTime: accumulatedTime };
        accumulatedTime += slide.duration;
        return slideWithStart;
      });
      
      set({
        slides: slidesWithStartTime,
        totalDuration: accumulatedTime,
        currentSlideIndex: 0,
        currentTime: 0,
      });
    },

    // Update script for a specific slide
    updateSlideScript: (slideId, script) => {
      set((state) => ({
        slides: state.slides.map((slide) =>
          slide.id === slideId ? { ...slide, script } : slide
        ),
      }));
    },

    // Set audio clips (from timeline)
    setAudioClips: (clips) => set({ audioClips: clips }),

    // Add a single audio clip
    addAudioClip: (clip) => {
      set((state) => ({
        audioClips: [...state.audioClips, clip],
      }));
    },
  }))
);

/**
 * Selector hooks for optimized subscriptions.
 * Use these instead of destructuring from useVideoStore() to avoid unnecessary re-renders.
 */
export const useCurrentTime = () => useVideoStore((state) => state.currentTime);
export const useIsPlaying = () => useVideoStore((state) => state.isPlaying);
export const useSlides = () => useVideoStore((state) => state.slides);
export const useCurrentSlideIndex = () => useVideoStore((state) => state.currentSlideIndex);
export const useTotalDuration = () => useVideoStore((state) => state.totalDuration);
export const useAudioClips = () => useVideoStore((state) => state.audioClips);

// Action hooks (these don't cause re-renders)
export const useVideoActions = () => useVideoStore((state) => ({
  setCurrentTime: state.setCurrentTime,
  seekTo: state.seekTo,
  play: state.play,
  pause: state.pause,
  togglePlay: state.togglePlay,
  setSlides: state.setSlides,
  updateSlideScript: state.updateSlideScript,
  setAudioClips: state.setAudioClips,
  addAudioClip: state.addAudioClip,
}));
