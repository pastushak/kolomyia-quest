/**
 * Генерація 6-значних кодів для табличок (запасний вхід замість QR).
 *
 * Безпека за нашим патерном:
 *  - НЕ перезаписує наявні shortCode (надруковані таблички не протухнуть).
 *  - upsert: false — не створює спотів.
 *  - Ізольований скрипт: робить ОДНУ річ.
 *
 * Запуск:   npx tsx src/scripts/generateShortCodes.ts
 * Перегенерувати конкретний спот (ротація):
 *           npx tsx src/scripts/generateShortCodes.ts --force ratusha
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import mongoose from 'mongoose';
import { connectDB } from '../lib/mongodb';
import { SpotModel } from '../lib/models/Spot';

// Алфавіт БЕЗ плутаних символів: немає O/0, I/1, S/5 — турист читає код з таблички очима.
const ALPHABET = 'ABCDEFGHJKLMNPQRTUVWXYZ23479';

function randomChars(n: number): string {
  let out = '';
  for (let i = 0; i < n; i++) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return out;
}

// Основа коду зі slug: перші літери, що є в безпечному алфавіті.
// pysanka_museum → PYS, ratusha → RAT
function prefixFromSlug(slug: string): string {
  const letters = slug.toUpperCase().replace(/[^A-Z]/g, '');
  let out = '';
  for (const ch of letters) {
    if (ALPHABET.includes(ch)) out += ch;
    if (out.length === 3) break;
  }
  return out.padEnd(3, 'X');   // якщо літер забракло
}

async function main() {
  const args   = process.argv.slice(2);
  const force  = args.includes('--force');
  const only   = args.find(a => !a.startsWith('--'));

  await connectDB();

  const filter: Record<string, unknown> = {};
  if (only) filter.slug = only;

  const spots = await SpotModel.find(filter).select('slug name shortCode').lean<
    Array<{ slug: string; name: string; shortCode?: string }>
  >();

  if (spots.length === 0) {
    console.log('⚠️  Спотів не знайдено. Перевір фільтр.');
    await mongoose.disconnect();
    return;
  }

  // Усі вже зайняті коди — щоб не було колізій.
  const taken = new Set(
    (await SpotModel.find({ shortCode: { $ne: null } }).select('shortCode').lean<Array<{ shortCode?: string }>>())
      .map(s => s.shortCode)
      .filter(Boolean) as string[]
  );

  let created = 0, skipped = 0;

  for (const spot of spots) {
    if (spot.shortCode && !force) {
      console.log(`⏭️  ${spot.slug.padEnd(24)} вже має код ${spot.shortCode} — пропускаю`);
      skipped++;
      continue;
    }

    // Генеруємо унікальний код: PREFIX(3) + випадкові(3)
    let code = '';
    for (let attempt = 0; attempt < 50; attempt++) {
      const candidate = prefixFromSlug(spot.slug) + randomChars(3);
      if (!taken.has(candidate)) { code = candidate; break; }
    }
    if (!code) {
      console.log(`❌ ${spot.slug} — не вдалося підібрати унікальний код`);
      continue;
    }

    if (spot.shortCode) taken.delete(spot.shortCode);   // старий звільняємо
    taken.add(code);

    await SpotModel.updateOne(
      { slug: spot.slug },
      { $set: { shortCode: code } },
      { upsert: false },
    );

    console.log(`✅ ${spot.slug.padEnd(24)} → ${code}   (${spot.name})`);
    created++;
  }

  console.log(`\n── Готово: ${created} згенеровано, ${skipped} пропущено ──`);
  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });