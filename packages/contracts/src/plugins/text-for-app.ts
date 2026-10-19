import { z } from 'zod';
import { textProps, textV2 } from './kit-props';

function currentTextProps({
  label,
  variant,
  ...props
}: z.output<typeof textV2>): z.input<typeof textProps> {
  const current: z.input<typeof textProps> = { ...props, children: label };

  if (variant !== undefined) current.role = variant;

  return current;
}

// Older Servers send their latest known wire version even when an App reports v3.
export const textForApp = z.union([
  textV2.transform(currentTextProps).pipe(textProps),
  textProps,
]);
