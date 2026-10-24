import type { ProjectInfo } from '@repo/contracts';
import { FieldPicker } from '@repo/kit/primitives/fields/field-picker';
import type * as React from 'react';
import { View } from 'react-native';
import type { StartSessionLayout } from './start-session-types';

// Wide, it sits in the row after the Server; on phones it is a stacked row on the page's inset.
export function SessionProjectControl(
  layout: StartSessionLayout,
): React.JSX.Element {
  const control = <ProjectPicker {...layout} />;

  return layout.wide ? control : <View className="px-4">{control}</View>;
}

// A searchable picker drawn as a pill (ADR-0042): a popover with a search field on desktop, a page on phones.
function ProjectPicker({ props }: StartSessionLayout): React.JSX.Element {
  return (
    <FieldPicker
      trigger="pill"
      presentation="page"
      searchable
      title="Project"
      leading="folder"
      disabled={props.disabled}
      value={props.projectId}
      options={projectOptions(props.projects)}
      onValueChange={(id) => changeProject(id, props)}
    />
  );
}

function changeProject(id: string, props: StartSessionLayout['props']): void {
  if (id !== props.projectId) props.onProjectChange(id);
}

function projectOptions(projects: ProjectInfo[]): ProjectOption[] {
  return projects.map((project) => ({
    value: project.id,
    label: project.name,
    subtitle: project.path,
    icon: 'folder',
  }));
}

type ProjectOption = {
  value: string;
  label: string;
  subtitle: string;
  icon: 'folder';
};
