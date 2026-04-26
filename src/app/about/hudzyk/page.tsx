'use client';

import { useRouter } from 'next/navigation';
import HudzykMascot from '@/components/quest/HudzykMascot';

const TIMELINE = [
  { year: '2008', text: '«Коломийський ліхтар» — перша книга-казка виходить друком' },
  { year: '2012', text: 'Перший пластиліновий мультфільм — знятий разом з дітьми' },
  { year: '2016', text: 'Бронзова скульптура з\'являється в парку Трильовського' },
  { year: '2017', text: 'Фестиваль «Коломийські мініатюри» — міжнародний дитячий конкурс' },
];

const BOOKS = [
  { title: 'Коломийський ліхтар',                 sub: '2008 · перша казка про Ґудзика' },
  { title: 'Коломийський дракон',                 sub: 'Пригоди продовжуються' },
  { title: 'Кіт Ґудзик і золота скрипка',         sub: 'Музична казка' },
  { title: 'Навколосвітня мандрівка кота Ґудзика', sub: 'Видана друком · остання книга' },
];

const CATS = [
  { emoji: '🎻', label: 'Скрипаль' },
  { emoji: '🎺', label: 'Трубач' },
  { emoji: '🥁', label: 'Барабанщик' },
  { emoji: '🎸', label: 'Гітарист' },
  { emoji: '🎹', label: 'Піаніст' },
  { emoji: '🪗', label: 'Акордеоніст' },
];

