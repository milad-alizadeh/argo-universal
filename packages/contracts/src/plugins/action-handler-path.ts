import { PluginInteraction, type WireJson } from './wire';

export function handlerPath(interaction: PluginInteraction): string[] {
  return interaction.event === 'onAction'
    ? interaction.payload.path
    : [interaction.event];
}

export function propAtPath(
  props: Record<string, WireJson>,
  path: string[],
): WireJson | undefined {
  return path.reduce<WireJson | undefined>(property, props);
}

function property(
  value: WireJson | undefined,
  step: string,
): WireJson | undefined {
  if (value === null || typeof value !== 'object') return undefined;

  return ownProperty(value, step);
}

function ownProperty(
  value: WireJson[] | Record<string, WireJson>,
  step: string,
): WireJson | undefined {
  if (!Object.hasOwn(value, step)) return undefined;

  return Array.isArray(value) ? value[Number(step)] : value[step];
}

export function actionInteraction(
  interaction: PluginInteraction,
): PluginInteraction {
  if (interaction.event !== 'onAction') return interaction;

  return PluginInteraction.parse({
    event: interaction.payload.path.at(-1),
    payload: interaction.payload.value,
  });
}
