import mongoose, { Schema, model, models } from 'mongoose';

const CompletedLineSchema = new Schema({
  line:        { type: String, enum: ['blue', 'red', 'orange', 'green'], required: true },
  ageGroup:    { type: String, enum: ['kids', 'teens', 'adults'], required: true },
  completedAt: { type: Date, default: Date.now },
  finalXp:     { type: Number, required: true },
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