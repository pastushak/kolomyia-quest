// ── Лінії маршрутів ──────────────────────────────────────
export type Line = 'cherry' | 'orange' | 'green';
export type LocationType = 'start' | 'regular' | 'shared' | 'finish';

// ── Вікові групи ─────────────────────────────────────────
export type AgeGroup = 'kids' | 'teens' | 'adults';

// ── Віковий контент ───────────────────────────────────────
export interface AgeContent {
  info?: string;
  quiz?: QuizQuestion | null;
}

// ── Квіз ─────────────────────────────────────────────────
export interface QuizQuestion {
  question:     string;
  options:      string[];
  correctIndex: number;
  explanation:  string;
}

// Квіз прив'язаний до конкретної лінії на спільній локації
export interface LineQuiz {
  line:         Line;
  question:     string;
  options:      string[];
  correctIndex: number;
  explanation:  string;
}

// ── Локація (з MongoDB) ───────────────────────────────────
export interface Location {
  slug:      string;
  name:      string;
  lat:       number;
  lng:       number;
  address:   string;
  qrHint:    string;
  info:      string;
  type:      LocationType;

  // Яким лініям належить спот
  lines:     Line[];

  // На які лінії можна пересісти з цього споту
  transfers: Line[];

  // Квіз per-line (null = ще не готовий — показуємо "скоро")
  quizzes:   LineQuiz[] | null;
}

// ── Лінія маршруту (з MongoDB) ────────────────────────────
export interface QuestLine {
  key:       Line;
  label:     string;
  color:     string;
  startSlug: string;
  order:     string[];  // масив slug-ів у порядку проходження
}

// ── Сесія туриста (localStorage) ─────────────────────────
export interface Session {
  nickname:       string;
  line:           Line;
  ageGroup:       AgeGroup;
  completedSlugs: string[];
  xp:             number;
  bonusXp:        number;
  startedAt:      string;
  userId?:        string;
}

// ── Профіль залогіненого користувача ─────────────────────
export interface UserProfile {
  id:       string;
  email:    string;
  name:     string;
  avatarUrl?: string;
  totalXp:  number;
  completedLines: Array<{
    line:        Line;
    ageGroup:    AgeGroup;
    completedAt: string;
    finalXp:     number;
  }>;
}