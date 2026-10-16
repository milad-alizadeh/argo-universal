import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { Button } from '#primitives/buttons/button';
import { useWide } from '../../../use-wide/use-wide';
import { Variation, Variations } from '../../../variations';
import { Callout } from './callout';
import type { CalloutProps } from './callout-props';

const stderr = `npm error code E404
npm error 404 Not Found - GET https://registry.npmjs.org/@zed-industries%2fcodex-acp
npm error 404 '@zed-industries/codex-acp@0.3.9' is not in this registry.`;

const info = {
  title: 'No Agents added yet',
  description: 'Click "Add Agent" to get started.',
  actions: <Button size="sm" fullWidth="narrow" label="Add Agent" />,
} satisfies CalloutProps;

const error = {
  tone: 'danger',
  title: 'Failed to Launch',
  description: 'Agent exited with status 1',
  detail: stderr,
  actions: <Button size="sm" fullWidth="narrow" label="Retry" />,
} satisfies CalloutProps;

const busy = {
  busy: true,
  title: 'Authenticating to Codex…',
  actions: (
    <Button size="sm" fullWidth="narrow" variant="secondary" label="Cancel" />
  ),
} satisfies CalloutProps;

const examples = { info, error, busy };

type GalleryArgs = { example: keyof typeof examples };

const meta = {
  title: 'Design System/Primitives/Callout',
  component: CalloutGallery,
  args: { example: 'info' },
  argTypes: {
    example: { options: Object.keys(examples), control: 'select' },
  },
} satisfies Meta<typeof CalloutGallery>;

export default meta;

const variations: [label: string, example: CalloutProps][] = [
  ['Info', info],
  ['Error', error],
  ['Busy', busy],
];

// A phone presents each callout as a sheet, so it shows the one the example control picks.
function CalloutGallery(args: GalleryArgs): React.JSX.Element {
  if (!useWide()) return <Callout {...examples[args.example]} />;

  return (
    <Variations>
      {variations.map(([label, example]) => (
        <Variation key={label} label={label}>
          <Callout {...example} />
        </Variation>
      ))}
    </Variations>
  );
}

export const Overview: StoryObj<typeof meta> = { name: 'Callout' };
