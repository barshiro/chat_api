import { Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export const MessageSchema = new Schema({
  _id: { type: String, default: () => uuidv4() },
  groupId: { type: String, required: true, index: true },
  senderId: { type: String, required: true, index: true },
  payload: {
    type: { type: String, enum: ['text', 'voice', 'image', 'video', 'file', 'poll'], required: true },
    payload: { type: String },
    format: {
      bold: [{ start: Number, end: Number }],
      italic: [{ start: Number, end: Number }],
      links: [{ start: Number, end: Number, url: String }],
      mentions: [{ start: Number, end: Number, userId: String }],
    },
    attachments: [{ type: String }],
    replyTo: { type: String },
  },
  edited: {
    isEdited: { type: Boolean, default: false },
    editedAt: { type: String },
  },
  createdAt: { type: String, default: () => new Date().toISOString() },
  updatedAt: { type: String, default: () => new Date().toISOString() },
});

MessageSchema.index({ groupId: 1, createdAt: -1 });