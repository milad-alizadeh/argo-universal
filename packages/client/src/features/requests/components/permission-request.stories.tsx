import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import type { ComponentProps } from 'react';
import { View } from 'react-native';
import { toFeedView } from '#features/feed';
import { FeedItem } from '#features/feed';
import { PermissionOutcome } from '#features/feed';
import {
  Variation,
  Variations,
} from '../../../../mocks/primitive-story-variations';
import {
  agentOptionsProps,
  agentOptionsWithAlwaysReject,
  permissionProps,
  permissionMock,
  permissionMocks,
} from '../../../../mocks/request-mock';
import { PermissionRequest } from './permission-request';

type GalleryArgs = ComponentProps<typeof PermissionRequest> & {
  agent: (typeof permissionMock)['agent'];
  requestState: NonNullable<
    ComponentProps<typeof PermissionRequest>['state']
  >['kind'];
};

const deniedOutcome = {
  outcome: 'selected',
  optionId: 'reject_once',
  name: 'Deny',
  kind: 'reject_once',
} as const;

const meta = {
  title: 'Sessions/PermissionRequest',
  component: PermissionRequest,
  parameters: { previewPadding: false },
  args: {
    ...permissionProps({}),
    agent: permissionMock.agent,
    requestState: 'open',
  },
  argTypes: {
    agent: { options: ['agent-1', 'agent-2'], control: 'select' },
    requestState: {
      options: ['open', 'submitting', 'answered'],
      control: 'select',
    },
    state: { control: false },
    error: { control: 'text' },
  },
} satisfies Meta<GalleryArgs>;
export default meta;

export const Overview = {
  name: 'PermissionRequest',
  render: (args): React.JSX.Element => {
    const selected = permissionProps({
      mock:
        permissionMocks.find((mock) => mock.agent === args.agent) ??
        permissionMock,
    });
    return (
      <View className="w-full items-center py-4">
        <Variations className="max-w-composer!">
          <Variation label="Permission request">
            <PermissionRequest
              {...permissionProps({
                ...args,
                request: selected.request,
                input: selected.input,
                state:
                  args.requestState === 'answered'
                    ? {
                        kind: 'answered',
                        reason: 'Already answered on another device',
                      }
                    : { kind: args.requestState },
              })}
            />
          </Variation>
          <Variation label="Agent options">
            <PermissionRequest {...agentOptionsProps({})} />
          </Variation>
          <Variation label="Several reject options">
            <PermissionRequest
              {...agentOptionsProps({ options: agentOptionsWithAlwaysReject })}
            />
          </Variation>
          <Variation label="Deny with a message">
            <PermissionRequest
              {...permissionProps({
                feedback: true,
                denialMessage:
                  'Keep the cache. Run expo start --clear instead.',
              })}
            />
          </Variation>
          <Variation label="Already answered">
            <PermissionRequest
              {...permissionProps({
                state: {
                  kind: 'answered',
                  reason: 'Already answered on another device',
                },
              })}
            />
          </Variation>
          <Variation label="Awaiting approval">
            {toFeedView(
              permissionMock.pending.rows,
              permissionMock.pending.snapshot,
            )
              .items.filter((item) => item.type === 'group')
              .map((item) => (
                <FeedItem key={item.id} item={item} imageUrl={() => ''} />
              ))}
          </Variation>
          <Variation label="Allowed once">
            {toFeedView(
              permissionMock.answered.rows,
              permissionMock.answered.snapshot,
            )
              .items.filter((item) => item.type === 'group')
              .map((item) => (
                <FeedItem key={item.id} item={item} imageUrl={() => ''} />
              ))}
          </Variation>
          <Variation label="Denied">
            <PermissionOutcome outcome={deniedOutcome} />
          </Variation>
          <Variation label="Denied with a message">
            <PermissionOutcome
              outcome={deniedOutcome}
              message="Don't force-push, open a new branch instead."
            />
          </Variation>
          <Variation label="Chose another allow option">
            <PermissionOutcome
              outcome={{
                outcome: 'selected',
                optionId: 'allow-always',
                name: 'Always Allow',
                kind: 'allow_always',
              }}
            />
          </Variation>
          <Variation label="Chose another reject option">
            <PermissionOutcome
              outcome={{
                outcome: 'selected',
                optionId: 'reject-always',
                name: 'Never allow',
                kind: 'reject_always',
              }}
            />
          </Variation>
        </Variations>
      </View>
    );
  },
} satisfies StoryObj<GalleryArgs>;
