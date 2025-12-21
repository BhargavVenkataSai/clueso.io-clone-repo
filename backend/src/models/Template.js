const mongoose = require('mongoose');

/**
 * Template Schema
 * Reusable branded templates for consistent video styling
 */
const templateSchema = new mongoose.Schema({
  workspace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
    index: true
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Template name is required'],
    trim: true,
    maxlength: [100, 'Template name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  // Template elements
  elements: {
    intro: {
      enabled: {
        type: Boolean,
        default: false
      },
      duration: Number, // seconds
      content: String, // HTML or text
      backgroundImage: String,
      animation: String
    },
    outro: {
      enabled: {
        type: Boolean,
        default: false
      },
      duration: Number,
      content: String,
      backgroundImage: String,
      animation: String
    },
    watermark: {
      enabled: {
        type: Boolean,
        default: false
      },
      image: String,
      position: {
        type: String,
        enum: ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center'],
        default: 'bottom-right'
      },
      opacity: {
        type: Number,
        default: 0.8,
        min: 0,
        max: 1
      }
    }
  },
  // Styling
  styling: {
    captionStyle: {
      fontFamily: String,
      fontSize: Number,
      fontColor: String,
      backgroundColor: String,
      position: {
        type: String,
        enum: ['top', 'center', 'bottom'],
        default: 'bottom'
      }
    },
    brandColors: {
      primary: String,
      secondary: String,
      accent: String
    }
  },
  // Usage tracking
  usageCount: {
    type: Number,
    default: 0
  },
  isDefault: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes
templateSchema.index({ workspace: 1 });
templateSchema.index({ creator: 1 });

module.exports = mongoose.model('Template', templateSchema);
