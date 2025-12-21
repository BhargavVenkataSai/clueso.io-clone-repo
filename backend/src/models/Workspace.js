const mongoose = require('mongoose');

/**
 * Workspace Schema
 * Represents a team collaboration space for organizing videos and documentation
 */
const workspaceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Workspace name is required'],
    trim: true,
    maxlength: [200, 'Workspace name cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['owner', 'admin', 'editor', 'viewer'],
      default: 'viewer'
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  branding: {
    logo: {
      type: String,
      trim: true
    },
    primaryColor: {
      type: String,
      default: '#3B82F6',
      trim: true
    },
    secondaryColor: {
      type: String,
      default: '#8B5CF6',
      trim: true
    },
    fontFamily: {
      type: String,
      default: 'Inter',
      trim: true
    }
  },
  settings: {
    defaultLanguage: {
      type: String,
      default: 'en',
      trim: true
    },
    defaultVoice: {
      type: String,
      default: 'alloy',
      trim: true
    },
    autoCaption: {
      type: Boolean,
      default: true
    },
    autoTranscribe: {
      type: Boolean,
      default: true
    }
  },
  stats: {
    totalVideos: {
      type: Number,
      default: 0
    },
    totalDocs: {
      type: Number,
      default: 0
    },
    totalMembers: {
      type: Number,
      default: 1
    },
    storageUsed: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true
});

// Index for faster queries
workspaceSchema.index({ owner: 1, createdAt: -1 });
workspaceSchema.index({ 'members.user': 1 });

// Virtual for getting videos
workspaceSchema.virtual('videos', {
  ref: 'Video',
  localField: '_id',
  foreignField: 'workspace'
});

// Virtual for getting documentation
workspaceSchema.virtual('documentation', {
  ref: 'Documentation',
  localField: '_id',
  foreignField: 'workspace'
});

// Add owner to members array on creation
workspaceSchema.pre('save', function(next) {
  if (this.isNew) {
    this.members.push({
      user: this.owner,
      role: 'owner',
      addedAt: new Date()
    });
  }
  next();
});

module.exports = mongoose.model('Workspace', workspaceSchema);
