// FieldGroup.Section hides its tile colours, so Android groups stock ListItems with public modifiers.
import { Column, Text } from '@expo/ui';
import * as Material from '@expo/ui/jetpack-compose/modifiers';
import type { ReactElement } from 'react';
import { useResolveClassNames } from 'uniwind';
import { useNativeTheme } from '#lib/generic/native-theme';
import { useSidebarList } from '#primitives/fields/field-layout';
import { useUniversalTextStyle } from '#primitives/native/native-typography';
import type { GroupedListSectionProps } from './grouped-list-section-props';

const fullWidth = [Material.fillMaxWidth()];

const sectionCorner = 20;

const groupedRows = [
  Material.fillMaxWidth(),
  Material.clip(Material.Shapes.RoundedCorner(sectionCorner)),
];

export function NativeSection(props: GroupedListSectionProps): ReactElement {
  return (
    <Column spacing={8} modifiers={fullWidth}>
      <Caption text={props.title} heading />
      <SectionRows {...props} />
      <SectionFooter {...props} />
    </Column>
  );
}

function SectionRows(props: GroupedListSectionProps): ReactElement {
  const bare = useSidebarList() || props.textFields;

  return (
    <Column
      spacing={useRowGap(props.textFields)}
      modifiers={bare ? fullWidth : groupedRows}
    >
      {props.children}
    </Column>
  );
}

function SectionFooter(props: GroupedListSectionProps): ReactElement {
  return (
    <Caption
      text={props.textFields ? undefined : props.footer}
      danger={props.tone === 'danger'}
    />
  );
}

function useRowGap(textFields: boolean | undefined): number {
  const sidebar = useSidebarList();
  const { gap } = useResolveClassNames('gap-4');

  if (textFields) return numericGap(gap);

  return sidebar ? 0 : 2;
}

function numericGap(
  value: ReturnType<typeof useResolveClassNames>['gap'],
): number {
  return typeof value === 'number' ? value : 0;
}

type CaptionProps = { text?: string; heading?: boolean; danger?: boolean };

function Caption(props: CaptionProps): ReactElement | null {
  const textStyle = useCaptionStyle(props);

  if (!props.text) return null;

  return (
    <Text
      textStyle={textStyle}
      style={{ paddingHorizontal: 16, paddingVertical: 4 }}
    >
      {props.text}
    </Text>
  );
}

function useCaptionStyle(
  props: CaptionProps,
): React.ComponentProps<typeof Text>['textStyle'] {
  const style = useUniversalTextStyle(props.heading ? 'heading' : 'secondary');
  const colors = useNativeTheme().colors;

  return {
    ...style,
    color: props.danger ? colors.danger : colors.mutedForeground,
  };
}
