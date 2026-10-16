import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { useWide } from '../../../../lib/generic/use-wide/use-wide';
import { Variation, Variations } from '../../../../lib/generic/variations';
import { CalloutLoading, LaunchCallout } from './launch-callout';

const exited = `Agent exited with status 1
npm error code E404
npm error 404 Not Found - GET https://registry.npmjs.org/@zed-industries%2fcodex-acp
npm error 404 '@zed-industries/codex-acp@0.3.9' is not in this registry.`;

const examples = { failed: 'Failed to Launch', retrying: 'Retrying' } as const;

type GalleryArgs = { example: keyof typeof examples };

const meta = {
  title: 'Sessions/LaunchCallout',
  component: LaunchCalloutGallery,
  args: { example: 'failed' },
  argTypes: {
    example: { options: Object.keys(examples), control: 'select' },
  },
} satisfies Meta<typeof LaunchCalloutGallery>;

export default meta;

const failed = <LaunchCallout message={exited} onRetry={() => {}} />;

// A phone presents the callout as a sheet and closes it while Retry runs.
function LaunchCalloutGallery(args: GalleryArgs): React.JSX.Element {
  if (!useWide())
    return args.example === 'failed' ? failed : <CalloutLoading />;

  return (
    <Variations>
      <Variation label={examples.failed}>{failed}</Variation>
      <Variation label={examples.retrying}>
        <CalloutLoading />
      </Variation>
    </Variations>
  );
}

export const Overview: StoryObj<typeof meta> = { name: 'LaunchCallout' };
