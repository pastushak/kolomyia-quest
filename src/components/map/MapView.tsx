'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip } from 'react-leaflet';
import { Line, Location } from '@/types';
import { LINE_COLOR } from '@/lib/utils';
import 'leaflet/dist/leaflet.css';

interface Props {
  line:           Line;
  locations:      Location[];
  completedSlugs: string[];
  activeSlug?:    string;
}

// Запит до OSRM — повертає масив координат по вулицях між двома точками
async function fetchOsrmRoute(
  from: [number, number],
  to:   [number, number],
): Promise<[number, number][]> {
  try {
    const url = `https://router.project-osrm.org/route/v1/foot/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`;
    const res  = await fetch(url);
    const data = await res.json();
    if (data.code !== 'Ok' || !data.routes?.[0]) return [from, to];
    // GeoJSON coordinates — [lng, lat] → конвертуємо в [lat, lng]
    return data.routes[0].geometry.coordinates.map(
      ([lng, lat]: [number, number]) => [lat, lng] as [number, number]
    );
  } catch {
    return [from, to]; // fallback — пряма лінія
  }
}

export default function MapView({ line, locations, completedSlugs, activeSlug }: Props) {
  const [routePoints, setRoutePoints] = useState<[number, number][]>([]);
  const [routeLoading, setRouteLoading] = useState(true);

  const color     = LINE_COLOR[line];
  const positions = locations.map(l => [l.lat, l.lng] as [number, number]);
  const center    = positions[Math.floor(positions.length / 2)];

  // Завантажуємо OSRM маршрут при mount
  useEffect(() => {
    if (locations.length < 2) {
      setRoutePoints(positions);
      setRouteLoading(false);
      return;
    }

    async function loadRoute() {
      setRouteLoading(true);
      try {
        // Один запит для всього маршруту
        const coords = positions.map(([lat, lng]) => `${lng},${lat}`).join(';');
        const url = `https://router.project-osrm.org/route/v1/foot/${coords}?overview=full&geometries=geojson`;
        const res  = await fetch(url);
        const data = await res.json();
        if (data.code === 'Ok' && data.routes?.[0]) {
          const pts = data.routes[0].geometry.coordinates.map(
            ([lng, lat]: [number, number]) => [lat, lng] as [number, number]
          );
          setRoutePoints(pts);
        } else {
          setRoutePoints(positions);
        }
      } catch {
        setRoutePoints(positions); // fallback
      }
      setRouteLoading(false);
    }

    loadRoute();
  }, [locations]);

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