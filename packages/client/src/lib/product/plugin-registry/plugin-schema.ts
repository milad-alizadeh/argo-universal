import { wirePart, type WirePartDefinition } from '@repo/contracts/plugins/kit';

export function renderSchema(type: string): WirePartDefinition | undefined {
  const part = wirePart(type);
  if (!part) return undefined;

  return { ...part, props: part.appProps ?? part.props };
}
