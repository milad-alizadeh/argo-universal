import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { expect, fn, within } from 'storybook/test';
import { layoutWidths } from '#lib/generic/each-layout';
import { settleViewport } from '#lib/generic/settle-viewport';
import { Text } from '#primitives/display/text';
import { ScreenHeaderMock } from '../../../../mocks/screen-header-mock';
import {
  SectionFiltersProvider,
  sectionRootHeaders,
  useSectionFilters,
} from './section-content';

const onNewSession = fn();

// The narrow Sessions root's header beside what the shell's filter holds, as the list below it reads it.
function SessionsRootHeader(): React.JSX.Element {
  const filters = useSectionFilters();
  const { sessions } = filters;

  return (
    <>
      <ScreenHeaderMock
        {...sectionRootHeaders(filters, onNewSession).sessions}
      />
      <Text>{sessions.archived ? 'Listing Archived' : 'Listing Active'}</Text>
    </>
  );
}

function SessionsRootHeaderWithFilters(): React.JSX.Element {
  return (
    <SectionFiltersProvider>
      <SessionsRootHeader />
    </SectionFiltersProvider>
  );
}

const meta = {
  title: 'Tests/SectionRootHeaders',
  component: SessionsRootHeaderWithFilters,
  // A section root's header is a narrow window's.
  beforeEach: (): Promise<void> => settleViewport(layoutWidths.phone),
} satisfies Meta<typeof SessionsRootHeaderWithFilters>;

export default meta;

type Story = StoryObj<typeof meta>;

export const SessionsFilterReachesTheList: Story = {
  play: async ({ canvas, userEvent }) => {
    await expect(canvas.getByText('Listing Active')).toBeVisible();
    await userEvent.click(
      canvas.getByRole('button', { name: 'Filter Sessions' }),
    );
    await userEvent.click(
      within(document.body).getByRole('menuitemradio', { name: 'Archived' }),
    );
    await expect(await canvas.findByText('Listing Archived')).toBeVisible();
  },
};
