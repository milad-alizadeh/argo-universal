import type { ProjectInfo } from '@repo/contracts';
import type * as React from 'react';
import { useState, type JSX } from 'react';
import { Platform, View } from 'react-native';
import { ScrollFadeList } from '#lib/product/scroll-fade/scroll-fade-list';
import { SelectedCheck } from '#primitives/display/selected-check';
import { FieldGroup } from '#primitives/fields/field-group/field-group';
import { FieldSection } from '#primitives/fields/field-section/field-section';
import { ComboboxSearch } from '#primitives/inputs/combobox-search/combobox-search';
import { ListItem } from '#primitives/lists/list-item/list-item';
import { FieldRowEnd } from '../../../../lib/generic/primitives/fields/field-layout';

interface ProjectPickerProps {
  projects: ProjectInfo[];
  projectId: string;
  onSelect: (projectId: string) => void;
}
const listMaximumHeight = 320;
const rowEstimate = 60;

export function ProjectPicker(props: ProjectPickerProps): JSX.Element {
  const [query, setQuery] = useState('');
  const found = props.projects.filter((project) => matches(project, query));
  return (
    <View className="native:flex-1 px-4 pt-4 wide:p-3 bg-sidebar">
      <ProjectSearch query={query} onChange={setQuery} />
      <ProjectResults {...props} projects={found} />
    </View>
  );
}

function matches(project: ProjectInfo, query: string): boolean {
  const search = query.trim().toLowerCase();
  return (
    project.name.toLowerCase().includes(search) ||
    project.path.toLowerCase().includes(search)
  );
}

function ProjectResults(props: ProjectPickerProps): JSX.Element {
  if (Platform.OS === 'web')
    return (
      <FieldSection>
        <WebProjects {...props} />
      </FieldSection>
    );
  return (
    <FieldGroup fit>
      <FieldSection>
        <PhoneProjects {...props} />
      </FieldSection>
    </FieldGroup>
  );
}

function WebProjects(props: ProjectPickerProps): JSX.Element {
  return <ScrollFadeList {...projectListProps(props)} />;
}
type ProjectListProps = React.ComponentProps<
  typeof ScrollFadeList<ProjectInfo>
>;
function projectListProps(props: ProjectPickerProps): ProjectListProps {
  return {
    ...projectListAppearance,
    data: props.projects,
    keyExtractor: (project) => project.id,
    extraData: props.projectId,
    ListEmptyComponent: <ListItem title="No Project matches." tone="muted" />,
    renderItem: ({ item, index }) => (
      <FieldRowEnd value={index === props.projects.length - 1}>
        <ProjectChoice {...props} project={item} />
      </FieldRowEnd>
    ),
  };
}
type ProjectChoiceProps = ProjectPickerProps & { project: ProjectInfo };
function ProjectChoice(props: ProjectChoiceProps): JSX.Element {
  return <ListItem {...projectChoiceProps(props)} />;
}
function projectChoiceProps(
  props: ProjectChoiceProps,
): React.ComponentProps<typeof ListItem> {
  const { project, projectId, onSelect } = props;
  const selected = project.id === projectId;
  return {
    title: project.name,
    accessibilityLabel: project.name,
    subtitle: { text: project.path, code: true },
    ...projectChoiceAppearance,
    selected,
    onPress: () => onSelect(project.id),
    accessory: selected ? <SelectedCheck /> : undefined,
  };
}
function PhoneProjects(props: ProjectPickerProps): JSX.Element {
  return (
    <>
      {props.projects.map((project) => (
        <ProjectChoice key={project.id} {...props} project={project} />
      ))}
      {props.projects.length === 0 && (
        <ListItem title="No Project matches." tone="muted" />
      )}
    </>
  );
}
interface ProjectSearchProps {
  query: string;
  onChange: (query: string) => void;
}
function ProjectSearch({ query, onChange }: ProjectSearchProps): JSX.Element {
  return (
    <View className="py-1">
      <ComboboxSearch
        label="Find a Project"
        placeholder="Find a Project…"
        value={query}
        onChangeText={onChange}
        className="native:mx-1.5"
      />
    </View>
  );
}

const projectListAppearance = {
  surfaceClassName: 'bg-sidebar',
  maxHeight: listMaximumHeight,
  contentContainerStyle: {},
  estimatedItemSize: rowEstimate,
};
const projectChoiceAppearance = {
  icon: 'folder',
  role: 'button',
  disclosure: false,
} as const;
