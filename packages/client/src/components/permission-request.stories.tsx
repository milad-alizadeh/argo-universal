import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { Variation, Variations } from '../../mocks/primitive-story-variations';
import {
  PermissionFeedPreview,
  PermissionRequestPreview,
} from '../../mocks/request-preview';
import { PermissionOutcome } from './permission-outcome';

const meta = {
  title: 'Sessions/PermissionRequest',
  component: PermissionRequestPreview,
  parameters: { previewPadding: false },
} satisfies Meta<typeof PermissionRequestPreview>;
export default meta;

export const Overview: StoryObj<typeof meta> = {
  name: 'PermissionRequest',
  render: () => (
    <View className="w-full items-center py-4">
      <Variations className="max-w-composer!">
        <Variation label="Permission request">
          <PermissionRequestPreview />
        </Variation>
        <Variation label="Deny with a message">
          <PermissionRequestPreview denialMessage="Keep the cache. Run expo start --clear instead." />
        </Variation>
        <Variation label="Already answered">
          <PermissionRequestPreview alreadyAnswered="Already answered on another device" />
        </Variation>
        <Variation label="Awaiting approval">
          <PermissionFeedPreview />
        </Variation>
        <Variation label="Allowed once">
          <PermissionFeedPreview answered />
        </Variation>
        <Variation label="Denied">
          <PermissionOutcome
            outcome={{ outcome: 'selected', optionId: 'reject_once' }}
          />
        </Variation>
        <Variation label="Denied with a message">
          <PermissionOutcome
            outcome={{ outcome: 'selected', optionId: 'reject_once' }}
            message="Don't force-push, open a new branch instead."
          />
        </Variation>
      </Variations>
    </View>
  ),
};
