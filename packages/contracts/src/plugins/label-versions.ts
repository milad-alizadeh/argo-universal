import type { z } from 'zod';
import { iconSymbols } from '../kit-symbols';
import { labelProps, labelV1, labelV2 } from './status-kit-props';

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

function labelV1Props(
  props: z.output<typeof labelProps>,
): z.input<typeof labelV1> {
  return { ...props, icon: oldIcon(props.icon) };
}

// Apps before Label v3 need an icon, so a text-only Label gets the fallback symbol.
function labelV2Props(
  props: z.output<typeof labelProps>,
): z.input<typeof labelV2> {
  return { ...props, icon: props.icon ?? unavailableIcon };
}

export const labelVersions = [
  labelProps.transform(labelV1Props).pipe(labelV1),
  labelProps.transform(labelV2Props).pipe(labelV2),
  labelProps,
] as const;
