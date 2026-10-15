import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { expect, within } from 'storybook/test';
import { Text } from '#primitives/display/text';
import { ScreenHeaderMock } from '../../../../mocks/screen-header-mock';
import { createNavigationRecorder } from '../../../../mocks/with-navigation-mocks';
import { SectionFiltersProvider, useSectionFilters } from './section-filters';
import { useSectionRootHeaders } from './section-root-headers';

const recorder = createNavigationRecorder();

// The narrow Sessions root's header beside what the shell's filter holds, as the list below it reads it.
function SessionsRootHeader(): React.JSX.Element {
  const { sessions } = useSectionFilters();

  return (
    <>
      <ScreenHeaderMock {...useSectionRootHeaders().sessions} />
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
  parameters: { navigation: recorder },
  beforeEach: (): void => recorder.reset(),
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
