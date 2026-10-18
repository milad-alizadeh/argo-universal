import type { z } from 'zod';
import type { textProps, textV2 } from './kit-props';

export function legacyTextProps(
  props: z.output<typeof textProps>,
): z.input<typeof textV2> {
  const { children, role, ...rest } = props;

  const legacy: z.input<typeof textV2> = {
    ...rest,
    label: [children].flat().join(''),
  };

  if (role !== undefined)
    legacy.variant = typeof role === 'object' ? role.compact : role;

  return legacy;
}
