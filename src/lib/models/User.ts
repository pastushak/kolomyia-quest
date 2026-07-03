import mongoose, { Schema, model, models } from 'mongoose';

const BranchStatSchema = new Schema({
  line:  { type: String, required: true },
  count: { type: Number, required: true },
}, { _id: false });

const CompletedLineSchema = new Schema({
  // 'pure' — чиста лінія; 'modification' — пройдено з пересадками
  type:         { type: String, enum: ['pure', 'modification'], default: 'pure' },
  line:         { type: String, default: null },  // для 'pure'
  modification: { type: String, default: null },   // для 'modification' — нотація "cherry(3)-green(4)"
  name:         { type: String, default: '' },     // назва маршруту (комбінований; задає турист або автоназва)
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

  // Роль для доступу до адмінки. 'admin' проставляється з ADMIN_EMAILS при логіні
  // (див. auth.ts), або вручну в БД для підвищених юзерів.
  role:      { type: String, enum: ['user', 'admin'], default: 'user' },

  totalXp:        { type: Number, default: 0 },
  completedLines: { type: [CompletedLineSchema], default: [] },

  createdAt:   { type: Date, default: Date.now },
  lastLoginAt: { type: Date, default: Date.now },
});

export const UserModel = models.User ?? model('User', UserSchema);