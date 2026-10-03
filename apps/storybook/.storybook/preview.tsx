import { withTrpcMocks } from '@repo/client/mocks';
import type { Preview } from '@storybook/react-native-web-vite';
import '../global.css';

const preview: Preview = {
  // Stories get tRPC fixtures from parameters.trpc (ADR 0010).
  decorators: [withTrpcMocks],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
