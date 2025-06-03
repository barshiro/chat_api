import { Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export const GroupSchema = new Schema({
  _id: { type: String, default: () => uuidv4() },
  payload: {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    type: { type: String, enum: ['private', 'public', 'channel'], required: true },
    avatar: { type: String, trim: true },
    createdBy: { type: String, required: true },
    createdAt: { type: String, default: () => new Date().toISOString() },
    settings: {
      joinMode: { type: String, enum: ['open', 'approval', 'invite'], default: 'open' },
      messagePermissions: { type: String, enum: ['all', 'moderators'], default: 'all' },
      slowMode: { type: Number, default: 0 },
      defaultRole: { type: String },
    },
  },
});

GroupSchema.index({ 'payload.name': 1 });