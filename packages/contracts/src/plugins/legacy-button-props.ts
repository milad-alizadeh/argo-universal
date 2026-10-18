import type { z } from 'zod';
import type { buttonProps, buttonV1 } from './kit-props';

export function legacyButtonProps(
  props: z.output<typeof buttonProps>,
): z.input<typeof buttonV1> {
  const legacy = { ...props };

  if (props.loading) legacy.disabled = true;

  return legacy;
}
