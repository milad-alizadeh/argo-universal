import { Card, type CardProps } from '@repo/kit/primitives/layout/card';
import type { ReactElement, ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { WorkbenchColumn, type WorkbenchColumnCard } from './workbench-column';

// A Section's Workbench card: its summary, the footer under it, and what pressing its body opens.
export interface WorkbenchSection {
  key: string;
  title: string;
  summary: ReactNode;
  footer?: ReactNode;
  // Absent where the summary's own rows carry the presses.
  onOpen?: () => void;
  // A Plugin's own content, not rows: it has no row inset to give back.
  noRows?: boolean;
}

// What a Session gives its Workbench: the cards its Sections draw, in order, and the band's button that opens the Inspector.
export interface SessionWorkbench {
  sections: readonly WorkbenchSection[];
  onOpenInspector: () => void;
}

const sectionCard = (section: WorkbenchSection): WorkbenchColumnCard => ({
  id: section.key,
  label: section.title,
  render: (handle) => <SectionCard section={section} handle={handle} />,
});

export function SessionWorkbenchColumn({
  sections,
}: Pick<SessionWorkbench, 'sections'>): ReactElement {
  return <WorkbenchColumn cards={sections.map(sectionCard)} />;
}

interface SectionCardProps {
  section: WorkbenchSection;
  handle: ReactNode;
}

// Every Section's card collapses, and starts open.
const cardProps = ({ section, handle }: SectionCardProps): CardProps => ({
  kind: 'glass',
  density: 'compact',
  collapsible: true,
  defaultOpen: true,
  title: section.title,
  actions: handle,
  footer: section.footer && (
    <RowsEdge section={section}>{section.footer}</RowsEdge>
  ),
});

// Rows carry 4 of their own beside their hover tile; pulling them out puts their text on the title's edge.
function RowsEdge({
  section,
  children,
}: {
  section: WorkbenchSection;
  children: ReactNode;
}): ReactNode {
  if (section.noRows) return children;

  return <View className="-mx-1">{children}</View>;
}

function SectionCard(props: SectionCardProps): ReactElement {
  return (
    <View testID={`workbench-${props.section.key}`}>
      <Card {...cardProps(props)}>
        <SectionBody section={props.section} />
      </Card>
    </View>
  );
}

function SectionBody({
  section,
}: Pick<SectionCardProps, 'section'>): ReactNode {
  const summary = <RowsEdge section={section}>{section.summary}</RowsEdge>;

  if (!section.onOpen) return summary;

  return (
    <Pressable
      role="button"
      accessibilityLabel={`Open ${section.title} overview`}
      onPress={section.onOpen}
    >
      {summary}
    </Pressable>
  );
}
