import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import mongoose from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';
import { SpotModel } from '../lib/models/Spot';

// ── Завантаження консолідованого файлу квізів ──────────────
// Формат: { "slug": [ { line, question, options, correctIndex, explanation }, ... ], ... }
const QUIZ_FILE = path.join(__dirname, 'all_quizzes.json');

async function importQuizzes() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI не знайдено в .env.local');
    process.exit(1);
  }

  if (!fs.existsSync(QUIZ_FILE)) {
    console.error(`❌ Файл не знайдено: ${QUIZ_FILE}`);
    process.exit(1);
  }

  const data: Record<string, any[]> = JSON.parse(
    fs.readFileSync(QUIZ_FILE, 'utf8'),
  );

  console.log('🔌 Підключаємось до MongoDB...');
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  console.log('✅ Підключено!\n');

  let updated = 0;
  let missing = 0;
  let totalQuizzes = 0;

  for (const [slug, quizzes] of Object.entries(data)) {
    // Валідація структури перед записом
    if (!Array.isArray(quizzes)) {
      console.warn(`⚠️  ${slug}: quizzes не масив — пропускаю`);
      continue;
    }

    const bad = quizzes.find(
      (q) =>
        !q.line ||
        !q.question ||
        !Array.isArray(q.options) ||
        typeof q.correctIndex !== 'number' ||
        q.correctIndex < 0 ||
        q.correctIndex >= q.options.length,
    );
    if (bad) {
      console.warn(`⚠️  ${slug}: знайдено некоректне питання — пропускаю спот`);
      console.warn(`    ${JSON.stringify(bad).slice(0, 120)}...`);
      continue;
    }

    // БЕЗПЕЧНО: оновлюємо ТІЛЬКИ поле quizzes, нічого більше не чіпаємо.
    // upsert: false — якщо спота немає, НЕ створюємо порожній документ.
    const res = await SpotModel.updateOne(
      { slug },
      { $set: { quizzes } },
      { upsert: false },
    );

    if (res.matchedCount === 0) {
      console.warn(`⚠️  ${slug}: спота немає в БД — квізи не залито`);
      missing++;
    } else {
      console.log(`✅ ${slug.padEnd(24)} ${quizzes.length} питань`);
      updated++;
      totalQuizzes += quizzes.length;
    }
  }

  console.log(`\n🎉 Імпорт завершено!`);
  console.log(`   Оновлено спотів:   ${updated}`);
  console.log(`   Залито питань:     ${totalQuizzes}`);
  if (missing) console.log(`   ⚠️ Не знайдено в БД: ${missing} (спершу запусти seed структури)`);

  await mongoose.disconnect();
  console.log('👋 Відключено від MongoDB');
}

importQuizzes().catch((err) => {
  console.error('❌ Помилка імпорту:', err);
  process.exit(1);
});
