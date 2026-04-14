import { Schema, model, models } from 'mongoose';

const SpotVisitSchema = new Schema({
  sessionId:    { type: String, required: true },
  slug:         { type: String, required: true },
  line:         { type: String, required: true },
  visitedAt:    { type: Date, default: Date.now },
  quizAttempts: { type: Number, default: 1 },
  xpEarned:     { type: Number, default: 0 },
});

export const SpotVisitModel = models.SpotVisit ?? model('SpotVisit', SpotVisitSchema);