import { Location, AgeGroup, AgeContent } from '@/types';

/**
 * Повертає контент локації (info + quiz) для обраної вікової групи.
 *
 * Пріоритет:
 *   1. content[ageGroup] — якщо команда вже наповнила для цієї групи
 *   2. content.adults    — якщо є хоч якийсь вік-контент, падаємо на дорослих
 *   3. info/quiz         — legacy поля локації (до міграції)
 */
export function getLocationContent(
  loc: Location,
  ageGroup: AgeGroup,
): AgeContent {
  const preferred = loc.content?.[ageGroup];
  if (preferred) return preferred;

  const adultsFallback = loc.content?.adults;
  if (adultsFallback) return adultsFallback;

  return {
    info: loc.info,
    quiz: loc.quiz,
  };
}