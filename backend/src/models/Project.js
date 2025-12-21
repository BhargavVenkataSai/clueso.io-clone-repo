const mongoose = require('mongoose');

/**
 * Project Schema
 * Represents a product/project that collects user feedback
 */
const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Project name is required'],
    trim: true,
    maxlength: [200, 'Project name cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  publicSlug: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    index: true
  },
  website: {
    type: String,
    trim: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  // API key for extension/widget integration
  apiKey: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  // Team members with roles
  team: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['owner', 'admin', 'member'],
      default: 'member'
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  // Feedback collection settings
  settings: {
    allowAnonymous: {
      type: Boolean,
      default: true
    },
    requireEmail: {
      type: Boolean,
      default: false
    },
    categories: {
      type: [String],
      default: ['bug', 'feature', 'improvement', 'question', 'other']
    },
    enableScreenshots: {
      type: Boolean,
      default: true
    },
    autoGenerateInsights: {
      type: Boolean,
      default: true
    }
  },
  // Statistics
  stats: {
    totalFeedback: {
      type: Number,
      default: 0
    },
    lastFeedbackAt: {
      type: Date
    },
    averageRating: {
      type: Number,
      default: 0
    }
  },
  // Status
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for efficient querying
projectSchema.index({ owner: 1, createdAt: -1 });
projectSchema.index({ apiKey: 1 });
projectSchema.index({ 'team.user': 1 });

module.exports = mongoose.model('Project', projectSchema);
