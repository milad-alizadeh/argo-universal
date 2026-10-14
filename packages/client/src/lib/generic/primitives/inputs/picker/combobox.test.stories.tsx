import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { useState } from 'react';
import { expect, fn, waitFor, within } from 'storybook/test';
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

const chosen = fn<(value: Project) => void>();

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
      footerAction={{
        label: 'Add a Project',
        icon: 'add',
        onPress: addProject,
      }}
      {...props}
      value={value}
      onValueChange={(next) => {
        setValue(next);
        chosen(next);
      }}
    />
  );
}

const meta = {
  title: 'Tests/Combobox',
  render: (): React.JSX.Element => <ProjectCombobox />,
  beforeEach: (): void => {
    chosen.mockClear();
    addProject.mockClear();
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const overlay = (): ReturnType<typeof within> => within(document.body);

async function openProjects(
  canvas: ReturnType<typeof within>,
  userEvent: Parameters<NonNullable<Story['play']>>[0]['userEvent'],
): Promise<HTMLElement> {
  await userEvent.click(
    canvas.getByRole('button', { name: 'Project: argo-universal' }),
  );

  return overlay().findByRole('textbox', { name: 'Search Project' });
}

// Typing matches the supporting line too; one choice commits it and closes the list.
function searchAndChoose(width: number): Story {
  return {
    play: async ({ canvas, userEvent }) => {
      await settleViewport(width);
      const search = await openProjects(canvas, userEvent);
      await userEvent.type(search, 'handbook');
      await expect(
        overlay().queryByRole('button', { name: 'argo-universal' }),
      ).not.toBeInTheDocument();
      await userEvent.click(
        overlay().getByRole('button', { name: 'docs-site' }),
      );
      await expect(chosen).toHaveBeenCalledOnce();
      await expect(chosen).toHaveBeenCalledWith('docs');
      await waitFor(() =>
        expect(
          overlay().queryByRole('textbox', { name: 'Search Project' }),
        ).not.toBeInTheDocument(),
      );
      await expect(
        canvas.getByRole('button', { name: 'Project: docs-site' }),
      ).toBeVisible();
    },
  };
}

export const SearchAndChooseWide = searchAndChoose(layoutWidths.wide);

export const SearchAndChoosePhone = searchAndChoose(layoutWidths.phone);
