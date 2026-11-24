import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, waitFor, within } from 'storybook/test';
import {
  scheduleOf,
  SessionSchedulesPreview,
  sessionSchedulesFixture,
} from '../../../mocks/sessions/session-schedules.mocks';

const meta = {
  title: 'Tests/Screens/Sessions/SessionSchedules',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const build = 'Check the build';

const review = 'Review open pull requests';

// A Schedule made, changed or removed on another Device reaches this one through the Server's push; nothing asks the Server again.
export const ShowsSchedulesTheServerPushes: Story = {
  play: async ({ mount, canvasElement }) => {
    const fixture = sessionSchedulesFixture([scheduleOf('a', build)]);

    await mount(<SessionSchedulesPreview fixture={fixture} />);
    const canvas = within(canvasElement);

    await expect(await canvas.findByText(build)).toBeVisible();
    await waitFor(() => expect(fixture.updatesStarted()).toBe(1));

    fixture.push([scheduleOf('a', build), scheduleOf('b', review)]);
    await expect(await canvas.findByText(review)).toBeVisible();

    fixture.push([scheduleOf('b', review)]);
    await waitFor(() => expect(canvas.queryByText(build)).toBeNull());

    await expect(fixture.listReads()).toBe(1);
    await expect(fixture.pollIntervals()).toEqual([]);
  },
};
