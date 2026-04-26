import { Schema, model, models } from 'mongoose';

const QuestLineSchema = new Schema(
  {
    // Унікальний ключ лінії: 'cherry' | 'orange' | 'green'
    key: {
      type:     String,
      enum:     ['cherry', 'orange', 'green'],
      required: true,
      unique:   true,
      index:    true,
    },

    // Назва для UI
    label: { type: String, required: true },

    // HEX колір лінії (з логотипу Коломиї)
    color: { type: String, required: true },

    // Slug стартової точки
    startSlug: { type: String, required: true },

    // Порядок slug-ів локацій на цій лінії
    // Один спот може бути в order кількох ліній — це нормально
    order: {
      type:     [String],
      required: true,
      default:  [],
    },
  },
  { timestamps: true },
);

export const QuestLineModel = models.QuestLine ?? model('QuestLine', QuestLineSchema);