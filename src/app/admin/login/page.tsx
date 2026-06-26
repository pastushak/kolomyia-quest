'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';

function LoginForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const from         = searchParams.get('from') || '/admin';

  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  async function handleLogin() {
    if (!password.trim()) return;
    setLoading(true);
    setError('');

    const res = await fetch('/api/admin/login', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ password }),
    });

    if (res.ok) {
      router.push(from);
    } else {
      setError('Невірний пароль');
      setLoading(false);
    }
  }

  return (
    <div style={{ width: '100%', maxWidth: 360 }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🔐</div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1a1a2e', margin: '0 0 6px' }}>Адмін-панель</h1>
        <p style={{ fontSize: 14, color: '#888', margin: 0 }}>Коломия-квест</p>
      </div>

      <div style={{ background: '#fff', borderRadius: 20, padding: '28px 24px', boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>
        {/* Основний вхід — Google-роль admin (ADMIN_EMAILS) */}
        <button
          onClick={() => signIn('google', { callbackUrl: from })}
          style={{ width: '100%', padding: '13px', borderRadius: 12, border: '1.5px solid #EEEEF5', background: '#fff', color: '#1a1a2e', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
        >
          <span style={{ fontSize: 16 }}>🔓</span>
          Увійти через Google
        </button>

        {/* Розділювач */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
          <div style={{ flex: 1, height: 1, background: '#EEEEF5' }} />
          <span style={{ fontSize: 12, color: '#bbb' }}>або пароль (запасний)</span>
          <div style={{ flex: 1, height: 1, background: '#EEEEF5' }} />
        </div>

        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#555', marginBottom: 8 }}>
          Пароль
        </label>
        <input
          type="password"
          value={password}
          onChange={e => { setPassword(e.target.value); setError(''); }}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
          placeholder="Введіть пароль адміна"
          autoFocus
          style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: `1.5px solid ${error ? '#DC2626' : '#EEEEF5'}`, fontSize: 15, outline: 'none', marginBottom: 8, boxSizing: 'border-box' }}
        />

        {error && (
          <p style={{ fontSize: 13, color: '#DC2626', marginBottom: 12 }}>{error}</p>
        )}

        <button
          onClick={handleLogin}
          disabled={loading || !password.trim()}
          style={{ width: '100%', padding: '13px', borderRadius: 12, border: 'none', background: '#89182c', color: '#fff', fontSize: 14, fontWeight: 700, cursor: loading ? 'wait' : 'pointer', opacity: !password.trim() ? 0.4 : 1, marginTop: 8 }}
        >
          {loading ? 'Перевірка...' : 'Увійти'}
        </button>
      </div>

      <p style={{ textAlign: 'center', fontSize: 12, color: '#bbb', marginTop: 16 }}>
        kolomyia-quest · admin
      </p>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <main style={{ minHeight: '100vh', background: '#faf8f5', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Suspense fallback={<div style={{ fontSize: 14, color: '#888' }}>Завантаження...</div>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}