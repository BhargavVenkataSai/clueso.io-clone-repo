const mongoose = require('mongoose');

/**
 * Video Schema
 * Represents a video project with AI processing capabilities
 */
const videoSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Video title is required'],
    trim: true,
    maxlength: [300, 'Title cannot exceed 300 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  workspace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
    index: true
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  // File information
  files: {
    original: {
      url: String,
      filename: String,
      size: Number,
      duration: Number,
      format: String
    },
    processed: {
      url: String,
      filename: String,
      size: Number
    },
    thumbnail: {
      url: String,
      filename: String
    }
  },
  // Video metadata
  metadata: {
    width: Number,
    height: Number,
    fps: Number,
    aspectRatio: {
      type: String,
      default: '16:9'
    },
    duration: Number
  },
  // AI processing features
  aiFeatures: {
    transcription: {
      type: Boolean,
      default: false
    },
    fillerWordsRemoval: {
      type: Boolean,
      default: false
    },
    aiVoiceover: {
      type: Boolean,
      default: false
    },
    autoZoom: {
      type: Boolean,
      default: false
    },
    captions: {
      type: Boolean,
      default: false
    },
    translation: {
      type: Boolean,
      default: false
    }
  },
  // Processing configuration
  processingConfig: {
    voice: {
      type: String,
      default: 'alloy',
      enum: ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']
    },
    targetLanguage: {
      type: String,
      default: 'en'
    },
    removeFillerWords: {
      type: Boolean,
      default: false
    },
    musicTrack: {
      type: String,
      default: 'none'
    },
    captionStyle: {
      type: String,
      default: 'default'
    }
  },
  // Transcript data
  transcript: {
    original: {
      type: String,
      default: ''
    },
    edited: {
      type: String,
      default: ''
    },
    language: {
      type: String,
      default: 'en'
    },
    segments: [{
      start: Number,
      end: Number,
      text: String,
      isFillerWord: Boolean
    }]
  },
  // Captions
  captions: [{
    start: Number,
    end: Number,
    text: String,
    style: {
      type: String,
      default: 'default'
    }
  }],
  // Auto-zoom detections
  autoZoomSegments: [{
    start: Number,
    end: Number,
    x: Number,
    y: Number,
    scale: Number
  }],
  // Processing status
  status: {
    type: String,
    enum: ['uploading', 'processing', 'ready', 'failed'],
    default: 'uploading',
    index: true
  },
  processingProgress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  processingError: {
    type: String
  },
  processingStartedAt: {
    type: Date
  },
  processingCompletedAt: {
    type: Date
  },
  // Export settings
  exportSettings: {
    format: {
      type: String,
      default: 'mp4',
      enum: ['mp4', 'mov', 'webm']
    },
    quality: {
      type: String,
      default: '1080p',
      enum: ['720p', '1080p', '4k']
    },
    includeSubtitles: {
      type: Boolean,
      default: true
    }
  },
  // Stats
  stats: {
    views: {
      type: Number,
      default: 0
    },
    exports: {
      type: Number,
      default: 0
    },
    shares: {
      type: Number,
      default: 0
    }
  },
  // Tags for organization
  tags: [{
    type: String,
    trim: true
  }],
  // Soft delete
  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  },
  deletedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
videoSchema.index({ workspace: 1, createdAt: -1 });
videoSchema.index({ creator: 1, createdAt: -1 });
videoSchema.index({ status: 1, createdAt: -1 });
videoSchema.index({ tags: 1 });
videoSchema.index({ isDeleted: 1, workspace: 1 });

// Virtual for documentation
videoSchema.virtual('documentation', {
  ref: 'Documentation',
  localField: '_id',
  foreignField: 'video',
  justOne: true
});

// Set processing started timestamp
videoSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === 'processing' && !this.processingStartedAt) {
    this.processingStartedAt = new Date();
  }
  if (this.isModified('status') && this.status === 'ready' && !this.processingCompletedAt) {
    this.processingCompletedAt = new Date();
  }
  next();
});

module.exports = mongoose.model('Video', videoSchema);
