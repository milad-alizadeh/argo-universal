import { cn } from '#lib/generic/utils';

// Paper's iOS sheet pads composed content 16 on every side; Android's drag handle zone already sets the top.
export function sheetInsetClass(inset: boolean | undefined): string {
  return cn(inset && 'px-4 ios:py-4');
}
