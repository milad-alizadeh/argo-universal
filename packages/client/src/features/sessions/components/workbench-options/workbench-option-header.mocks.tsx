import { Icon } from '@repo/kit/primitives/content/icon';
import { Text } from '@repo/kit/primitives/content/text';
import { Chevron } from '@repo/kit/primitives/status/chevron';
import type { ReactElement, ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import type { OptionSection } from './workbench-options.mocks';

/*
 * The header lines the #1866 options compare. Every one keeps the title line one row tall (24) and toggles the card
 * from the title; they differ in what else sits on the line and when the reorder grip shows.
 */
export type HeaderOption =
  | 'always-grip'
  | 'hover-grip'
  | 'icon-lane'
  | 'sidebar';

export interface HeaderProps {
  section: OptionSection;
  header: HeaderOption;
  open: boolean;
  hovered: boolean;
  onToggle: () => void;
}

function Toggle(props: HeaderProps & { children: ReactNode }): ReactElement {
  return (
    <Pressable
      role="button"
      accessibilityLabel={`${props.open ? 'Collapse' : 'Expand'} ${props.section.title}`}
      onPress={props.onToggle}
      className="min-h-6 min-w-0 flex-1 flex-row items-center gap-1 rounded-md"
    >
      {props.children}
    </Pressable>
  );
}

const Title = ({ title }: { title: string }): ReactElement => (
  <Text role="heading" accessibilityRole="heading" aria-level={3}>
    {title}
  </Text>
);

// The reorder grip, in the 32 by 24 lane the built handle takes.
const Grip = ({ shown }: { shown: boolean }): ReactElement => (
  <View className="h-6 w-8 items-center justify-center">
    {shown ? <Icon name="reorder" tone="muted" /> : null}
  </View>
);

const Count = ({ text }: { text?: string }): ReactNode =>
  text ? (
    <Text role="secondary" tone="muted" numberOfLines={1}>
      {text}
    </Text>
  ) : null;

// A and B: title and chevron, with the grip always on (A) or only on the card under the pointer (B).
export function HandleHeader(props: HeaderProps): ReactElement {
  return (
    <View className="flex-row items-center gap-2">
      <Toggle {...props}>
        <Title title={props.section.title} />
        <Chevron direction="right" open={props.open} />
      </Toggle>
      <Grip shown={props.header === 'always-grip' || props.hovered} />
    </View>
  );
}

// C: the 2026-10 board's header: icon in a 28 lane, title, chevron, count trailing; the grip takes the count's place on hover.
export function IconLaneHeader(props: HeaderProps): ReactElement {
  return (
    <View className="flex-row items-center gap-1">
      <View className="h-6 w-7 justify-center">
        <Icon name={props.section.icon} tone="muted" />
      </View>
      <Toggle {...props}>
        <Title title={props.section.title} />
        <Chevron direction="right" open={props.open} />
      </Toggle>
      {props.hovered ? <Grip shown /> : <Count text={props.section.count} />}
    </View>
  );
}

// D: a sidebar section header: a quiet title with its count, the chevron only on hover; the whole line drags.
export function SidebarHeader(props: HeaderProps): ReactElement {
  return (
    <View className="flex-row items-center web:cursor-grab">
      <Toggle {...props}>
        <Text role="secondary" tone="muted">
          {props.section.title}
        </Text>
        <Count text={props.section.count} />
        <View className={props.hovered ? undefined : 'opacity-0'}>
          <Chevron direction="right" open={props.open} />
        </View>
      </Toggle>
    </View>
  );
}
