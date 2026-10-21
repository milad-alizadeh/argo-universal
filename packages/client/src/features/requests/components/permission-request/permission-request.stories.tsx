import { SizeClass } from '@repo/kit/size-class/size-class';
import { Variation, Variations } from '@repo/kit/variations';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import type { ComponentProps, ReactNode } from 'react';
import { View } from 'react-native';
import {
  answeredElsewhere,
  galleryVariations,
  PermissionPreview,
} from '../../../../../mocks/requests/permission/permission-gallery';
import type { RequestState } from '../request-card/request-card';
import {
  permissionProps,
  permissionMock,
  permissionMocks,
} from '../request.mocks';
import {
  PermissionRequest,
  type PermissionRequestProps,
} from './permission-request';

type GalleryArgs = ComponentProps<typeof PermissionRequest> & {
  agent: (typeof permissionMock)['agent'];
  requestState: NonNullable<
    ComponentProps<typeof PermissionRequest>['state']
  >['kind'];
};

const meta = {
  title: 'Requests/PermissionRequest',
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
  render: function RequestGallery(args): React.JSX.Element {
    const request = <PermissionPreview {...galleryRequestProps(args)} />;

    return (
      <SizeClass compact={request} wide={<WideGallery request={request} />} />
    );
  },
} satisfies StoryObj<GalleryArgs>;

// The request the controls drive, from the chosen Agent's recording.
function galleryRequestProps(args: GalleryArgs): PermissionRequestProps {
  const selected = permissionProps({
    mock:
      permissionMocks.find((mock) => mock.agent === args.agent) ??
      permissionMock,
  });

  return permissionProps({
    ...args,
    request: selected.request,
    input: selected.input,
    state: answeredState(args.requestState),
  });
}

function answeredState(kind: GalleryArgs['requestState']): RequestState {
  return kind === 'answered'
    ? { kind: 'answered', reason: answeredElsewhere }
    : { kind };
}

function WideGallery({ request }: { request: ReactNode }): React.JSX.Element {
  return (
    <View className="w-full items-center py-4">
      <Variations className="max-w-column!">
        <Variation label="Permission request">{request}</Variation>
        {galleryVariations.map(({ label, preview }) => (
          <Variation key={label} label={label}>
            {preview}
          </Variation>
        ))}
      </Variations>
    </View>
  );
}
