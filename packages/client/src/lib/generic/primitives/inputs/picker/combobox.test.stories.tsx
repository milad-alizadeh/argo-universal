import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { expect, fn, within } from 'storybook/test';
import { layoutWidths } from '../../../each-layout';
import { settleViewport } from '../../../settle-viewport';
import { Combobox } from './combobox';
import type { ComboboxProps } from './picker-props';

const projects = [
  {
    value: 'argo',
    label: 'argo-universal',
    supporting: '~/Developer/argo-universal',
  },
  { value: 'paper', label: 'paper-sync', supporting: '~/Developer/paper-sync' },
  { value: 'docs', label: 'docs-site', supporting: '~/Code/handbook' },
] as const;

type Project = (typeof projects)[number]['value'];

const addProject = fn();

type ExampleProps = Partial<ComboboxProps<Project>>;

function ProjectCombobox(props: ExampleProps): React.JSX.Element {
  const [value, setValue] = useState<Project>('argo');

  return (
    <Combobox
      label="Project"
      options={projects}
      searchPlaceholder="Find a Project…"
      emptyLabel="No Project matches."
      loadingLabel="Loading Projects…"
      footerAction={{
        label: 'Add a Project',
        icon: 'add',
        onPress: addProject,
      }}
      {...props}
      value={value}
      onValueChange={setValue}
    />
  );
}

const meta = {
  title: 'Tests/Combobox',
  render: (): React.JSX.Element => <ProjectCombobox />,
  beforeEach: (): void => {
    addProject.mockClear();
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

type PlayContext = Parameters<NonNullable<Story['play']>>[0];

const overlay = (): ReturnType<typeof within> => within(document.body);

// Opens the Combobox on a wide window and returns its search field.
async function openProjects({
  canvas,
  userEvent,
}: PlayContext): Promise<HTMLElement> {
  await settleViewport(layoutWidths.wide);
  await userEvent.click(canvas.getByRole('button', { name: /^Project:/ }));

  return overlay().findByRole('textbox', { name: 'Search Project' });
}

// Search, choose and close are covered by the Composer's Project tests; the supporting line is new.
export const SearchMatchesSupportingLine: Story = {
  play: async (context) => {
    await context.userEvent.type(await openProjects(context), 'handbook');
    await expect(
      overlay().getByRole('button', { name: 'docs-site' }),
    ).toBeVisible();
  },
};

export const NoMatchShowsEmptyLabel: Story = {
  play: async (context) => {
    await context.userEvent.type(await openProjects(context), 'landing');
    await expect(overlay().getByText('No Project matches.')).toBeVisible();
  },
};

export const LoadingShowsLoadingLabel: Story = {
  render: () => <ProjectCombobox loading />,
  play: async (context) => {
    await openProjects(context);
    await expect(overlay().getByText('Loading Projects…')).toBeVisible();
  },
};

export const FooterActionRuns: Story = {
  play: async (context) => {
    await openProjects(context);
    await context.userEvent.click(
      overlay().getByRole('button', { name: 'Add a Project' }),
    );
    await expect(addProject).toHaveBeenCalledOnce();
  },
};
