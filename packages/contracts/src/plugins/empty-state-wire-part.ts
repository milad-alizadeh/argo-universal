import { emptyStateProps } from './kit-props';
import { part } from './plugin-part-schema-utils';
import type { WirePartDefinition } from './wire-parts';

export const emptyStateWirePart = {
  props: emptyStateProps,
  container: true,
  children: false,
  slots: { action: ['Button'] },
  events: {},
  reference: part(
    'A centred message for an empty container with an optional icon, description, and one action.',
    emptyStateProps,
    {
      slots: { action: ['Button'] },
      appearance:
        'Uses Argo semantic tokens and the approved EmptyState master; its icon illustration is decorative.',
      accessibility: {
        label:
          'The required `title` is a heading, followed by the optional description and action.',
        keyboard:
          'The container is not focusable. Its optional Button uses its standard keyboard behavior.',
        voiceOver:
          'Reads the title as a heading, then the optional description and action.',
        talkBack:
          'Reads the title as a heading, then the optional description and action.',
      },
    },
  ).reference,
} as const satisfies WirePartDefinition;
