import { Schema, model, models } from 'mongoose';

// Підсхема одного питання квізу, прив'язаного до лінії
const LineQuizSchema = new Schema(
  {
    line:         { type: String, required: true },
    question:     { type: String, required: true },
    options:      { type: [String], required: true },
    correctIndex: { type: Number, required: true },
    explanation:  { type: String, default: '' },
    // Вага для зваженого рандому. 0 = вимкнено. Наявні питання без поля → трактуються як 1.
    weight:       { type: Number, default: 1 },
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
    info:     { type: String, default: '' },
    audioUrl: { type: String, default: '' },
    fullInfo: { type: String, default: '' },

    // 6-значний код з таблички — запасний вхід, якщо камера не спрацювала.
    // sparse: наявні споти без коду не конфліктують за unique-індексом.
    shortCode: {
      type:      String,
      unique:    true,
      sparse:    true,
      uppercase: true,
      trim:      true,
      default:   undefined,
    },

    // Тип локації на маршруті
    type: {
      type:    String,
      enum:    ['start', 'regular', 'shared', 'finish'],
      default: 'regular',
    },

    // Яким лініям належить цей спот
    lines: {
      type:    [String],
      default: [],
    },

    // На які лінії можна пересісти з цього споту
    transfers: {
      type:    [String],
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