import type { ArrivingRunProps } from './arriving-run-props';

// A run inside a paragraph is not a view on iOS and Android, so nothing can fade it there: it is drawn at once, as before.
export function ArrivingRun({ children }: ArrivingRunProps): string {
  return children;
}
