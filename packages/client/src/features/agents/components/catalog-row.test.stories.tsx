import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, spyOn, waitFor } from 'storybook/test';
import {
  base64Icon,
  encodedIcon,
  iconAgent,
  iconXml,
  malformedIconXml,
} from '../../../mocks/registry-icons';
import { CatalogRow } from './catalog-row';

const meta = {
  title: 'Tests/CatalogRow',
  component: CatalogRow,
  args: { agent: iconAgent },
} satisfies Meta<typeof CatalogRow>;
export default meta;
type Story = StoryObj<typeof meta>;
interface IconCase {
  uri?: string;
  response?: string;
  status?: number;
  unavailable?: boolean;
}

function iconCase(options: IconCase): Story {
  const { uri, response, status, unavailable } = {
    response: iconXml,
    status: 200,
    unavailable: false,
    ...options,
  };
  return {
    args: { agent: { ...iconAgent, entry: { ...iconAgent.entry, icon: uri } } },
    beforeEach: (): (() => void) => {
      const port = spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(response, { status }),
      );
      return (): void => port.mockRestore();
    },
    play: async ({ canvas }): Promise<void> => {
      const present = `${iconAgent.entry.name} icon${unavailable ? ' unavailable' : ''}`;
      const absent = `${iconAgent.entry.name} icon${unavailable ? '' : ' unavailable'}`;
      await waitFor(() =>
        expect(canvas.getByLabelText(present, { exact: true })).toBeVisible(),
      );
      await expect(
        canvas.queryByLabelText(absent, { exact: true }),
      ).not.toBeInTheDocument();
    },
  };
}

export const EncodedWithoutNativeDecoding: Story = iconCase({
  uri: encodedIcon,
  response: encodedIcon.slice(encodedIcon.indexOf(',') + 1),
});
export const Base64: Story = iconCase({ uri: base64Icon });
export const Url: Story = iconCase({ uri: 'https://example.org/icon.svg' });
export const Missing: Story = iconCase({ unavailable: true });
export const MalformedEncoding: Story = iconCase({
  uri: 'data:image/svg+xml,%GG',
  unavailable: true,
});
export const MalformedXml: Story = iconCase({
  uri: `data:image/svg+xml,${encodeURIComponent(malformedIconXml)}`,
  response: malformedIconXml,
  unavailable: true,
});
export const UnavailableUrl: Story = iconCase({
  uri: 'https://example.org/unavailable.svg',
  status: 503,
  unavailable: true,
});
export const MalformedUrlXml: Story = iconCase({
  uri: 'https://example.org/malformed.svg',
  response: malformedIconXml,
  unavailable: true,
});
