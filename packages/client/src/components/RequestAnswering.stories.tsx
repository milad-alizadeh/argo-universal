import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import {
  createRequestFixtures,
  elicitationMock,
  permissionMock,
  RequestAnsweringPreview,
} from '../../mocks/request-preview';

const meta = {
  title: 'Sessions/RequestAnswering',
  component: RequestAnsweringPreview,
  parameters: { previewPadding: false },
} satisfies Meta<typeof RequestAnsweringPreview>;
export default meta;
type Story = StoryObj<typeof meta>;
const permissionFixtures = createRequestFixtures(permissionMock);
const elicitationFixtures = createRequestFixtures(elicitationMock);

export const Permission: Story = {
  args: { mock: permissionMock },
  parameters: { trpc: permissionFixtures },
  beforeEach: () => permissionFixtures.reset(),
};
export const Elicitation: Story = {
  args: { mock: elicitationMock },
  parameters: { trpc: elicitationFixtures },
  beforeEach: () => elicitationFixtures.reset(),
};
