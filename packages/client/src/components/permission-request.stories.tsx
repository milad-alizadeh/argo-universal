import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ComponentProps } from 'react';
import { View } from 'react-native';
import { Variation, Variations } from '../../mocks/primitive-story-variations';
import {
  PermissionFeedPreview,
  PermissionRequestPreview,
  permissionMock,
  permissionMocks,
} from '../../mocks/request-preview';
import { PermissionOutcome } from './permission-outcome';

type GalleryArgs = ComponentProps<typeof PermissionRequestPreview> & {
  agent: (typeof permissionMock)['agent'];
  requestState: NonNullable<
    ComponentProps<typeof PermissionRequestPreview>['state']
  >['kind'];
};

const meta = {
  title: 'Sessions/PermissionRequest',
  component: PermissionRequestPreview,
  parameters: { previewPadding: false },
  args: { agent: permissionMock.agent, requestState: 'open' },
  argTypes: {
    agent: { options: ['agent-1', 'agent-2'], control: 'select' },
    requestState: {
      options: ['open', 'submitting', 'answered'],
      control: 'select',
    },
    mock: { control: false },
    state: { control: false },
    error: { control: 'text' },
  },
} satisfies Meta<GalleryArgs>;
export default meta;

export const Overview: StoryObj<GalleryArgs> = {
  name: 'PermissionRequest',
  render: (args) => (
    <View className="w-full items-center py-4">
      <Variations className="max-w-composer!">
        <Variation label="Permission request">
          <PermissionRequestPreview
            {...args}
            mock={
              permissionMocks.find((mock) => mock.agent === args.agent) ??
              permissionMock
            }
            state={
              args.requestState === 'answered'
                ? {
                    kind: 'answered',
                    reason: 'Already answered on another device',
                  }
                : { kind: args.requestState }
            }
          />
        </Variation>
        <Variation label="Deny with a message">
          <PermissionRequestPreview denialMessage="Keep the cache. Run expo start --clear instead." />
        </Variation>
        <Variation label="Already answered">
          <PermissionRequestPreview
            state={{
              kind: 'answered',
              reason: 'Already answered on another device',
            }}
          />
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
