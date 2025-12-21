const mongoose = require('mongoose');

/**
 * Feedback Schema
 * Stores user feedback submitted for projects
 */
const feedbackSchema = new mongoose.Schema({
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true
  },
  // Feedback content
  message: {
    type: String,
    required: [true, 'Feedback message is required'],
    trim: true,
    maxlength: [5000, 'Feedback cannot exceed 5000 characters']
  },
  sentiment: {
    type: String,
    enum: ['positive', 'neutral', 'negative'],
    default: 'neutral'
  },
  // Categorization
  category: {
    type: String,
    enum: ['bug', 'feature', 'improvement', 'question', 'other'],
    default: 'other',
    index: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  // Rating (optional)
  rating: {
    type: Number,
    min: 1,
    max: 5
  },
  // Submitter information
  submitter: {
    name: {
      type: String,
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters']
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
    },
    isAnonymous: {
      type: Boolean,
      default: false
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  // Context data (from browser extension)
  context: {
    url: String,
    userAgent: String,
    screenResolution: String,
    timestamp: Date
  },
  // Screenshot/attachments
  attachments: [{
    type: {
      type: String,
      enum: ['screenshot', 'file', 'video']
    },
    url: String,
    filename: String,
    size: Number
  }],
  // Status tracking
  status: {
    type: String,
    enum: ['new', 'reviewing', 'planned', 'in-progress', 'completed', 'closed'],
    default: 'new',
    index: true
  },
  // AI-generated insights (optional)
  aiInsight: {
    summary: String,
    sentiment: {
      type: String,
      enum: ['positive', 'neutral', 'negative']
    },
    keywords: [String],
    suggestedCategory: String,
    generatedAt: Date
  },
  // Internal notes
  internalNotes: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    note: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  // Tags for organization
  tags: [String],
  // Votes/reactions
  upvotes: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
feedbackSchema.index({ project: 1, createdAt: -1 });
feedbackSchema.index({ project: 1, status: 1 });
feedbackSchema.index({ project: 1, category: 1 });
feedbackSchema.index({ 'submitter.email': 1 });

module.exports = mongoose.model('Feedback', feedbackSchema);
