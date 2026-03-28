import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  conversation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
  },
  sender: {
    type: String, // Store as string to match NextAuth session.user.id format
    required: true,
  },
  content: {
    type: String,
    trim: true,
  },
  type: {
    type: String,
    enum: ['text', 'image', 'file', 'system'],
    default: 'text',
  },
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read'],
    default: 'sent',
  },
  readBy: [{
    user: {
      type: String, // Store as string to match NextAuth session.user.id format
    },
    readAt: {
      type: Date,
    },
  }],
  // For message deletion
  isDeleted: {
    type: Boolean,
    default: false,
  },
  deletedFor: [{
    user: {
      type: String,
    },
    deletedAt: {
      type: Date,
      default: Date.now,
    },
  }],
}, {
  timestamps: true,
});

// Index for faster lookups
messageSchema.index({ conversation: 1, createdAt: -1 });
messageSchema.index({ sender: 1 });
messageSchema.index({ isDeleted: 1 });
messageSchema.index({ 'deletedFor.user': 1 });

const Message = mongoose.models.Message || mongoose.model('Message', messageSchema);

export default Message;
