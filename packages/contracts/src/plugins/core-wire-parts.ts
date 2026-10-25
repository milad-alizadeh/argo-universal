import { z } from 'zod';
import { buttonProps, stackProps, textProps, svgProps } from './kit-props';
import { part } from './plugin-part-schema-utils';
import { avatarProps, iconProps } from './presentation-kit-props';
import { wirePartReferences } from './wire-part-reference';

// The parts whose props live in the kit-wide props files.
export const coreWireParts = {
  Avatar: part(
    'An image, initials or person symbol with optional status.',
    avatarProps,
    { group: 'content' },
  ),
  Icon: part('A native symbol with semantic size and tone.', iconProps, {
    group: 'content',
  }),
  Text: {
    props: textProps,
    container: false,
    children: false,
    slots: { children: [] },
    events: {},
    group: 'content',
    wire: true,
    reference: wirePartReferences.Text,
  },
  Button: {
    props: buttonProps,
    container: false,
    children: false,
    slots: {},
    // A press sends pending edits first, so a confirming Button acts on what the user typed.
    events: { onPress: z.undefined().meta({ flush: true }) },
    group: 'actions',
    wire: true,
    reference: wirePartReferences.Button,
  },
  Stack: {
    props: stackProps,
    container: true,
    children: true,
    slots: {},
    events: {},
    group: 'layout',
    wire: true,
    reference: wirePartReferences.Stack,
  },
  Svg: {
    props: svgProps,
    container: false,
    children: false,
    slots: {},
    events: { onPress: z.undefined() },
    group: 'visual',
    wire: true,
    reference: wirePartReferences.Svg,
  },
} as const;
