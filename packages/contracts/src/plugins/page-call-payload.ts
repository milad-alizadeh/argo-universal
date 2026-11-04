import { z } from 'zod';
import { PageState } from './page-address';
import { PluginOperationParams } from './plugin-operations';
import {
  PageValue,
  PayloadValue,
  type LoadMore,
  type OperationCall,
  type PageBind,
  type PageCall,
} from './wire-action';
import type { WireJson } from './wire-json';

// A Page state change as the App makes it, once the event's payload has filled it in.
export type MadeStateChange = { pageState: PageState };

const OptimisticProps = z.record(z.string(), PageValue);

// An Operation call as the App runs it, once the event's payload has filled it in.
export type MadeOperationCall = {
  operation: OperationCall['operation'];
  args: PluginOperationParams;
  optimistic?: { key: string; props: z.infer<typeof OptimisticProps> }[];
};

export type MadePageCall =
  | MadeStateChange
  | MadeOperationCall
  | LoadMore
  | PageBind;

type Given = Record<string, WireJson>;

const isRecord = (
  value: WireJson | undefined,
): value is Record<string, WireJson> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

// What a value stands for in this payload: itself, or the payload's value it names; a field the payload lacks is undefined.
function valueOf(
  value: WireJson,
  payload: WireJson | undefined,
): WireJson | undefined {
  const named = PayloadValue.safeParse(value).data;

  if (!named) return value;

  return named.$payload === true ? payload : fieldOf(payload, named.$payload);
}

const fieldOf = (
  payload: WireJson | undefined,
  field: string,
): WireJson | undefined => (isRecord(payload) ? payload[field] : undefined);

// Each payload value replaced by what the payload gives; a key it gives nothing for is left out.
const filled = (given: Given, payload: WireJson | undefined): Given =>
  Object.fromEntries(
    Object.entries(given).flatMap(([key, value]) => {
      const made = valueOf(value, payload);

      return made === undefined ? [] : [[key, made]];
    }),
  );

function fit<Schema extends z.ZodType>(
  schema: Schema,
  values: Given,
  what: string,
): z.infer<Schema> {
  const parsed = schema.safeParse(values);

  if (!parsed.success)
    throw new Error(`The event's payload does not fit ${what}`);

  return parsed.data;
}

function madeRun(
  { operation, args, optimistic }: OperationCall,
  payload: WireJson | undefined,
): MadeOperationCall {
  return {
    operation,
    args: fit(
      PluginOperationParams,
      filled(args, payload),
      `the arguments of ${operation}`,
    ),
    ...(optimistic && { optimistic: madeOptimistic(optimistic, payload) }),
  };
}

const madeOptimistic = (
  optimistic: NonNullable<OperationCall['optimistic']>,
  payload: WireJson | undefined,
): NonNullable<MadeOperationCall['optimistic']> =>
  optimistic.map(({ key, props }) => ({
    key,
    props: fit(OptimisticProps, filled(props, payload), 'optimistic props'),
  }));

/*
 * The call a Component event makes, with each payload value in it replaced by what the event's payload gives
 * (ADR-0050). A value that does not fit where it lands, as an object into Page state or an argument, throws; the
 * Server still checks an Operation's arguments against the params its manifest declares. A bound value keeps the
 * payload apart, since it lands only once the edits pause.
 */
export function madePageCall(
  call: PageCall,
  payload: WireJson | undefined,
): MadePageCall {
  if ('operation' in call) return madeRun(call, payload);

  if ('pageState' in call)
    return {
      pageState: fit(PageState, filled(call.pageState, payload), 'Page state'),
    };

  return call;
}
