import type { z } from 'zod';
import { iconSymbols } from '../kit-symbols';
import { type labelProps, labelV1 } from './status-kit-props';

const namedIcons = new Map(Object.entries(iconSymbols));

const unavailableIcon = {
  sf: 'questionmark.circle',
  material: 'help',
} as const;

function oldIcon(
  icon: z.output<typeof labelProps>['icon'],
): z.input<typeof labelV1>['icon'] {
  const symbol = typeof icon === 'string' ? namedIcons.get(icon) : icon;
  const parsed = labelV1.shape.icon.safeParse(symbol);

  return parsed.success ? parsed.data : unavailableIcon;
}

export function legacyLabelProps(
  props: z.output<typeof labelProps>,
): z.input<typeof labelV1> {
  return { ...props, icon: oldIcon(props.icon) };
}
