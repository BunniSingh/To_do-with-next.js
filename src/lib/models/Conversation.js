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
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
  },
}, {
  timestamps: true, // This automatically adds createdAt and updatedAt
});

// Index for faster lookups
conversationSchema.index({ participants: 1 });
conversationSchema.index({ updatedAt: -1 });

const Conversation = mongoose.models.Conversation || mongoose.model('Conversation', conversationSchema);

export default Conversation;
