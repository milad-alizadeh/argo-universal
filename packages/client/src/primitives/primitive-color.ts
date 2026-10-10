import { useResolveClassNames } from 'uniwind';

export function usePrimitiveColor(className: string): string | undefined {
  const color = useResolveClassNames(className).color;
  return typeof color === 'string' ? color : undefined;
}
