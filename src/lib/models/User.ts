import mongoose, { Schema, model, models } from 'mongoose';

const BranchStatSchema = new Schema({
  line:  { type: String, enum: ['cherry', 'orange', 'green'], required: true },
  count: { type: Number, required: true },
}, { _id: false });

const CompletedLineSchema = new Schema({
  // 'pure' — чиста лінія; 'modification' — пройдено з пересадками
  type:         { type: String, enum: ['pure', 'modification'], default: 'pure' },
  line:         { type: String, enum: ['cherry', 'orange', 'green'], default: null },  // для 'pure'
  modification: { type: String, default: null },   // для 'modification' — нотація "cherry(3)-green(4)"
  branches:     { type: [BranchStatSchema], default: [] },
  ageGroup:     { type: String, enum: ['kids', 'teens', 'adults'], required: true },
  completedAt:  { type: Date, default: Date.now },
  finalXp:      { type: Number, required: true },
}, { _id: false });

const UserSchema = new Schema({
  googleId:  { type: String, unique: true, sparse: true, index: true },
  email:     { type: String, required: true, unique: true, lowercase: true, index: true },
  name:      { type: String, required: true },
  avatarUrl: { type: String, default: '' },

  totalXp:        { type: Number, default: 0 },
  completedLines: { type: [CompletedLineSchema], default: [] },

  createdAt:   { type: Date, default: Date.now },
  lastLoginAt: { type: Date, default: Date.now },
});

export const UserModel = models.User ?? model('User', UserSchema);