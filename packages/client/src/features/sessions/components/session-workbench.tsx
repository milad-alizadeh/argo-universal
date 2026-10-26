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
  footer: section.footer,
});

function SectionCard(props: SectionCardProps): ReactElement {
  return (
    <View testID={`workbench-${props.section.key}`}>
      <Card {...cardProps(props)}>
        <SectionBody {...props.section} />
      </Card>
    </View>
  );
}

function SectionBody(section: WorkbenchSection): ReactNode {
  if (!section.onOpen) return section.summary;

  return (
    <Pressable
      role="button"
      accessibilityLabel={`Open ${section.title} overview`}
      onPress={section.onOpen}
    >
      {section.summary}
    </Pressable>
  );
}
