import { withTrpcMocks } from '@repo/client/mocks';
import type { Preview } from '@storybook/react-native';

const preview: Preview = {
  // Stories get tRPC fixtures from parameters.trpc through the mock link (ADR 0010).
  decorators: [withTrpcMocks],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
  },
};

export default preview;
