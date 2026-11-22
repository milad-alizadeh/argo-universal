import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { populatedSheet } from './session-workbench-sheet-fixtures';
import { WorkbenchSheetPreview } from './session-workbench-sheet.mocks';

// The preview wraps the sheet to hold it open, so its props table would show only the wrapper's one arg.
const meta = {
  title: 'Screens/Sessions/Session/WorkbenchSheet',
  component: WorkbenchSheetPreview,
  tags: ['!autodocs'],
  parameters: { screenPreview: true },
  globals: { viewport: { value: 'phone' } },
  args: populatedSheet,
} satisfies Meta<typeof WorkbenchSheetPreview>;

export default meta;

type Story = StoryObj<typeof meta>;

// A phone's Workbench: each card a titled section of native rows, its live items first and a count for the rest.
export const Populated: Story = {};
