'use client';

import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip } from 'react-leaflet';
import { Line, Location } from '@/types';
import 'leaflet/dist/leaflet.css';

interface Props {
  line: Line;
  locations: Location[];
  completedSlugs: string[];
  activeSlug?: string;
}

const LINE_COLOR = { blue: '#2563EB', red: '#DC2626' };

export default function MapView({ line, locations, completedSlugs, activeSlug }: Props) {
  const positions = locations.map(l => [l.lat, l.lng] as [number, number]);
  const center    = positions[Math.floor(positions.length / 2)];

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

      <Polyline
        positions={positions}
        pathOptions={{ color: LINE_COLOR[line], weight: 4, opacity: 0.85 }}
      />

      {locations.map((loc, i) => {
        const done   = completedSlugs.includes(loc.slug);
        const active = loc.slug === activeSlug;
        const color  = loc.type === 'finish' ? '#7F77DD'
                     : loc.type === 'shared' ? '#2D7A4F'
                     : LINE_COLOR[line];

        return (
          <CircleMarker
            key={loc.slug}
            center={[loc.lat, loc.lng]}
            radius={active ? 14 : 10}
            pathOptions={{
              fillColor:   done ? '#9CA3AF' : color,
              fillOpacity: 1,
              color:       '#fff',
              weight:      active ? 3 : 2,
            }}
          >
            <Tooltip direction="top" offset={[0, -14]} opacity={1} permanent={false}>
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