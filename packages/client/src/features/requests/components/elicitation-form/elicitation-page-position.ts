export const questionPageIndex = (index: number, count: number): number =>
  Math.max(0, Math.min(count - 1, index));

type QuestionPosition = { index: number; count: number; last: boolean };

export function questionPosition(
  index: number,
  count: number,
): QuestionPosition {
  return { index, count, last: index >= count - 1 };
}
