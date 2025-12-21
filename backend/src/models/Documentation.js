const mongoose = require('mongoose');

/**
 * Documentation Schema
 * AI-generated step-by-step guides from videos
 */
const documentationSchema = new mongoose.Schema({
  video: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Video',
    required: true,
    index: true
  },
  workspace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  // Documentation content
  content: {
    type: String,
    required: true
  },
  format: {
    type: String,
    enum: ['html', 'markdown', 'richtext'],
    default: 'html'
  },
  // Steps extracted from video
  steps: [{
    stepNumber: Number,
    title: String,
    description: String,
    screenshot: String, // URL to screenshot
    timestamp: Number, // Video timestamp in seconds
    annotations: [{
      type: {
        type: String,
        enum: ['arrow', 'circle', 'rectangle', 'text']
      },
      coordinates: {
        x: Number,
        y: Number,
        width: Number,
        height: Number
      },
      text: String
    }]
  }],
  // Language and translation
  language: {
    type: String,
    default: 'en'
  },
  translations: [{
    language: String,
    content: String,
    translatedAt: Date
  }],
  // Settings
  settings: {
    includeScreenshots: {
      type: Boolean,
      default: true
    },
    includeGifs: {
      type: Boolean,
      default: false
    },
    style: {
      type: String,
      enum: ['detailed', 'concise', 'technical'],
      default: 'detailed'
    }
  },
  // Stats
  views: {
    type: Number,
    default: 0
  },
  exports: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes
documentationSchema.index({ video: 1 });
documentationSchema.index({ workspace: 1, createdAt: -1 });

module.exports = mongoose.model('Documentation', documentationSchema);
