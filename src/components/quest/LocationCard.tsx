'use client';

interface Props {
  name: string;
  address: string;
  info: string;
  qrHint: string;
  spotNumber: number;
  totalSpots: number;
  lineColor: string;
  onReady: () => void;
  onScan: () => void;
}

export default function LocationCard({ name, address, info, qrHint, spotNumber, totalSpots, lineColor, onReady }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Прогрес */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1, height: 6, background: '#EEEEF5', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${(spotNumber / totalSpots) * 100}%`, background: lineColor, borderRadius: 3, transition: 'width .4s' }} />
        </div>
        <span style={{ fontSize: 12, color: '#8888A8', whiteSpace: 'nowrap' }}>{spotNumber} / {totalSpots}</span>
      </div>

      {/* Назва */}
      <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #EEEEF5', padding: '20px 20px 16px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: lineColor, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
          Точка {spotNumber}
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1A1A2E', margin: '0 0 4px', lineHeight: 1.2 }}>
          {name}
        </h1>
        <p style={{ fontSize: 13, color: '#8888A8', margin: 0 }}>{address}</p>
      </div>

      {/* Довідка */}
      <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #EEEEF5', padding: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#8888A8', textTransform: 'uppercase', letterSpacing: .8, marginBottom: 10 }}>
          Про це місце
        </div>
        <p style={{ fontSize: 15, color: '#1A1A2E', lineHeight: 1.7, margin: 0 }}>
          {info}
        </p>
      </div>

      {/* QR підказка */}
      <div style={{ background: '#FEF7E6', borderRadius: 16, border: '1px solid #F5D78A', padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div style={{ fontSize: 24, flexShrink: 0, lineHeight: 1 }}>📍</div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#8B6914', marginBottom: 3 }}>Де знайти QR-код</div>
          <div style={{ fontSize: 13, color: '#633806', lineHeight: 1.5 }}>{qrHint}</div>
        </div>
      </div>

      {/* Кнопки */}
      <button
        onClick={onReady}
        style={{
          width: '100%', padding: 16, borderRadius: 16, border: 'none',
          background: lineColor, color: '#fff', fontSize: 16, fontWeight: 700,
          cursor: 'pointer', marginBottom: 10,
        }}
      >
        Я на місці — починаю квіз →
      </button>

      <button
        onClick={onScan}
        style={{
          width: '100%', padding: 13, borderRadius: 16, cursor: 'pointer',
          border: `1.5px solid ${lineColor}`, background: 'transparent',
          color: lineColor, fontSize: 14, fontWeight: 600,
        }}
      >
        Сканувати QR-код
      </button>
    </div>
  );
}