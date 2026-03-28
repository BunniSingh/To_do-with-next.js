import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
  },
  type: {
    type: String,
    enum: ['direct', 'group'],
    default: 'direct',
  },
  participants: [{
    type: String, // Store as string to match NextAuth session.user.id format
  }],
  createdBy: {
    type: String, // Store as string to match NextAuth session.user.id format
  },
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
  },
  // For one-sided conversation deletion
  deletedBy: [{
    user: {
      type: String,
    },
    deletedAt: {
      type: Date,
      default: Date.now,
    },
  }],
}, {
  timestamps: true, // This automatically adds createdAt and updatedAt
});

// Index for faster lookups
conversationSchema.index({ participants: 1 });
conversationSchema.index({ updatedAt: -1 });
conversationSchema.index({ 'deletedBy.user': 1 });

const Conversation = mongoose.models.Conversation || mongoose.model('Conversation', conversationSchema);

export default Conversation;
