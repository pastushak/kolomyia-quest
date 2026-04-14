import mongoose, { Schema, model, models } from 'mongoose';

const SessionSchema = new Schema({
  nickname:        { type: String, required: true },
  line:            { type: String, enum: ['blue', 'red'], required: true },
  startedAt:       { type: Date, default: Date.now },
  finishedAt:      { type: Date, default: null },
  xpTotal:         { type: Number, default: 0 },
  completedCount:  { type: Number, default: 0 },
  completedSlugs:  { type: [String], default: [] },
  deviceLang:      { type: String, default: '' },
});

export const SessionModel = models.Session ?? model('Session', SessionSchema);