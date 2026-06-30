'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  name:        string;
  address:     string;
  info:        string;
  audioUrl?:   string;
  qrHint:      string;
  spotNumber:  number;
  totalSpots:  number;
  lineColor:   string;
  onReady?:    () => void;
  onScan?:     () => void;
}

export default function LocationCard({ name, address, info, audioUrl, qrHint, spotNumber, totalSpots, lineColor }: Props) {
  const audioRef  = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying]   = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loaded, setLoaded]     = useState(false);

  // Автозапуск при відкритті
  // Автозапуск при відкритті
  useEffect(() => {
    if (!audioUrl || !audioRef.current) return;
    const audio = audioRef.current;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setLoaded(true);
    };

    const handleTimeUpdate = () => {
      setProgress(audio.currentTime / audio.duration * 100);
    };

    const handleEnded = () => {
      setPlaying(false);
      setProgress(0);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    // Cleanup: знімаємо слухачі й таймер при зміні audioUrl / розмонтуванні
    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.pause();
    };
  }, [audioUrl]);

  function togglePlay() {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play().then(() => setPlaying(true)).catch(() => {});
    }
  }

  function handleSeek(e: React.MouseEvent<HTMLDivElement>) {
    if (!audioRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x    = e.clientX - rect.left;
    const pct  = x / rect.width;
    audioRef.current.currentTime = pct * duration;
  }

  function formatTime(sec: number) {
    if (!sec || isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Прогрес маршруту */}
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

      {/* Аудіоплеєр — показується тільки якщо є audioUrl */}
      {audioUrl && (
        <div style={{ background: '#fff', borderRadius: 20, border: `1.5px solid ${lineColor}30`, padding: '16px 20px' }}>
          <audio ref={audioRef} src={audioUrl} preload="metadata" />

          <div style={{ fontSize: 12, fontWeight: 700, color: lineColor, textTransform: 'uppercase', letterSpacing: .8, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            🎧 Аудіо-розповідь
            {playing && (
              <span style={{ display: 'inline-flex', gap: 2, alignItems: 'flex-end', height: 14 }}>
                {[1, 2, 3].map(i => (
                  <span key={i} style={{ width: 3, background: lineColor, borderRadius: 2, animation: `wave${i} 0.8s ease-in-out infinite`, display: 'inline-block' }} />
                ))}
                <style>{`
                  @keyframes wave1 { 0%,100%{height:4px} 50%{height:12px} }
                  @keyframes wave2 { 0%,100%{height:8px} 50%{height:4px} }
                  @keyframes wave3 { 0%,100%{height:4px} 50%{height:10px} }
                `}</style>
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Кнопка play/pause */}
            <button
              onClick={togglePlay}
              style={{ width: 44, height: 44, borderRadius: '50%', border: 'none', background: lineColor, color: '#fff', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
            >
              {playing ? '⏸' : '▶'}
            </button>

            {/* Прогрес */}
            <div style={{ flex: 1 }}>
              <div
                onClick={handleSeek}
                style={{ height: 6, background: '#EEEEF5', borderRadius: 3, overflow: 'hidden', cursor: 'pointer', marginBottom: 4 }}
              >
                <div style={{ height: '100%', width: `${progress}%`, background: lineColor, borderRadius: 3, transition: 'width .1s linear' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#8888A8' }}>
                <span>{formatTime(audioRef.current?.currentTime ?? 0)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

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

    </div>
  );
}