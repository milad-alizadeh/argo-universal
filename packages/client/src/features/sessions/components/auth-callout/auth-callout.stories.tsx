import { SizeClass } from '@repo/kit/size-class/size-class';
import { Variation, Variations } from '@repo/kit/variations';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { AuthCallout } from './auth-callout';
import { authCallouts } from './auth-callout.mocks';

const noop = (): void => {};

const actions = { onAuthenticate: noop, onCancel: noop };

type GalleryArgs = { example: keyof typeof authCallouts };

const meta = {
  title: 'Sessions/AuthCallout',
  component: AuthCalloutGallery,
  args: { example: 'oneMethod' },
  argTypes: {
    example: { options: Object.keys(authCallouts), control: 'select' },
  },
} satisfies Meta<typeof AuthCalloutGallery>;

export default meta;

const variations: [label: string, example: GalleryArgs['example']][] = [
  ['One method', 'oneMethod'],
  ["The Agent's message", 'agentMessage'],
  ['Several methods', 'severalMethods'],
  ['Pending', 'pending'],
  ['A failed attempt', 'failed'],
];

// A phone presents the callout as a sheet, so it shows the one the example control picks.
function AuthCalloutGallery(args: GalleryArgs): React.JSX.Element {
  return (
    <SizeClass
      compact={<AuthCallout {...authCallouts[args.example]} {...actions} />}
      wide={gallery}
    />
  );
}

const gallery = (
  <Variations>
    {variations.map(([label, example]) => (
      <Variation key={label} label={label}>
        <AuthCallout {...authCallouts[example]} {...actions} />
      </Variation>
    ))}
  </Variations>
);

export const Overview: StoryObj<typeof meta> = { name: 'AuthCallout' };
