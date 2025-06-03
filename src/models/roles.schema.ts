import { Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export const RolesSchema = new Schema({
  _id: { type: String, default: () => uuidv4() },
  groupId: { type: String, required: true }, // Removed index: true
  name: { type: String, required: true, trim: true },
  color: { type: String, trim: true },
  permissions: {
    sendMessages: { type: Boolean, default: true },
    manageMessages: { type: Boolean, default: false },
    manageRoles: { type: Boolean, default: false },
    manageChannels: { type: Boolean, default: false },
    kickMembers: { type: Boolean, default: false },
    banMembers: { type: Boolean, default: false },
    mentionEveryone: { type: Boolean, default: false },
    attachFiles: { type: Boolean, default: true },
    voiceChat: { type: Boolean, default: true },
  },
  createdAt: { type: String, default: () => new Date().toISOString() },
  updatedAt: { type: String, default: () => new Date().toISOString() },
});

RolesSchema.index({ groupId: 1 });