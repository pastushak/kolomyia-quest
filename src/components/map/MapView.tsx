'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip } from 'react-leaflet';
import { Line, Location } from '@/types';
import { LINE_COLOR } from '@/lib/utils';
import 'leaflet/dist/leaflet.css';

// Базовий URL маршрутизатора. Замінити на власний OSRM/провайдер перед лончем —
// публічний demo має жорсткі ліміти й нестабільний.
const OSRM_BASE = 'https://router.project-osrm.org';
const OSRM_TIMEOUT_MS = 6000;

interface Props {
  line:           Line;
  locations:      Location[];
  completedSlugs: string[];
  activeSlug?:    string;
}

export default function MapView({ line, locations, completedSlugs, activeSlug }: Props) {
  const [routePoints, setRoutePoints] = useState<[number, number][]>([]);
  const [routeLoading, setRouteLoading] = useState(true);

  const color     = LINE_COLOR[line];
  const positions = locations.map(l => [l.lat, l.lng] as [number, number]);
  const center    = positions[Math.floor(positions.length / 2)];

  // Стабільний "відбиток" точок — щоб ефект не перезапускався на кожен ререндер
  // через нову референцію масиву locations.
  const routeKey = locations.map(l => `${l.lat},${l.lng}`).join('|');

  // Завантажуємо OSRM маршрут при зміні набору точок
  useEffect(() => {
    let cancelled = false;

    if (locations.length < 2) {
      setRoutePoints(positions);
      setRouteLoading(false);
      return;
    }

    async function loadRoute() {
      setRouteLoading(true);

      // Таймаут через AbortController — щоб не висіти на повільному demo-сервері
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), OSRM_TIMEOUT_MS);

      try {
        const coords = positions.map(([lat, lng]) => `${lng},${lat}`).join(';');
        const url = `${OSRM_BASE}/route/v1/foot/${coords}?overview=full&geometries=geojson`;
        const res  = await fetch(url, { signal: controller.signal });
        const data = await res.json();

        if (cancelled) return;

        if (data.code === 'Ok' && data.routes?.[0]) {
          const pts = data.routes[0].geometry.coordinates.map(
            ([lng, lat]: [number, number]) => [lat, lng] as [number, number]
          );
          setRoutePoints(pts);
        } else {
          setRoutePoints(positions); // fallback — прямі лінії
        }
      } catch {
        // Таймаут або помилка мережі — малюємо прямі лінії, карта не висить
        if (!cancelled) setRoutePoints(positions);
      } finally {
        clearTimeout(timer);
        if (!cancelled) setRouteLoading(false);
      }
    }

    loadRoute();

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeKey]);

  if (!locations || locations.length === 0) return null;

  return (
    <MapContainer
      center={center}
      zoom={15}
      style={{ width: '100%', height: '100%' }}
      zoomControl={false}
      scrollWheelZoom={false}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="© OpenStreetMap"
      />

      {/* Маршрут — по вулицях якщо завантажено, пряма лінія поки завантажується */}
      {routeLoading ? (
        // Placeholder — пряма лінія поки OSRM не відповів
        <Polyline
          positions={positions}
          pathOptions={{ color, weight: 3, opacity: 0.4, dashArray: '6 6' }}
        />
      ) : (
        <Polyline
          positions={routePoints}
          pathOptions={{ color, weight: 4, opacity: 0.9 }}
        />
      )}

      {/* Маркери локацій */}
      {locations.map((loc, i) => {
        const done   = completedSlugs.includes(loc.slug);
        const active = loc.slug === activeSlug;

        const markerColor =
          done                  ? '#9CA3AF' :
          loc.type === 'finish' ? '#7F77DD' :
          loc.type === 'shared' ? '#2D7A4F' :
          color;

        return (
          <CircleMarker
            key={loc.slug}
            center={[loc.lat, loc.lng]}
            radius={active ? 14 : 10}
            pathOptions={{
              fillColor:   markerColor,
              fillOpacity: 1,
              color:       '#fff',
              weight:      active ? 3 : 2,
            }}
          >
            <Tooltip direction="top" offset={[0, -14]} opacity={1}>
              <span style={{ fontSize: 12, fontWeight: 600 }}>
                {i + 1}. {loc.name}
              </span>
            </Tooltip>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}