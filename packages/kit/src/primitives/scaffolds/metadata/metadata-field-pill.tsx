import type { ReactElement } from 'react';
import { View } from 'react-native';
import { Tooltip } from '#primitives/overlays/tooltip';
import { Pill, type PillProps } from '#primitives/status/pill';
import type { FieldProps } from './metadata-field-props';
import { groupProps } from './metadata-group';

/*
 * Under the title a field is one control Pill: its glyph and its value, as the approved Pill master draws a control.
 * A field with no glyph names itself, so a bare number such as a blocker's reads as what it is.
 */
export function PillField(props: FieldProps): ReactElement {
  if (props.face.pills) return <LabelPills {...props} />;

  return <Pill {...fieldPill(props)} />;
}

/*
 * Below medium a field with a glyph shows the glyph alone and says its value on hover or a long press; a status, and
 * a field with no glyph, keep their words, as nothing else would say them.
 */
export function IconField(props: FieldProps): ReactElement {
  const { glyph, keepsText, pills } = props.face;

  if (!glyph || keepsText) return <PillField {...props} />;

  return (
    <Tooltip label={`${props.title}: ${props.valueLabel}`}>
      <Pill {...fieldPill(props)} {...iconOnly(pills)} />
    </Tooltip>
  );
}

// A Pills field shown by its glyph alone counts its Pills instead.
const iconOnly = (pills: PillProps[] | undefined): Partial<PillProps> =>
  pills ? { text: String(pills.length) } : { iconOnly: true };

function fieldPill(props: FieldProps): PillProps {
  const { glyph, onPress } = props.face;

  return {
    variant: 'control',
    leading: glyph,
    text: glyph ? props.valueLabel : props.title,
    detail: glyph ? undefined : props.valueLabel,
    onPress,
    accessibilityLabel: props.label,
  };
}

// Labels keep their own Pills, wrapped under the title with the rest; a long list wraps inside the row, never past it.
function LabelPills(props: FieldProps): ReactElement {
  return (
    <View
      {...groupProps(props)}
      className="max-w-full min-w-0 shrink flex-row flex-wrap items-center gap-1"
    >
      {props.children}
    </View>
  );
}
