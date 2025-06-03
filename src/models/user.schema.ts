import { Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export const UserSchema = new Schema({
  _id: { type: String, default: () => uuidv4() },
  Keys_storage: {
    public_key: { type: String, required: true },
  },
  public: {
    username: { type: String, required: true, unique: true, trim: true },
    displayName: { type: String, required: true, trim: true },
    bio: { type: String, default: '' },
    profileLink: { type: String, trim: true },
    birthDate: { type: String },
    avatar: { type: String, trim: true },
    status: { type: String, enum: ['online', 'offline', 'away'], default: 'offline' },
    lastSeen: { type: String },
  },
  private: {
    email: { type: String, required: true, unique: true, trim: true }, // Removed index: true
    passwordHash: { type: String, required: true },
  },
  settings: {
    notifications: {
      global: { type: String, enum: ['all', 'mentions', 'none'], default: 'all' },
      groupChats: { type: String, enum: ['all', 'mentions', 'none'], default: 'all' },
      privateChats: { type: String, enum: ['all', 'none'], default: 'all' },
    },
    privacy: {
      profileVisibility: { type: String, enum: ['public', 'friends', 'private'], default: 'public' },
      onlineStatus: { type: String, enum: ['show', 'hide'], default: 'show' },
      lastSeen: { type: String, enum: ['show', 'hide'], default: 'show' },
    },
    theme: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
  },
  contacts: [{
    userId: { type: String, required: true },
    status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
    addedAt: { type: String, default: () => new Date().toISOString() },
  }],
  createdAt: { type: String, default: () => new Date().toISOString() },
  updatedAt: { type: String, default: () => new Date().toISOString() },
});

UserSchema.index({ 'public.username': 1, 'public.displayName': 1 });

UserSchema.index({ 'contacts.userId': 1 });