export default function HudzykPage() {
  const router = useRouter();

  return (
    <main style={{ minHeight: '100vh', background: '#faf8f5', paddingBottom: '60px' }}>

      {/* Хедер — фон на всю ширину, контент обмежений 480px */}
      <div style={{ background: 'linear-gradient(160deg, #89182c 0%, #5a0f1d 100%)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        <div style={{ maxWidth: 480, margin: '0 auto', padding: '20px 24px 28px' }}>
          <button
            onClick={() => router.back()}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 600, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 4, padding: 0 }}
          >← Назад</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ flexShrink: 0 }}>
              <HudzykMascot mood="happy" message="Це про мене!" size={100} />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#e28f27', marginBottom: 6 }}>Символ Коломиї</div>
              <h1 style={{ fontSize: 28, fontWeight: 800, color: '#fff', lineHeight: 1.15, marginBottom: 8 }}>
                Кіт <span style={{ color: '#f5c04a', fontStyle: 'italic' }}>Ґудзик</span>
              </h1>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5, margin: 0 }}>
                Бронзовий кіт зі скрипкою і чарівним ґудзиком — символ Коломиї.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Контент */}
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 16px', marginTop: -20 }}>

        {/* Автор */}
        <div style={card}>
          <div style={label}>Автор бренду</div>
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg, #89182c, #e28f27)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>🎨</div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#1a1a2e', marginBottom: 2 }}>Олег Лобурак</div>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>Художник, скульптор, письменник · Коломия</div>
              <div style={{ fontSize: 13, color: '#444', lineHeight: 1.6 }}>
                Автор образу кота Ґудзика, бронзової скульптури в парку Трильовського, книг-казок та першого пластилінового мультфільму про Коломию. Роботи зберігаються в приватних колекціях США та інших країн.
              </div>
            </div>
          </div>
          <a
            href="https://www.facebook.com/oleg.loburak"
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 14, padding: '8px 14px', borderRadius: 20, border: '1.5px solid #1877F2', color: '#1877F2', background: '#f0f4ff', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}
          >
            📘 Facebook автора
          </a>
        </div>

        {/* Як народився */}
        <div style={card}>
          <div style={label}>Як народився Ґудзик</div>
          <h2 style={title}>Казка, яку придумали для доньки</h2>
          <p style={text}>Одного вечора маленька донька Олега Лобурака попросила татка розповісти їй казку про Коломию. Пригадати такої він не міг — і просто придумав нову. Так у 2008 році народився чорно-білий кіт із білими «шкарпетками» на лапах.</p>
          <p style={text}>Донька повісила котику на шию медаль у вигляді ґудзика — і так з'явилося його ім'я.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
            {TIMELINE.map(({ year, text: t }) => (
              <div key={year} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#89182c', background: '#f5e0e3', padding: '3px 8px', borderRadius: 6, whiteSpace: 'nowrap', flexShrink: 0, marginTop: 2 }}>{year}</span>
                <span style={{ fontSize: 13, color: '#444', lineHeight: 1.5 }}>{t}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Скульптура */}
        <div style={card}>
          <div style={label}>Пам'ятник у парку</div>
          <h2 style={title}>Кіт зі скрипкою і чарівним ґудзиком</h2>
          <div style={{ width: '100%', height: 180, background: 'linear-gradient(135deg, #f5e0e3, #fdf0d9)', borderRadius: 14, marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8, border: '2px dashed #e0c8cc' }}>
            <span style={{ fontSize: 36, opacity: 0.4 }}>📷</span>
            <span style={{ fontSize: 11, color: '#89182c', opacity: 0.6, fontWeight: 600 }}>Фото скульптури — незабаром</span>
          </div>
          <p style={text}>Бронзова скульптура заввишки 1,20 м стоїть у центрі парку імені Кирила Трильовського. Кіт у гуцульській крисані грає на скрипці. На поясі — чарівний ґудзик.</p>
          <p style={text}>За легендою: якщо потерти ґудзик на поясі — бажання здійсниться. Туристи з усього світу приходять саме за цим. 🐾</p>
        </div>

        {/* Книги */}
        <div style={card}>
          <div style={label}>Книги і казки</div>
          <h2 style={title}>Більше 99 пригод</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {BOOKS.map(b => (
              <div key={b.title} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: '#faf8f5', borderRadius: 12, border: '1px solid #f0ece6' }}>
                <span style={{ fontSize: 22, flexShrink: 0 }}>📖</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a2e' }}>{b.title}</div>
                  <div style={{ fontSize: 11, color: '#888', marginTop: 1 }}>{b.sub}</div>
                </div>
              </div>
            ))}
          </div>
          <p style={{ marginTop: 12, fontSize: 12, color: '#888' }}>У автора ще понад 99 казок, які чекають на видання.</p>
        </div>

        {/* Проєкт 9 котів */}
        <div style={{ ...card, background: 'linear-gradient(135deg, #1a1a2e, #2d1f4e)' }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#e28f27', marginBottom: 10 }}>Майбутнє</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 12 }}>Проєкт «9 котів»</h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', lineHeight: 1.6, marginBottom: 14 }}>
            З 2028 року в Коломиї з'являться дев'ять бронзових котів у різних частинах міста. Кожен — з музичним інструментом. Разом вони утворять «Котячий оркестр Коломиї».
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {CATS.map(c => (
              <div key={c.label} style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 10, padding: '8px 6px', textAlign: 'center' }}>
                <div style={{ fontSize: 20, marginBottom: 3 }}>{c.emoji}</div>
                <div style={{ fontSize: 11, color: '#f5c04a' }}>{c.label}</div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 12 }}>+ ще 3 інструменти TBD</p>
        </div>

        {/* Атрибуція */}
        <div style={{ background: '#faf8f5', borderRadius: 16, padding: '16px 18px', border: '1px solid #f0ece6', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <span style={{ fontSize: 22, flexShrink: 0 }}>🐾</span>
          <div style={{ fontSize: 12, color: '#666', lineHeight: 1.6 }}>
            Образ кота Ґудзика створено художником <strong style={{ color: '#89182c' }}>Олегом Лобураком</strong>.<br />
            Використовується з дозволу автора.<br />
            © Олег Лобурак · Коломия
          </div>
        </div>

      </div>
    </main>
  );
}

const card: React.CSSProperties = {
  background: '#fff', borderRadius: 20, padding: '22px 20px',
  marginBottom: 14, boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
};
const label: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, letterSpacing: 2,
  textTransform: 'uppercase', color: '#89182c', marginBottom: 10,
};
const title: React.CSSProperties = {
  fontSize: 20, fontWeight: 700, color: '#1a1a2e', marginBottom: 12, lineHeight: 1.3,
};
const text: React.CSSProperties = {
  fontSize: 14, lineHeight: 1.75, color: '#444', marginBottom: 10,
};