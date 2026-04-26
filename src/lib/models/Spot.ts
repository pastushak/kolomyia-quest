import { Schema, model, models } from 'mongoose';

// Підсхема одного питання квізу, прив'язаного до лінії
const LineQuizSchema = new Schema(
  {
    line:         { type: String, enum: ['cherry', 'orange', 'green'], required: true },
    question:     { type: String, required: true },
    options:      { type: [String], required: true },
    correctIndex: { type: Number, required: true },
    explanation:  { type: String, default: '' },
  },
  { _id: false },
);

const SpotSchema = new Schema(
  {
    slug: {
      type:     String,
      required: true,
      unique:   true,
      index:    true,
    },
    name:    { type: String, required: true },
    lat:     { type: Number, required: true },
    lng:     { type: Number, required: true },
    address: { type: String, default: '' },
    qrHint:  { type: String, default: '' },
    info:    { type: String, default: '' },

    // Тип локації на маршруті
    type: {
      type:    String,
      enum:    ['start', 'regular', 'shared', 'finish'],
      default: 'regular',
    },

    // Яким лініям належить цей спот
    lines: {
      type:    [String],
      enum:    ['cherry', 'orange', 'green'],
      default: [],
    },

    // На які лінії можна пересісти з цього споту
    transfers: {
      type:    [String],
      enum:    ['cherry', 'orange', 'green'],
      default: [],
    },

    // Квізи per-line. null = контент ще не готовий ("скоро")
    quizzes: {
      type:    [LineQuizSchema],
      default: null,
    },
  },
  { timestamps: true },
);

export const SpotModel = models.Spot ?? model('Spot', SpotSchema);