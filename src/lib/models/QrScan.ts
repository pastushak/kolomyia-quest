import { Schema, model, models } from 'mongoose';

const QrScanSchema = new Schema({
  slug:       { type: String, required: true },
  scannedAt:  { type: Date, default: Date.now },
  userAgent:  { type: String, default: '' },
});

export const QrScanModel = models.QrScan ?? model('QrScan', QrScanSchema);