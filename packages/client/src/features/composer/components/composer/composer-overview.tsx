import type * as React from 'react';
import { Platform, ScrollView, View } from 'react-native';
import { action } from 'storybook/actions';
import {
  composerProps,
  type ComposerMockProps,
  composerImages,
  composerPlanDone,
  oversizedComposerImage,
} from '../../../../../mocks/composer-mock';
import { Variation, Variations } from '../../../../lib/generic/variations';
import { Composer } from './composer';

const spacingAndColoursPrompt = 'Match the spacing and colours.';

const variations: { label: string; props: Partial<ComposerMockProps> }[] = [
  { label: 'Empty', props: {} },
  {
    label: 'Typing',
    props: { draft: { text: spacingAndColoursPrompt, attachments: [] } },
  },
  {
    label: 'Multi-line',
    props: {
      draft: {
        text: 'Match the spacing and colours.\nKeep the phone layout readable.\nUse the shared light and dark themes.',
        attachments: [],
      },
    },
  },
  {
    label: 'Scrollable draft',
    props: {
      draft: {
        text: 'First line\nSecond line\nThird line\nFourth line\nFifth line\nSixth line',
        attachments: [],
      },
    },
  },
  {
    label: 'Images attached',
    props: {
      draft: { text: 'Match these screenshots.', attachments: composerImages },
    },
  },
  {
    label: 'Attachment too large',
    props: {
      draft: {
        text: 'Match these screenshots.',
        attachments: [oversizedComposerImage],
      },
    },
  },
  {
    label: 'Sending',
    props: {
      draft: { text: spacingAndColoursPrompt, attachments: [] },
      sending: true,
    },
  },
  {
    label: 'Disabled',
    props: {
      draft: { text: spacingAndColoursPrompt, attachments: [] },
      disabled: true,
    },
  },
  {
    label: 'Turn running',
    props: { sessionStarted: true, running: true, onStop: action('stop Turn') },
  },
  { label: 'In a Session', props: { sessionStarted: true } },
  {
    label: 'Plan done',
    props: { sessionStarted: true, plan: composerPlanDone },
  },
  { label: 'No Plan', props: { sessionStarted: true, plan: [] } },
];

export function ComposerOverview(args: ComposerMockProps): React.JSX.Element {
  const overview = <ComposerVariations {...args} />;

  return Platform.OS === 'web' ? (
    overview
  ) : (
    <ScrollView style={{ flex: 1 }}>{overview}</ScrollView>
  );
}

function ComposerVariations(args: ComposerMockProps): React.JSX.Element {
  return (
    <View className="w-full items-center p-4">
      <View className="w-full max-w-column">
        <Variations className="max-w-none">
          {variations.map((variation) => (
            <Variation key={variation.label} label={variation.label}>
              <Composer {...composerProps({ ...args, ...variation.props })} />
            </Variation>
          ))}
        </Variations>
      </View>
    </View>
  );
}
