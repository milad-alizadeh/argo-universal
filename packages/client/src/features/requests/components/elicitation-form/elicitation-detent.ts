import type { PendingElicitation } from '@repo/contracts';
import type { SheetDetent } from '#primitives/overlays/sheet';
import { elicitationQuestions } from './elicitation-questions';

// A question with this many options or fewer leaves its custom answer in view at the medium height.
const mediumOptions = 3;

/*
 * The height the phone's sheet opens at: a form's fields, or a question with more options than
 * fit, open large so every field and the custom answer are in reach; a short question opens medium.
 */
export function elicitationDetent(request: PendingElicitation): SheetDetent {
  const questions = elicitationQuestions(request);

  if (!questions) return 'large';

  return questions.some((question) => question.options.length > mediumOptions)
    ? 'large'
    : 'medium';
}
