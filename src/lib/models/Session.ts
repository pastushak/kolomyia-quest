import mongoose, { Schema, model, models } from 'mongoose';

const SessionSchema = new Schema({
  nickname:        { type: String, required: true },
  // Розширено з ['blue','red'] до всіх 4 ліній
  line:            { type: String, enum: ['blue', 'red', 'orange', 'green'], required: true },
  // НОВЕ: вікова група
  ageGroup:        { type: String, enum: ['kids', 'teens', 'adults'], required: true, default: 'adults' },
  // НОВЕ: опційний зв'язок з User (для Google-залогінених)
  userId:          { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  // НОВЕ: бонусний XP для залогінених (+20%)
  bonusXp:         { type: Number, default: 0 },

  startedAt:       { type: Date, default: Date.now },
  finishedAt:      { type: Date, default: null },
  xpTotal:         { type: Number, default: 0 },
  completedCount:  { type: Number, default: 0 },
  completedSlugs:  { type: [String], default: [] },
  deviceLang:      { type: String, default: '' },
});

export const SessionModel = models.Session ?? model('Session', SessionSchema);