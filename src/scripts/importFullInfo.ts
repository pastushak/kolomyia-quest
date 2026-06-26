import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import mongoose from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';
import { SpotModel } from '../lib/models/Spot';

// ── Заливка ТІЛЬКИ fullInfo-текстів ───────────────────────
// Формат файлу: { "slug": "<текст fullInfo>", ... }
// Скрипт навмисно НЕ чіпає quizzes, info чи будь-які інші поля.
const FULLINFO_FILE = path.join(__dirname, 'all_fullinfo.json');

async function importFullInfo() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI не знайдено в .env.local');
    process.exit(1);
  }

  if (!fs.existsSync(FULLINFO_FILE)) {
    console.error(`❌ Файл не знайдено: ${FULLINFO_FILE}`);
    process.exit(1);
  }

  const data: Record<string, string> = JSON.parse(
    fs.readFileSync(FULLINFO_FILE, 'utf8'),
  );

  console.log('🔌 Підключаємось до MongoDB...');
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  console.log('✅ Підключено!\n');

  let updated = 0;
  let missing = 0;
  let skipped = 0;

  for (const [slug, fullInfo] of Object.entries(data)) {
    // Валідація: має бути непорожній рядок
    if (typeof fullInfo !== 'string' || fullInfo.trim().length === 0) {
      console.warn(`⚠️  ${slug}: порожній або некоректний fullInfo — пропускаю`);
      skipped++;
      continue;
    }

    // БЕЗПЕЧНО: оновлюємо ТІЛЬКИ поле fullInfo, нічого більше.
    // upsert: false — якщо спота немає, НЕ створюємо порожній документ.
    const res = await SpotModel.updateOne(
      { slug },
      { $set: { fullInfo } },
      { upsert: false },
    );

    if (res.matchedCount === 0) {
      console.warn(`⚠️  ${slug}: спота немає в БД — текст не залито`);
      missing++;
    } else {
      const wc = fullInfo.trim().split(/\s+/).length;
      console.log(`✅ ${slug.padEnd(24)} ${wc} слів`);
      updated++;
    }
  }

  console.log(`\n🎉 Заливку fullInfo завершено!`);
  console.log(`   Оновлено спотів:   ${updated}`);
  if (skipped) console.log(`   Пропущено (порожні): ${skipped}`);
  if (missing) console.log(`   ⚠️ Не знайдено в БД: ${missing} (спершу запусти seed структури)`);

  await mongoose.disconnect();
  console.log('👋 Відключено від MongoDB');
}

importFullInfo().catch((err) => {
  console.error('❌ Помилка заливки fullInfo:', err);
  process.exit(1);
});
