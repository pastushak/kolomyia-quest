import { Schema, model, models } from 'mongoose';

const QuestLineSchema = new Schema(
  {
    // Унікальний ключ лінії: 'cherry' | 'orange' | 'green'
    key: {
      type:     String,
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

    // Статус лінії: 'live' — робоча (видно й можна проходити),
    // 'draft' — чернетка (на головній показується заглушка "незабаром").
    // Дефолт 'live' — щоб наявні лінії без цього поля лишались робочими.
    status: { type: String, enum: ['draft', 'live'], default: 'live' },

    // Тип маршруту: 'general' — загальний, 'themed' — тематичний (бейдж "Т").
    // Дефолт 'general' — наявні лінії лишаються загальними.
    theme: { type: String, enum: ['general', 'themed'], default: 'general' },

    // Короткий опис (для заглушки "незабаром" або картки маршруту). Опційно.
    description: { type: String, default: '' },

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