const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    senderUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    receiverUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    messageText: {
      type: String,
      required: true,
      trim: true,
    },
    replyText: {
      type: String,
      trim: true,
    },
    isReplied: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

messageSchema.index({ receiverUserId: 1, createdAt: -1 });
messageSchema.index({ senderUserId: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
