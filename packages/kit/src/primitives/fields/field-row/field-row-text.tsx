import { Row } from '@expo/ui';
import type { ReactElement, ReactNode } from 'react';
import { useNativeTheme } from '#kit/native-theme';
import { NativeText } from '#primitives/content/native-text';
import { NativeIcon } from '../../../symbols/native-icon';
import type { FieldGroupKitProps } from '../../kit-props';

// What every row but a Button shares with Expo UI's universal ListItem: an icon before the title.
export type RowTextProps = Pick<
  FieldGroupKitProps<'FieldGroup.Value'>,
  'leading'
>;

// The gap between a leading icon and its title, as the Drawer's rows keep it.
const iconGap = 12;

/*
 * The web draws Expo UI's universal components, which have no place for a leading icon, so it sits beside the
 * title, centred on its line as Expo's ListItem lays them out. The title takes the kit's body role.
 */
export function RowTitle(
  props: RowTextProps & { title: string; numberOfLines?: number },
): ReactNode {
  const title = (
    <NativeText numberOfLines={props.numberOfLines}>{props.title}</NativeText>
  );

  if (!props.leading) return title;

  return (
    <Row alignment="center" spacing={iconGap}>
      <LeadingIcon leading={props.leading} />
      {title}
    </Row>
  );
}

function LeadingIcon(
  props: Pick<RowTextProps, 'leading'>,
): ReactElement | null {
  const color = useNativeTheme().colors.mutedForeground;

  if (!props.leading) return null;

  return <NativeIcon name={props.leading} size="md" color={color} />;
}
