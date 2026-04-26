import { Schema, model, models, Types } from 'mongoose';

const RedemptionSchema = new Schema({
  userId:    { type: Types.ObjectId, ref: 'User', required: true, index: true },
  itemId:    { type: Types.ObjectId, ref: 'ShopItem', required: true },
  code:      { type: String, required: true, unique: true },  // унікальний код купону
  xpSpent:   { type: Number, required: true },
  isUsed:    { type: Boolean, default: false },
  usedAt:    { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
});

// Індекс для швидкого пошуку купонів юзера
RedemptionSchema.index({ userId: 1, itemId: 1 });

export const RedemptionModel = models.Redemption ?? model('Redemption', RedemptionSchema);