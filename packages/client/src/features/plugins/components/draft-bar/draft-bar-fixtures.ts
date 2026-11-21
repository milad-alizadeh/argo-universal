import {
  draftStateIds,
  draftStateLabels,
} from '@repo/contracts/plugins/drafts';
import type { DraftBarProps } from './draft-bar';

const drawn = new Set<string>([
  'loading',
  'empty',
  'error',
  'pending',
  'populated',
]);

const states = draftStateIds.map((id) => ({
  id,
  label: draftStateLabels[id],
  missing: !drawn.has(id),
}));

export const populatedDraft = {
  states,
  current: 'populated',
} satisfies Pick<DraftBarProps, 'states' | 'current'>;

export const loadingDraft = {
  states,
  current: 'loading',
} satisfies Pick<DraftBarProps, 'states' | 'current'>;
