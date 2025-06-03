import { Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export const ReactionSchema = new Schema({
  _id: { type: String, default: () => uuidv4() },
  messageId: { type: String, required: true, index: true },
  groupId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  reaction: { type: String, required: true }, // e.g., "👍", "heart", "smile"
  createdAt: { type: String, default: () => new Date().toISOString() },
});

ReactionSchema.index({ messageId: 1, userId: 1 }); // Ensure unique reactions per user per message