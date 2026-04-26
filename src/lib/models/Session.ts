import { Schema, model, models } from 'mongoose';

const SessionSchema = new Schema(
  {
    nickname: { type: String, required: true },

    // Три лінії маршруту Коломиї
    line: {
      type:     String,
      enum:     ['cherry', 'orange', 'green'],
      required: true,
    },

    ageGroup: {
      type:    String,
      enum:    ['kids', 'teens', 'adults'],
      default: 'adults',
    },

    // Зв'язок з User (для Google-залогінених)
    userId: {
      type:    Schema.Types.ObjectId,
      ref:     'User',
      default: null,
      index:   true,
    },

    startedAt:  { type: Date, default: Date.now },
    finishedAt: { type: Date, default: null },

    xpTotal:        { type: Number, default: 0 },
    bonusXp:        { type: Number, default: 0 },
    completedCount: { type: Number, default: 0 },
    completedSlugs: { type: [String], default: [] },
    deviceLang:     { type: String, default: '' },
  },
  { timestamps: true },
);

export const SessionModel = models.Session ?? model('Session', SessionSchema);