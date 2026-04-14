export type Line = 'blue' | 'red';
export type LocationType = 'start' | 'regular' | 'shared' | 'finish';

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface Location {
  slug: string;
  name: string;
  lat: number;
  lng: number;
  line: Line | 'shared' | 'finish';
  type: LocationType;
  address: string;
  info: string;
  qrHint: string;
  quiz: QuizQuestion[];
}

export interface Session {
  nickname: string;
  line: Line;
  completedSlugs: string[];
  xp: number;
  startedAt: string;
}