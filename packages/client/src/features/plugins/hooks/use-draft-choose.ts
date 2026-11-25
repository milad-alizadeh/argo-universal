import type { DraftChooseInput } from '@repo/contracts/operations/plugin-drafts';
import {
  draftRegionLabel,
  type DraftPage,
} from '@repo/contracts/plugins/drafts';
import { useMutation } from '@tanstack/react-query';
import { useEffect } from 'react';
import type { z } from 'zod';
import { useTRPC } from '#features/connection';
import { draftComments } from '../stores/draft-comments';
import type { PageOpening } from '../utils/page-addresses';
import { stateKey } from '../utils/page-keys';

export type DraftChooseFeedback = {
  kind: 'delivered' | 'refused' | 'no-session';
  message: string;
};

const deliveredDurationMs = 5_000;

function delivered(picks: number, comments: number): DraftChooseFeedback {
  const count = comments === 1 ? '1 comment' : `${comments} comments`;
  const items = picks === 0 ? count : 'picks';
  const summary = picks > 0 && comments > 0 ? `picks and ${count}` : items;
  const verb = picks === 0 && comments === 1 ? 'was' : 'were';

  return { kind: 'delivered', message: `Your ${summary} ${verb} sent.` };
}

type DraftChooseError = { message: string; data?: { code: string } | null };

function refused(
  error: DraftChooseError,
  draft: DraftPage | null,
): DraftChooseFeedback {
  if (error.data?.code === 'PRECONDITION_FAILED')
    return {
      kind: 'no-session',
      message:
        'Ask the Agent in your drafting Session to show this Draft, then choose again.',
    };

  const [, regionId, variantId] =
    /^Region (\S+) declares no Variant (\S+)$/.exec(error.message) ?? [];

  if (!variantId) return { kind: 'refused', message: error.message };

  const region = draft?.regions?.find(({ id }) => id === regionId);
  const variant = region?.variants.find(({ id }) => id === variantId);
  const label = variant?.name ?? draftRegionLabel(variantId);

  return {
    kind: 'refused',
    message: `The ${label} Variant is no longer available. Pick another Variant and choose again.`,
  };
}

interface DraftChooseControl {
  choose: (input: z.input<typeof DraftChooseInput>) => void;
  choosing: boolean;
  feedback: DraftChooseFeedback | null;
  dismiss: () => void;
}

export function useDraftChoose(
  opening: PageOpening,
  draft: DraftPage | null,
): DraftChooseControl {
  const options = useTRPC().plugin.draft.choose.mutationOptions();

  const { mutate, reset, isPending, isSuccess, error, variables } = useMutation(
    {
      ...options,
      mutationKey: [...options.mutationKey, ...stateKey(opening)],
      // Keep notes created while the submitted comments are in flight.
      onSuccess: (_choice, { comments }) =>
        draftComments.sent(opening, comments),
    },
  );

  useEffect(() => {
    if (!isSuccess) return;

    const timer = setTimeout(reset, deliveredDurationMs);

    return (): void => clearTimeout(timer);
  }, [isSuccess, reset]);

  const feedback =
    isSuccess && variables
      ? delivered(variables.picks.length, variables.comments?.length ?? 0)
      : error && refused(error, draft);

  return { choose: mutate, choosing: isPending, feedback, dismiss: reset };
}
