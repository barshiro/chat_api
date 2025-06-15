import { Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export const NotificationSchema = new Schema({
  _id: { type: String, default: () => uuidv4() },
  userId: { type: String, required: true, index: true },
  type: { type: String, enum: ['contact_request', 'mention', 'group_invite', 'reaction'], required: true },
  payload: {
    requesterId: { type: String },
    groupId: { type: String },
    roleId: { type: String },
    messageId: { type: String },
    content: { type: String },
  },
  read: { type: Boolean, default: false },
  createdAt: { type: String, default: () => new Date().toISOString() },
});

NotificationSchema.index({ userId: 1, createdAt: -1 });