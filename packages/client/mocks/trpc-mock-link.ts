import type { AppRouter } from '@repo/api';
import { TRPCClientError, type TRPCLink } from '@trpc/client';
import type {
  AnyTRPCProcedure,
  inferProcedureInput,
  inferProcedureOutput,
  TRPCRouterRecord,
} from '@trpc/server';
import { observable } from '@trpc/server/observable';

export type FixtureTick<Path extends keyof Fixtures> =
  FixtureOutput<Path> extends AsyncIterable<infer Value> ? Value : never;
export type FixtureArguments<Path extends keyof Fixtures> = Parameters<
  NonNullable<Fixtures[Path]>
>;
export type FixtureOutput<Path extends keyof Fixtures> = Awaited<
  ReturnType<NonNullable<Fixtures[Path]>>
>;

type RouterRecord = AppRouter['_def']['record'];

type ProcedurePath<TRecord, TPrefix extends string = ''> = {
  [Key in keyof TRecord & string]: TRecord[Key] extends AnyTRPCProcedure
    ? `${TPrefix}${Key}`
    : TRecord[Key] extends TRPCRouterRecord
      ? ProcedurePath<TRecord[Key], `${TPrefix}${Key}.`>
      : never;
}[keyof TRecord & string];

type ProcedureAt<
  TRecord,
  TPath extends string,
> = TPath extends `${infer Head}.${infer Tail}`
  ? Head extends keyof TRecord
    ? ProcedureAt<TRecord[Head], Tail>
    : never
  : TPath extends keyof TRecord
    ? TRecord[TPath]
    : never;

// A subscription's output is AsyncIterable<Tick>, so an async generator is its fixture.
type Fixture<TProcedure extends AnyTRPCProcedure> = (
  input: inferProcedureInput<TProcedure>,
  signal: AbortSignal,
) => TProcedure['_def']['type'] extends 'subscription'
  ? inferProcedureOutput<TProcedure>
  :
      | inferProcedureOutput<TProcedure>
      | Promise<inferProcedureOutput<TProcedure>>;

export type Fixtures = {
  [Path in ProcedurePath<RouterRecord>]?: Fixture<
    ProcedureAt<RouterRecord, Path>
  >;
};

const isAsyncIterable = (value: unknown): value is AsyncIterable<unknown> =>
  value !== null &&
  typeof value === 'object' &&
  typeof Reflect.get(value, Symbol.asyncIterator) === 'function';

// A terminating link that serves fixtures by procedure path (ADR 0010).
export function trpcMockLink(fixtures: Fixtures): TRPCLink<AppRouter> {
  return () =>
    ({ op }) =>
      observable((observer) => {
        const fixture: unknown = Reflect.get(fixtures, op.path);
        const controller = new AbortController();
        (async (): Promise<void> => {
          if (typeof fixture !== 'function')
            throw new Error(`No story mock for ${op.path}`);
          if (op.type === 'subscription') {
            observer.next({ result: { type: 'started' } });
            const ticks: unknown = Reflect.apply(fixture, undefined, [
              op.input,
              controller.signal,
            ]);
            if (!isAsyncIterable(ticks))
              throw new Error(
                `Story mock for ${op.path} is not a subscription`,
              );
            for await (const data of ticks) {
              if (controller.signal.aborted) return;
              observer.next({ result: { type: 'data', data } });
            }
            observer.next({ result: { type: 'stopped' } });
            observer.complete();
            return;
          }
          const data = await Reflect.apply(fixture, undefined, [
            op.input,
            controller.signal,
          ]);
          observer.next({ result: { type: 'data', data } });
          observer.complete();
        })().catch((cause: unknown) => {
          if (controller.signal.aborted) return;
          const error =
            cause instanceof Error ? cause : new Error(String(cause));
          observer.error(TRPCClientError.from(error));
        });
        return () => controller.abort();
      });
}

const forever = new Promise<never>(() => {});

// A fixture that never answers: a query stays loading, a subscription never sends.
export function pending(): () => Promise<never> & AsyncIterable<never> {
  const value = Object.assign(forever, {
    [Symbol.asyncIterator]: (): AsyncIterator<never> => ({
      next: () => forever,
    }),
  });
  return () => value;
}

// A fixture that always errors with this message.
export function fails(message: string): () => never {
  return () => {
    throw new Error(message);
  };
}
