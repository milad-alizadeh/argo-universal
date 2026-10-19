import { PluginInteraction, WireJson } from '@repo/contracts/plugins/wire';
import { z } from 'zod';

export type PluginOnEvent = (
  key: string,
  interaction: PluginInteraction,
) => void | Promise<void>;

export type PluginEvent = {
  event: string;
  payload?: WireJson;
  path?: string[];
  schema: z.ZodType;
};

export function checkedEvent({
  event,
  payload,
  path,
  schema,
}: PluginEvent): PluginInteraction {
  const value = schema
    .pipe(WireJson.optional())
    .parse(schema instanceof z.ZodUndefined ? undefined : payload);

  if (path) return { event: 'onAction', payload: { path, value } };

  return PluginInteraction.parse({ event, payload: value });
}
