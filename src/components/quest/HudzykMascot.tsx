'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

export type HudzykMood = 'idle' | 'happy' | 'curious' | 'guide' | 'celebrate' | 'thinking';

interface Props {
  mood?: HudzykMood;
  message?: string;
  size?: number;
  showMessage?: boolean;
}

const DEFAULT_MESSAGE: Record<HudzykMood, string> = {
  idle:      '',
  happy:     'Привіт! Я Ґудзик!',
  curious:   'Цікаво...',
  guide:     'Ходімо далі!',
  celebrate: 'Чудово! Браво!',
  thinking:  'Хм...',
};

// CSS-фільтри для різних настроїв
const MOOD_FILTER: Record<HudzykMood, string> = {
  idle:      'none',
  happy:     'drop-shadow(0 4px 12px rgba(232,160,32,0.4))',
  curious:   'drop-shadow(0 4px 12px rgba(37,99,235,0.3))',
  guide:     'drop-shadow(0 4px 12px rgba(45,122,79,0.4))',
  celebrate: 'drop-shadow(0 4px 16px rgba(232,160,32,0.6)) brightness(1.05)',
  thinking:  'grayscale(0.2) drop-shadow(0 4px 8px rgba(0,0,0,0.2))',
};

const MOOD_SCALE: Record<HudzykMood, number> = {
  idle:      1,
  happy:     1.04,
  curious:   0.97,
  guide:     1.02,
  celebrate: 1.08,
  thinking:  0.95,
};

export default function HudzykMascot({
  mood = 'idle',
  message,
  size = 180,
  showMessage = true,
}: Props) {
  const [floating, setFloating]   = useState(0);
  const [showBubble, setShowBubble] = useState(false);

  const displayMessage = message ?? DEFAULT_MESSAGE[mood];

  // Плавне "дихання"
  useEffect(() => {
    let frame: number;
    let t = 0;
    const animate = () => {
      t += 0.018;
      setFloating(Math.sin(t) * 5);
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, []);

  // Бульбашка з'являється з затримкою
  useEffect(() => {
    if (displayMessage && showMessage) {
      setShowBubble(false);
      const t = setTimeout(() => setShowBubble(true), 300);
      return () => clearTimeout(t);
    } else {
      setShowBubble(false);
    }
  }, [displayMessage, showMessage, mood]);

  const imgSize = size;

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{
        transform: `translateY(${floating}px)`,
        transition: 'transform 0.05s linear',
        position: 'relative',
      }}>

        {/* Speech bubble */}
        {showBubble && displayMessage && (
          <div style={{
            position: 'absolute',
            top: 0,
            right: imgSize * 0.85,
            background: '#fff',
            border: '1.5px solid #E8A020',
            borderRadius: 12,
            padding: '7px 12px',
            fontSize: Math.max(11, size * 0.066),
            fontWeight: 600,
            color: '#8B1A2F',
            whiteSpace: 'nowrap',
            zIndex: 10,
            animation: 'hudzykPop 0.25s cubic-bezier(.34,1.56,.64,1) both',
            boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
          }}>
            {displayMessage}
            {/* Хвостик бульбашки */}
            <div style={{
              position: 'absolute', right: -8, top: '50%',
              transform: 'translateY(-50%)',
              width: 0, height: 0,
              borderTop: '6px solid transparent',
              borderBottom: '6px solid transparent',
              borderLeft: '8px solid #E8A020',
            }} />
            <div style={{
              position: 'absolute', right: -6, top: '50%',
              transform: 'translateY(-50%)',
              width: 0, height: 0,
              borderTop: '5px solid transparent',
              borderBottom: '5px solid transparent',
              borderLeft: '7px solid #fff',
            }} />
          </div>
        )}

        {/* Зірочки для celebrate */}
        {mood === 'celebrate' && (
          <>
            <div style={{ position: 'absolute', top: -10, left: -10, fontSize: 18, animation: 'hudzykPop 0.3s ease both' }}>⭐</div>
            <div style={{ position: 'absolute', top: 5, right: -12, fontSize: 14, animation: 'hudzykPop 0.4s ease both' }}>✨</div>
            <div style={{ position: 'absolute', top: -5, left: size * 0.3, fontSize: 12, animation: 'hudzykPop 0.5s ease both' }}>🌟</div>
          </>
        )}

        {/* Знак питання для curious */}
        {mood === 'curious' && (
          <div style={{
            position: 'absolute', top: -5, right: -5,
            fontSize: 22, fontWeight: 900, color: '#E8A020',
            textShadow: '0 1px 4px rgba(0,0,0,0.2)',
            animation: 'hudzykPop 0.3s ease both',
          }}>?</div>
        )}

        {/* Лупа для guide */}
        {mood === 'guide' && (
          <div style={{
            position: 'absolute', bottom: size * 0.1, right: -8,
            fontSize: 20,
            animation: 'hudzykPop 0.3s ease both',
          }}>🔍</div>
        )}

        {/* Саме зображення */}
        <div style={{
          transform: `scale(${MOOD_SCALE[mood]})`,
          transition: 'transform 0.3s cubic-bezier(.34,1.56,.64,1), filter 0.3s ease',
          filter: MOOD_FILTER[mood],
        }}>
          <Image
            src="/hudzyk.png"
            alt="Кіт Ґудзик"
            width={imgSize}
            height={imgSize}
            style={{ objectFit: 'contain' }}
            priority
          />
        </div>

      </div>

      <style>{`
        @keyframes hudzykPop {
          from { opacity: 0; transform: scale(0.7) translateY(4px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}