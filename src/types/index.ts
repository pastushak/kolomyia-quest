// Чотири лінії маршрутів (було тільки blue/red)
export type Line = 'blue' | 'red' | 'orange' | 'green';
export type LocationType = 'start' | 'regular' | 'shared' | 'finish';

// НОВЕ: вікові групи
export type AgeGroup = 'kids' | 'teens' | 'adults';

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

// НОВЕ: варіативний контент для однієї вікової групи
export interface AgeContent {
  info: string;
  quiz: QuizQuestion[];
  funFact?: string;
}

export interface Location {
  slug: string;
  name: string;
  lat: number;
  lng: number;
  line: Line | 'shared' | 'finish';
  type: LocationType;
  address: string;

  // Підказка QR — загальна для всіх віків
  qrHint: string;

  // Контент за віковими групами (новий варіативний шар).
  // Може бути відсутнім на локаціях, які ще не мігровані — тоді
  // використовується fallback на info/quiz нижче.
  content?: {
    kids?: AgeContent;
    teens?: AgeContent;
    adults?: AgeContent;
  };

  // Legacy-поля — fallback для локацій без content (поки команда наповнює)
  info: string;
  quiz: QuizQuestion[];
}

export interface Session {
  nickname: string;
  line: Line;
  completedSlugs: string[];
  xp: number;
  startedAt: string;

  // НОВЕ
  ageGroup: AgeGroup;
  userId?: string;   // id з MongoDB (для залогінених через Google)
  bonusXp?: number;  // +20% бонус для залогінених
}

// НОВЕ: профіль залогіненого користувача (з NextAuth + наша User модель)
export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  totalXp: number;
  completedLines: Array<{
    line: Line;
    ageGroup: AgeGroup;
    completedAt: string;
    finalXp: number;
  }>;
}