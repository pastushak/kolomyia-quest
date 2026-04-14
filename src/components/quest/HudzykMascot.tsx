'use client';

import { useEffect, useState } from 'react';

export type HudzykMood = 'idle' | 'happy' | 'curious' | 'guide' | 'celebrate' | 'thinking';

interface Props {
  mood?: HudzykMood;
  message?: string;
  size?: number;
  showMessage?: boolean;
}

const MOUTH: Record<HudzykMood, string> = {
  idle:      'M103 172 Q110 178 117 172',
  happy:     'M100 170 Q110 182 120 170',
  curious:   'M105 173 Q110 176 115 173',
  guide:     'M103 172 Q110 178 117 172',
  celebrate: 'M97 169 Q110 184 123 169',
  thinking:  'M104 174 Q110 172 116 170',
};

const DEFAULT_MESSAGE: Record<HudzykMood, string> = {
  idle:      '',
  happy:     'Привіт! Я Гудзик!',
  curious:   'Цікаво...',
  guide:     'Ходімо далі!',
  celebrate: 'Чудово! Браво!',
  thinking:  'Хм...',
};

export default function HudzykMascot({
  mood = 'idle',
  message,
  size = 180,
  showMessage = true,
}: Props) {
  const [blinking, setBlinking] = useState(false);
  const [floating, setFloating] = useState(0);
  const [tailAngle, setTailAngle] = useState(0);
  const [showBubble, setShowBubble] = useState(false);

  const displayMessage = message ?? DEFAULT_MESSAGE[mood];

  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setBlinking(true);
      setTimeout(() => setBlinking(false), 150);
    }, 3500 + Math.random() * 1500);
    return () => clearInterval(blinkInterval);
  }, []);

  useEffect(() => {
    let frame: number;
    let t = 0;
    const animate = () => {
      t += 0.02;
      setFloating(Math.sin(t) * 6);
      setTailAngle(Math.sin(t * 0.8) * 14);
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (displayMessage && showMessage) {
      setShowBubble(false);
      const t = setTimeout(() => setShowBubble(true), 300);
      return () => clearTimeout(t);
    } else {
      setShowBubble(false);
    }
  }, [displayMessage, showMessage, mood]);

  const mouthPath = MOUTH[mood];
  const eyeScaleY = blinking ? 0.08 : 1;
  const scale = size / 220;

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
      <div style={{ transform: `translateY(${floating}px)`, transition: 'transform 0.05s linear', position: 'relative' }}>

        {/* Speech bubble */}
        {showBubble && displayMessage && (
          <div style={{
            position: 'absolute',
            top: -8,
            right: size * 0.55,
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
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          }}>
            {displayMessage}
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

        <svg
          width={size}
          height={size * (380 / 220)}
          viewBox="0 0 220 380"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Хвіст */}
          <g style={{ transformOrigin: '138px 272px', transform: `rotate(${tailAngle}deg)` }}>
            <path d="M138 272 Q172 268 180 248 Q188 226 168 216"
              fill="none" stroke="#1a1a1a" strokeWidth="12" strokeLinecap="round"/>
            <path d="M138 272 Q172 268 180 248 Q188 226 168 216"
              fill="none" stroke="#3a3a3a" strokeWidth="7" strokeLinecap="round"/>
            <ellipse cx="166" cy="213" rx="7" ry="9" fill="#f0f0f0"
              transform="rotate(-22,166,213)"/>
          </g>

          {/* Тіло */}
          <ellipse cx="110" cy="258" rx="52" ry="56" fill="#1a1a1a"/>
          <ellipse cx="110" cy="254" rx="28" ry="34" fill="#f0f0f0"/>

          {/* Штани */}
          <rect x="84" y="282" width="22" height="44" rx="9" fill="#c0392b"/>
          <rect x="110" y="282" width="22" height="44" rx="9" fill="#c0392b"/>

          {/* Шуба */}
          <ellipse cx="88" cy="222" rx="18" ry="20" fill="#5d3317"/>
          <ellipse cx="132" cy="222" rx="18" ry="20" fill="#5d3317"/>
          <ellipse cx="88" cy="225" rx="12" ry="13" fill="#1a1a1a"/>
          <ellipse cx="132" cy="225" rx="12" ry="13" fill="#1a1a1a"/>

          {/* Чоботи */}
          <ellipse cx="91" cy="316" rx="17" ry="10" fill="#8B6914"/>
          <ellipse cx="129" cy="316" rx="17" ry="10" fill="#8B6914"/>
          <ellipse cx="91" cy="323" rx="15" ry="7" fill="#6b4f10"/>
          <ellipse cx="129" cy="323" rx="15" ry="7" fill="#6b4f10"/>
          <path d="M80 312 Q91 328 102 312" fill="#5a3c0d"/>
          <path d="M118 312 Q129 328 140 312" fill="#5a3c0d"/>

          {/* Лапи-рукавички */}
          <ellipse cx="72" cy="248" rx="6" ry="13" fill="#f0f0f0" transform="rotate(-18,72,248)"/>
          <ellipse cx="148" cy="248" rx="6" ry="13" fill="#f0f0f0" transform="rotate(18,148,248)"/>

          {/* Медальйон */}
          <circle cx="72" cy="250" r="9" fill="#E8A020" stroke="#c8880a" strokeWidth="1.5"/>
          <text x="72" y="254" textAnchor="middle" fontSize="9" fontWeight="800" fill="#1a1a1a">1</text>

          {/* Сокира */}
          <line x1="68" y1="234" x2="162" y2="192"
            stroke="#8B6914" strokeWidth="8" strokeLinecap="round"/>
          <line x1="68" y1="234" x2="162" y2="192"
            stroke="#c8a020" strokeWidth="4" strokeLinecap="round"/>
          <path d="M154 186 Q170 176 173 194 Q176 212 158 202 Z"
            fill="#c8a020" stroke="#8B6914" strokeWidth="1.5"/>
          <path d="M154 186 Q166 180 167 193"
            fill="none" stroke="#E8C060" strokeWidth="1.5"/>

          {/* Голова */}
          <ellipse cx="110" cy="150" rx="48" ry="46" fill="#1a1a1a"/>
          <ellipse cx="110" cy="164" rx="30" ry="22" fill="#f0f0f0"/>

          {/* Вуха */}
          <polygon points="68,120 56,82 86,104" fill="#1a1a1a"/>
          <polygon points="70,118 60,86 84,106" fill="#e85d8a" opacity=".65"/>
          <polygon points="152,120 164,82 134,104" fill="#1a1a1a"/>
          <polygon points="150,118 160,86 136,106" fill="#e85d8a" opacity=".65"/>

          {/* Очі */}
          <g style={{ transformOrigin: '96px 152px', transform: `scaleY(${eyeScaleY})` }}>
            <ellipse cx="96" cy="152" rx="12" ry="13" fill="white"/>
            <ellipse cx="96" cy="153" rx="7" ry="8" fill="#1a7a1a"/>
            <ellipse cx="96" cy="153" rx="4" ry="6" fill="#0d0d0d"/>
            <ellipse cx="94" cy="150" rx="2.5" ry="2.5" fill="white"/>
          </g>
          <g style={{ transformOrigin: '124px 152px', transform: `scaleY(${eyeScaleY})` }}>
            <ellipse cx="124" cy="152" rx="12" ry="13" fill="white"/>
            <ellipse cx="124" cy="153" rx="7" ry="8" fill="#1a7a1a"/>
            <ellipse cx="124" cy="153" rx="4" ry="6" fill="#0d0d0d"/>
            <ellipse cx="122" cy="150" rx="2.5" ry="2.5" fill="white"/>
          </g>

          {/* Ніс */}
          <ellipse cx="110" cy="166" rx="8" ry="6" fill="#c0392b"/>
          <ellipse cx="110" cy="165" rx="4" ry="3" fill="#e85d8a"/>

          {/* Рот */}
          <path d={mouthPath} fill="none" stroke="#1a1a1a" strokeWidth="2.2" strokeLinecap="round"/>

          {/* Вуса */}
          {[
            [88,165,66,160], [88,169,64,168], [88,173,67,177],
            [132,165,154,160], [132,169,156,168], [132,173,153,177],
          ].map(([x1,y1,x2,y2], i) => (
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
              stroke="#d0d0d0" strokeWidth="1.5" strokeLinecap="round"/>
          ))}

          {/* Капелюх */}
          <rect x="80" y="106" width="60" height="16" rx="8" fill="#2d7a2d"/>
          <ellipse cx="110" cy="118" rx="34" ry="16" fill="#2d7a2d"/>
          <ellipse cx="110" cy="116" rx="30" ry="13" fill="#3a9e3a"/>
          <ellipse cx="110" cy="114" rx="26" ry="10" fill="#44be44"/>

          {/* Прикраси капелюха */}
          <circle cx="126" cy="112" r="7" fill="#c0392b"/>
          <circle cx="136" cy="109" r="5" fill="#E8A020"/>
          <circle cx="128" cy="104" r="4" fill="#c0392b"/>

          {/* Пір'я */}
          <path d="M130 100 Q135 78 144 70 Q150 62 145 86"
            fill="#2d8a3a" stroke="#1a5a22" strokeWidth="1"/>
          <path d="M134 98 Q142 72 153 62 Q160 54 153 80"
            fill="#E8A020" stroke="#c8880a" strokeWidth="1"/>
          <path d="M138 100 Q150 70 163 56 Q170 46 160 74"
            fill="#c0392b" stroke="#8b1a2f" strokeWidth="1"/>
          <path d="M131 101 Q126 76 117 68 Q108 60 115 86"
            fill="#1a6a2d" stroke="#0d4018" strokeWidth="1"/>

          {/* Святкові зірки для celebrate */}
          {mood === 'celebrate' && (
            <>
              <polygon points="42,80 45,90 56,90 47,97 50,107 42,100 34,107 37,97 28,90 39,90"
                fill="#E8A020" stroke="#c8880a" strokeWidth="1"/>
              <polygon points="178,60 180,68 188,68 182,73 184,81 178,76 172,81 174,73 168,68 176,68"
                fill="#E8A020" stroke="#c8880a" strokeWidth="1"/>
              <circle cx="38" cy="130" r="5" fill="#c0392b" opacity=".8"/>
              <circle cx="182" cy="120" r="4" fill="#2d7a4f" opacity=".8"/>
              <circle cx="32" cy="170" r="4" fill="#2563EB" opacity=".7"/>
              <circle cx="186" cy="165" r="5" fill="#D4621A" opacity=".8"/>
            </>
          )}

          {/* Знак питання для curious */}
          {mood === 'curious' && (
            <text x="178" y="105" textAnchor="middle" fontSize="28" fontWeight="900"
              fill="#E8A020" stroke="#c8880a" strokeWidth="1">?</text>
          )}

          {/* Лупа для guide */}
          {mood === 'guide' && (
            <g transform="translate(168,130) rotate(-20)">
              <circle cx="0" cy="0" r="12" fill="none" stroke="#c8a020" strokeWidth="3"/>
              <circle cx="0" cy="0" r="8" fill="#daf0ff" opacity=".5"/>
              <line x1="9" y1="9" x2="18" y2="18" stroke="#8B6914" strokeWidth="4" strokeLinecap="round"/>
            </g>
          )}

        </svg>

        <style>{`
          @keyframes hudzykPop {
            from { opacity:0; transform: scale(0.7) translateY(4px); }
            to   { opacity:1; transform: scale(1) translateY(0); }
          }
        `}</style>
      </div>
    </div>
  );
}