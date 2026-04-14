import { Line } from '@/types';
import { LOCATIONS, LINE_BLUE_ORDER, LINE_RED_ORDER } from '@/data/locations';

export function getLineOrder(line: Line) {
  return line === 'blue' ? LINE_BLUE_ORDER : LINE_RED_ORDER;
}

export function getNextSlug(line: Line, currentSlug: string): string | null {
  const order = getLineOrder(line);
  const idx = order.indexOf(currentSlug);
  if (idx === -1 || idx === order.length - 1) return null;
  return order[idx + 1];
}

export function getLocationBySlug(slug: string) {
  return LOCATIONS.find(l => l.slug === slug) ?? null;
}

export function getLineLocations(line: Line) {
  const order = getLineOrder(line);
  return order.map(slug => LOCATIONS.find(l => l.slug === slug)!);
}

export const LINE_COLOR = {
  blue: '#378ADD',
  red:  '#E24B4A',
} as const;

export const LINE_LABEL = {
  blue: 'Синя лінія',
  red:  'Червона лінія',
} as const;

export const LINE_START = {
  blue: 'Залізничний вокзал',
  red:  'Автовокзал',
} as const;