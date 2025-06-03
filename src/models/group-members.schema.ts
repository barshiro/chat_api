import { Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export const GroupMembersSchema = new Schema({
  _id: { type: String, default: () => uuidv4() },
  groupId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  roles: [{ type: String }],
  joinedAt: { type: String, default: () => new Date().toISOString() },
});

GroupMembersSchema.index({ groupId: 1, userId: 1 });