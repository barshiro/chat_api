import { Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export const KeysStorageSchema = new Schema({
  _id: { type: String, default: () => uuidv4() },
  groupId: { type: String, required: true }, // Removed index: true
  Keys_storage: {
    keys_sym: { type: String, required: false },
  },
  createdAt: { type: String, default: () => new Date().toISOString() },
});

KeysStorageSchema.index({ groupId: 1 });