import type * as React from 'react';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { InspectorPane } from '#primitives/scaffolds/inspector';
import { ListTitle } from '../../../lib/product/list-title';
import {
  type Section,
  coreNavigationSections,
  isCoreSection,
  sections,
} from '../../../lib/product/navigation/sections';
import { FrameRail } from '../components/frame-rail/frame-rail';
import { Scaffold, type ScaffoldProps } from './scaffold';
import { MockPage, MockText } from './scaffold-page.mocks';

type ScaffoldState = Pick<
  ScaffoldProps,
  | 'sizeClass'
  | 'sidebarShown'
  | 'onSidebarShownChange'
  | 'inspectorState'
  | 'onInspectorStateChange'
>;

export type ScaffoldMockProps = Partial<ScaffoldState> & {
  selectedSection?: Section;
  attentionCount?: number;
  onSectionChange?: (section: Section) => void;
  // The Inspector's content, under its header.
  inspector?: ReactNode;
  // The page; a stand-in page names the section when there is none.
  children?: ReactNode;
};

const ignore = (): void => {};

type SidebarState = Pick<
  ScaffoldState,
  'sidebarShown' | 'onSidebarShownChange'
>;

const mockSidebar = ({
  sidebarShown = true,
  onSidebarShownChange = ignore,
}: ScaffoldMockProps): SidebarState => ({ sidebarShown, onSidebarShownChange });

type InspectorStateProps = Pick<
  ScaffoldState,
  'inspectorState' | 'onInspectorStateChange'
>;

const mockInspectorState = ({
  inspectorState = 'closed',
  onInspectorStateChange = ignore,
}: ScaffoldMockProps): InspectorStateProps => ({
  inspectorState,
  onInspectorStateChange,
});

const mockState = (props: ScaffoldMockProps): ScaffoldState => ({
  sizeClass: props.sizeClass ?? 'wide',
  ...mockSidebar(props),
  ...mockInspectorState(props),
});

function MockRail(
  props: ScaffoldMockProps & ScaffoldState & { section: Section },
): React.JSX.Element {
  return (
    <FrameRail
      items={coreNavigationSections}
      hasSidebar
      selectedSection={props.section}
      attentionCount={props.attentionCount ?? 1}
      sidebarShown={props.sidebarShown}
      onSectionChange={props.onSectionChange ?? ignore}
      onSidebarShownChange={props.onSidebarShownChange}
    />
  );
}

type MockInspectorProps = Pick<ScaffoldMockProps, 'inspector'> &
  Pick<ScaffoldState, 'onInspectorStateChange'> & {
    title: string;
    expanded: boolean;
  };

const inspectorContent = (props: MockInspectorProps): ReactNode =>
  props.inspector ?? (
    <MockText testID="inspector-content" text={`${props.title} Inspector`} />
  );

function MockInspector(props: MockInspectorProps): React.JSX.Element {
  return (
    <InspectorPane
      title="Inspector"
      open
      onOpenChange={() => props.onInspectorStateChange('closed')}
      expanded={props.expanded}
      onExpandedChange={(expanded) =>
        props.onInspectorStateChange(expanded ? 'expanded' : 'open')
      }
    >
      {inspectorContent(props)}
    </InspectorPane>
  );
}

type MockPanes = Pick<
  ScaffoldProps,
  'sidebar' | 'listHeader' | 'list' | 'page' | 'inspector'
>;

// A stand-in rail, list, page and Inspector for the open section.
function mockPanes(props: ScaffoldMockProps, state: ScaffoldState): MockPanes {
  const section = props.selectedSection ?? 'sessions';
  const { title } = sections[mockSection(section)];

  return {
    sidebar: <MockRail {...props} {...state} section={section} />,
    listHeader: <ListTitle>{title}</ListTitle>,
    list: <MockText testID="list-content" text={`${title} list`} />,
    page: props.children ?? <MockPage title={title} />,
    inspector: (expanded) => (
      <MockInspector {...props} {...state} {...{ title, expanded }} />
    ),
  };
}

// The Scaffold with the Frame's rail, a stand-in list, page and Inspector for the open section.
export function ScaffoldMock(props: ScaffoldMockProps): React.JSX.Element {
  const state = mockState(props);

  return (
    <View className="flex-1">
      <Scaffold {...state} {...mockPanes(props, state)} />
    </View>
  );
}

const mockSection = (section: Section): 'sessions' | 'settings' =>
  isCoreSection(section) ? section : 'sessions';
