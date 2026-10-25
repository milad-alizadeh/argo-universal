import { Row } from '@expo/ui';
import type { ReactElement, ReactNode } from 'react';
import { useNativeTheme } from '#kit/native-theme';
import { AgentLogo } from '#primitives/content/agent-logo';
import { IconSlot } from '#primitives/content/icon';
import { NativeText } from '#primitives/content/native-text';
import type { Tone } from '#primitives/content/text';
import type { IconSymbol } from '../../../symbols/icon-symbol';
import { NativeIcon } from '../../../symbols/native-icon';

// What every row but a Button shares with Expo UI's universal ListItem: an icon before the title.
export type RowTextProps = {
  // A stock icon of a row, or any icon of a picker option.
  leading?: IconSymbol;
  // A picker option's logo (SVG markup or an image URI), drawn where the platform can hold an image in the row.
  logo?: string;
  // `danger` draws the title in the destructive tone.
  tone?: Tone;
};

// The gap between a leading icon and its title, as the Drawer's rows keep it.
const iconGap = 12;

/*
 * The web draws Expo UI's universal components, which have no place for a leading icon, so it sits beside the
 * title, centred on its line as Expo's ListItem lays them out. The title takes the kit's body role.
 */
export function RowTitle(
  props: RowTextProps & { title: string; numberOfLines?: number },
): ReactNode {
  const title = <Title {...props} />;

  if (!props.leading && !props.logo) return title;

  return (
    <Row alignment="center" spacing={iconGap}>
      <Mark {...props} />
      {title}
    </Row>
  );
}

function Title(
  props: RowTextProps & { title: string; numberOfLines?: number },
): ReactElement {
  return (
    <NativeText numberOfLines={props.numberOfLines} tone={props.tone}>
      {props.title}
    </NativeText>
  );
}

// The option's logo where it has one, its icon otherwise.
function Mark(props: RowTextProps & { title: string }): ReactElement {
  return props.logo ? (
    <LogoMark logo={props.logo} title={props.title} />
  ) : (
    <LeadingIcon leading={props.leading} />
  );
}

function LogoMark(props: { logo: string; title: string }): ReactElement {
  return (
    <IconSlot size="md">
      <AgentLogo logo={props.logo} label={props.title} size="md" />
    </IconSlot>
  );
}

function LeadingIcon(
  props: Pick<RowTextProps, 'leading'>,
): ReactElement | null {
  const color = useNativeTheme().colors.mutedForeground;

  if (!props.leading) return null;

  return <NativeIcon name={props.leading} size="md" color={color} />;
}
