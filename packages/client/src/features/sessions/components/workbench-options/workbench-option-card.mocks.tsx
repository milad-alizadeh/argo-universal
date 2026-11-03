import { Text } from '@repo/kit/primitives/content/text';
import { cn } from '@repo/kit/utils';
import { useState, type ReactElement, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { SessionWorkbenchColumn } from '../session-workbench';
import {
  HandleHeader,
  type HeaderOption,
  type HeaderProps,
  IconLaneHeader,
  SidebarHeader,
} from './workbench-option-header.mocks';
import { optionSections, type OptionSection } from './workbench-options.mocks';

/*
 * One Workbench card as an option draws it: today's compact padding and one card radius (2xl), a surface and a
 * header line to compare. A still image cannot hover, so `forceHover` draws the card as if the pointer were on it.
 */
export type SurfaceOption = 'glass' | 'hairline-glass' | 'tint';

const surfaces: Record<SurfaceOption, string> = {
  glass:
    'bg-glass shadow-glass web:backdrop-blur-glass web:backdrop-saturate-180',
  'hairline-glass':
    'bg-glass shadow-hairline web:backdrop-blur-glass web:backdrop-saturate-180',
  tint: 'bg-tint',
};

export interface OptionCardProps {
  section: OptionSection;
  header: HeaderOption;
  surface: SurfaceOption;
  forceHover: boolean;
}

// The card's surface, tracking whether the pointer is on it.
function CardFrame(props: {
  surface: SurfaceOption;
  children: (hover: boolean) => ReactNode;
}): ReactElement {
  const [hover, setHover] = useState(false);

  return (
    <Pressable
      onHoverIn={() => setHover(true)}
      onHoverOut={() => setHover(false)}
      className={cn('rounded-2xl px-3 py-2.5', surfaces[props.surface])}
    >
      {props.children(hover)}
    </Pressable>
  );
}

type ContentProps = OptionCardProps & { hovered: boolean };

function CardContent(props: ContentProps): ReactElement {
  const [open, setOpen] = useState(true);
  const toggle = (): void => setOpen(!open);

  return (
    <>
      <HeaderRow {...props} open={open} onToggle={toggle} />
      {open ? <OptionBody section={props.section} /> : null}
    </>
  );
}

export const OptionCard = (props: OptionCardProps): ReactElement => (
  <CardFrame surface={props.surface}>
    {(hover) => <CardContent {...props} hovered={hover || props.forceHover} />}
  </CardFrame>
);

function HeaderRow(
  props: HeaderProps & { header: HeaderOption },
): ReactElement {
  if (props.header === 'icon-lane') return <IconLaneHeader {...props} />;

  if (props.header === 'sidebar') return <SidebarHeader {...props} />;

  return <HandleHeader {...props} />;
}

function OptionBody({ section }: { section: OptionSection }): ReactElement {
  return (
    <View className="pt-1">
      <Edge section={section}>{section.summary}</Edge>
      {section.footer ? <Edge section={section}>{section.footer}</Edge> : null}
    </View>
  );
}

interface ColumnProps {
  label: string;
  header?: HeaderOption;
  surface?: SurfaceOption;
  // The section key of the card drawn as if the pointer were on it.
  hovered?: string;
}

// One option: its label over the Workbench's 312 column, the Issue's page drawn as plain rows.
export function OptionColumn(props: ColumnProps): ReactElement {
  return (
    <OptionBoard label={props.label}>
      {optionSections(true).map((section) => (
        <OptionCard
          key={section.key}
          section={section}
          header={props.header ?? 'hover-grip'}
          surface={props.surface ?? 'glass'}
          forceHover={props.hovered === section.key}
        />
      ))}
    </OptionBoard>
  );
}

// Today's column, drawn by the built Workbench, with the Issue's page as the Plugin draws it.
export const CurrentColumn = ({ label }: { label: string }): ReactElement => (
  <OptionBoard label={label}>
    <SessionWorkbenchColumn sections={optionSections(false)} />
  </OptionBoard>
);

const OptionBoard = (props: {
  label: string;
  children: ReactNode;
}): ReactElement => (
  <View className="m-4 w-frame-list gap-3">
    <Text role="secondary" tone="muted">
      {props.label}
    </Text>
    <View className="gap-2">{props.children}</View>
  </View>
);

// Rows carry 4 of their own beside their hover tile; the built card pulls them out the same way.
function Edge(props: {
  section: OptionSection;
  children: ReactNode;
}): ReactNode {
  if (props.section.noRows) return props.children;

  return <View className="-mx-1">{props.children}</View>;
}
