import type { ComposerProps } from '#features/composer';
import type { ElicitationFormProps } from '#features/requests';

// While a question is open, the Composer drops the plan it would otherwise show.
export function composerUnderQuestion(
  composer: ComposerProps,
  question?: ElicitationFormProps,
): ComposerProps {
  if (!question) return composer;

  return {
    ...composer,
    writtenPlan: undefined,
    status: composer.status && { ...composer.status, plan: undefined },
  };
}
