'use client';

import { useEffect, useState } from 'react';
import { LINE_COLOR, LINE_LABEL } from '@/lib/utils';
import { Line } from '@/types';

interface QuizData {
  line:         string;
  question:     string;
  options:      string[];
  correctIndex: number;
  explanation:  string;
}

interface SpotData {
  _id:       string;
  slug:      string;
  name:      string;
  address:   string;
  info:      string;
  qrHint:    string;
  type:      string;
  lines:     string[];
  transfers: string[];
  quizzes:   QuizData[] | null;
}

const EMPTY_QUIZ = (line: string): QuizData => ({
  line,
  question:     '',
  options:      ['', '', '', ''],
  correctIndex: 0,
  explanation:  '',
});

export default function AdminSpotsPage() {
  const [spots, setSpots]     = useState<SpotData[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<SpotData | null>(null);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [filter, setFilter]   = useState<string>('all');
  const [search, setSearch]   = useState('');
  const [quizTab, setQuizTab] = useState<string>('');

  useEffect(() => { loadSpots(); }, []);

  async function loadSpots() {
    setLoading(true);
    const res  = await fetch('/api/admin/spots');
    const data = await res.json();
    setSpots(data);
    setLoading(false);
  }

  function openEdit(spot: SpotData) {
    // Ініціалізуємо квізи для кожної лінії спота
    const existingQuizzes = spot.quizzes || [];
    const quizzes = spot.lines.map(line => {
      const existing = existingQuizzes.find(q => q.line === line);
      return existing || EMPTY_QUIZ(line);
    });
    setEditing({ ...spot, quizzes });
    setQuizTab(spot.lines[0] || '');
  }

  function updateQuiz(line: string, field: keyof QuizData, value: any) {
    if (!editing) return;
    setEditing({
      ...editing,
      quizzes: (editing.quizzes || []).map(q =>
        q.line === line ? { ...q, [field]: value } : q
      ),
    });
  }

  function updateOption(line: string, idx: number, value: string) {
    if (!editing) return;
    setEditing({
      ...editing,
      quizzes: (editing.quizzes || []).map(q => {
        if (q.line !== line) return q;
        const options = [...q.options];
        options[idx] = value;
        return { ...q, options };
      }),
    });
  }

  function isQuizFilled(q: QuizData) {
    return q.question.trim() && q.options.every(o => o.trim());
  }

  async function handleSave() {
    if (!editing) return;
    setSaving(true);

    // Зберігаємо тільки заповнені квізи
    const filledQuizzes = (editing.quizzes || []).filter(isQuizFilled);

    await fetch('/api/admin/spots', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slug:    editing.slug,
        info:    editing.info,
        qrHint:  editing.qrHint,
        address: editing.address,
        quizzes: filledQuizzes.length > 0 ? filledQuizzes : null,
      }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    await loadSpots();
    setEditing(null);
  }

  const filtered = spots.filter(s => {
    const matchLine   = filter === 'all' || s.lines.includes(filter);
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase());
    return matchLine && matchSearch;
  });

  const currentQuiz = editing?.quizzes?.find(q => q.line === quizTab);

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1100, margin: '0 auto' }}>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1A1A2E', margin: 0 }}>Локації</h1>
          <p style={{ fontSize: 13, color: '#888', margin: '4px 0 0' }}>
            {spots.length} спотів у базі даних
          </p>
        </div>
        <a href="/admin/dashboard" style={{ fontSize: 13, color: '#8888A8', textDecoration: 'none' }}>
          ← Дашборд
        </a>
      </div>

      {/* Фільтри */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          placeholder="Пошук за назвою..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 200, padding: '8px 14px', borderRadius: 10, border: '1.5px solid #EEEEF5', fontSize: 13, outline: 'none' }}
        />
        {(['all', 'cherry', 'orange', 'green'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '8px 16px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
              background: filter === f ? (f === 'all' ? '#1A1A2E' : LINE_COLOR[f as Line]) : '#F0F0F5',
              color: filter === f ? '#fff' : '#555',
            }}
          >
            {f === 'all' ? 'Всі' : LINE_LABEL[f as Line]}
          </button>
        ))}
      </div>

      {/* Список спотів */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#888' }}>Завантаження...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
          {filtered.map(spot => (
            <div key={spot._id} style={{ background: '#fff', borderRadius: 16, border: '1px solid #EEEEF5', padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#1A1A2E' }}>{spot.name}</div>
                  <div style={{ fontSize: 11, color: '#888', marginTop: 2, fontFamily: 'monospace' }}>{spot.slug}</div>
                </div>
                <span style={{
                  fontSize: 10, padding: '2px 8px', borderRadius: 10, fontWeight: 600,
                  background: spot.quizzes && spot.quizzes.length > 0 ? '#E8F5EE' : '#FEF7E6',
                  color:      spot.quizzes && spot.quizzes.length > 0 ? '#2D7A4F' : '#8B6914',
                }}>
                  {spot.quizzes && spot.quizzes.length > 0 ? '✓ Квіз є' : '⏳ Скоро'}
                </span>
              </div>

              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
                {spot.lines.map(l => (
                  <span key={l} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, fontWeight: 600, background: LINE_COLOR[l as Line] + '20', color: LINE_COLOR[l as Line] }}>
                    {LINE_LABEL[l as Line]}
                  </span>
                ))}
              </div>

              <div style={{ fontSize: 12, color: '#555', lineHeight: 1.5, marginBottom: 12, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {spot.info || <span style={{ color: '#ccc' }}>Текст не заповнено</span>}
              </div>

              <button
                onClick={() => openEdit(spot)}
                style={{ width: '100%', padding: 8, borderRadius: 10, border: '1.5px solid #EEEEF5', background: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#1A1A2E' }}
              >
                ✏️ Редагувати
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Модальне вікно */}
      {editing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 28, width: '100%', maxWidth: 600, maxHeight: '90vh', overflowY: 'auto' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1A1A2E', margin: 0 }}>{editing.name}</h2>
              <button onClick={() => setEditing(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#888' }}>✕</button>
            </div>

            {/* Основні поля */}
            {[
              { label: 'Адреса',      key: 'address', rows: 1 },
              { label: 'Опис місця',  key: 'info',    rows: 5 },
              { label: 'Підказка QR', key: 'qrHint',  rows: 2 },
            ].map(({ label, key, rows }) => (
              <div key={key} style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 6 }}>{label}</label>
                <textarea
                  rows={rows}
                  value={(editing as any)[key] || ''}
                  onChange={e => setEditing({ ...editing, [key]: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #EEEEF5', fontSize: 13, lineHeight: 1.6, outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
                />
              </div>
            ))}

            {/* Секція квізів */}
            {editing.lines.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1A2E', marginBottom: 12, paddingTop: 16, borderTop: '1px solid #EEEEF5' }}>
                  🎯 Квізи
                </div>

                {/* Таби по лініях */}
                {editing.lines.length > 1 && (
                  <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
                    {editing.lines.map(line => {
                      const q = editing.quizzes?.find(q => q.line === line);
                      const filled = q ? isQuizFilled(q) : false;
                      return (
                        <button
                          key={line}
                          onClick={() => setQuizTab(line)}
                          style={{
                            padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
                            fontSize: 12, fontWeight: 600,
                            background: quizTab === line ? LINE_COLOR[line as Line] : LINE_COLOR[line as Line] + '20',
                            color: quizTab === line ? '#fff' : LINE_COLOR[line as Line],
                          }}
                        >
                          {LINE_LABEL[line as Line]} {filled ? '✓' : ''}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Форма квізу */}
                {currentQuiz && (
                  <div style={{ background: '#faf8f5', borderRadius: 14, padding: 16 }}>

                    {/* Питання */}
                    <div style={{ marginBottom: 12 }}>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 6 }}>Питання</label>
                      <textarea
                        rows={2}
                        value={currentQuiz.question}
                        onChange={e => updateQuiz(quizTab, 'question', e.target.value)}
                        placeholder="Введіть питання квізу..."
                        style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #EEEEF5', fontSize: 13, lineHeight: 1.5, outline: 'none', resize: 'vertical', fontFamily: 'inherit', background: '#fff', boxSizing: 'border-box' }}
                      />
                    </div>

                    {/* Варіанти відповідей */}
                    <div style={{ marginBottom: 12 }}>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 6 }}>
                        Варіанти відповідей
                        <span style={{ fontWeight: 400, color: '#888', marginLeft: 6 }}>(клікни кружечок щоб позначити правильну)</span>
                      </label>
                      {currentQuiz.options.map((opt, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                          <button
                            onClick={() => updateQuiz(quizTab, 'correctIndex', i)}
                            style={{
                              width: 24, height: 24, borderRadius: '50%', flexShrink: 0, cursor: 'pointer', border: 'none',
                              background: currentQuiz.correctIndex === i ? '#2D7A4F' : '#EEEEF5',
                              color: currentQuiz.correctIndex === i ? '#fff' : '#888',
                              fontSize: 11, fontWeight: 700,
                            }}
                          >
                            {i + 1}
                          </button>
                          <input
                            type="text"
                            value={opt}
                            onChange={e => updateOption(quizTab, i, e.target.value)}
                            placeholder={`Варіант ${i + 1}`}
                            style={{
                              flex: 1, padding: '8px 12px', borderRadius: 10, fontSize: 13, outline: 'none', fontFamily: 'inherit',
                              border: currentQuiz.correctIndex === i ? '1.5px solid #2D7A4F' : '1.5px solid #EEEEF5',
                              background: currentQuiz.correctIndex === i ? '#E8F5EE' : '#fff',
                            }}
                          />
                        </div>
                      ))}
                    </div>

                    {/* Пояснення */}
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 6 }}>
                        Пояснення правильної відповіді
                      </label>
                      <textarea
                        rows={2}
                        value={currentQuiz.explanation}
                        onChange={e => updateQuiz(quizTab, 'explanation', e.target.value)}
                        placeholder="Чому ця відповідь правильна?"
                        style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #EEEEF5', fontSize: 13, lineHeight: 1.5, outline: 'none', resize: 'vertical', fontFamily: 'inherit', background: '#fff', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Кнопки */}
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{ flex: 1, padding: 12, borderRadius: 12, border: 'none', background: saved ? '#2D7A4F' : '#89182c', color: '#fff', fontSize: 14, fontWeight: 700, cursor: saving ? 'wait' : 'pointer' }}
              >
                {saving ? 'Зберігаємо...' : saved ? '✓ Збережено!' : 'Зберегти'}
              </button>
              <button
                onClick={() => setEditing(null)}
                style={{ padding: '12px 20px', borderRadius: 12, border: '1.5px solid #EEEEF5', background: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', color: '#555' }}
              >
                Скасувати
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}