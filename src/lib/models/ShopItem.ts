import { Schema, model, models } from 'mongoose';

const ShopItemSchema = new Schema({
  name:         { type: String, required: true },
  category:     { type: String, enum: ['cafe', 'restaurant', 'hotel', 'shop', 'hostel', 'mall'], required: true },
  description:  { type: String, required: true },
  address:      { type: String, required: true },
  phone:        { type: String, default: '' },
  hours:        { type: String, default: '' },
  website:      { type: String, default: '' },
  emoji:        { type: String, default: '🏪' },

  // Тип картки
  type:         { type: String, enum: ['info', 'discount', 'freebie'], default: 'info' },
  discountText: { type: String, default: '' },  // наприклад "-15% на всі напої"
  xpCost:       { type: Number, default: 0 },   // 0 = безкоштовно (тільки info)

  isActive:     { type: Boolean, default: true },
  sortOrder:    { type: Number, default: 0 },

  createdAt:    { type: Date, default: Date.now },
}, { timestamps: true });

export const ShopItemModel = models.ShopItem ?? model('ShopItem', ShopItemSchema);