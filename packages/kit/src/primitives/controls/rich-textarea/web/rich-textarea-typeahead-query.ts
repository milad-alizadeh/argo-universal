import type { TriggerFn } from '@lexical/react/LexicalTypeaheadMenuPlugin';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import type {
  TypeaheadAdapter,
  TypeaheadOption,
} from './rich-textarea-typeahead-option';

type Query = { adapter: number; text: string } | null;

type Match = { index: number; match: ReturnType<TriggerFn> };

export interface TypeaheadQuery {
  triggerFn: TriggerFn;
  onQueryChange: (text: string | null) => void;
  options: TypeaheadOption[];
}

function matchingAdapter(
  adapters: TypeaheadAdapter[],
  text: string,
  editor: Parameters<TriggerFn>[1],
): Match | undefined {
  return adapters
    .map((adapter, index) => ({ index, match: adapter.trigger(text, editor) }))
    .find((result) => hasOptions(adapters, result));
}

function canOffer(adapter: TypeaheadAdapter, query: string): boolean {
  return adapter.options(query).length > 0 || Boolean(adapter.pending?.(query));
}

function hasOptions(adapters: TypeaheadAdapter[], result: Match): boolean {
  const adapter = adapters[result.index];

  return result.match && adapter
    ? canOffer(adapter, result.match.matchingString)
    : false;
}

function sameQuery(
  previous: NonNullable<Query>,
  next: NonNullable<Query>,
): boolean {
  return previous.adapter === next.adapter && previous.text === next.text;
}

function nextQuery(previous: Query, next: Query): Query {
  if (!previous) return next;

  return retainQuery(previous, next);
}

function retainQuery(previous: NonNullable<Query>, next: Query): Query {
  if (!next) return null;

  return sameQuery(previous, next) ? previous : next;
}

function queryOptions(
  adapters: TypeaheadAdapter[],
  query: Query,
): TypeaheadOption[] {
  if (!query) return [];
  const adapter = adapters[query.adapter];

  return adapter ? adapter.options(query.text) : [];
}

function triggerFor(
  adapters: TypeaheadAdapter[],
  select: (index: number) => void,
): TriggerFn {
  return (text, editor) => {
    const result = matchingAdapter(adapters, text, editor);

    if (!result) return null;
    select(result.index);

    return result.match;
  };
}

function queryHandlers(
  adapters: TypeaheadAdapter[],
  receive: (query: Query) => void,
): Omit<TypeaheadQuery, 'options'> {
  let active = 0;

  return {
    triggerFn: triggerFor(adapters, (index) => {
      active = index;
    }),
    onQueryChange: (text) =>
      receive(text === null ? null : { adapter: active, text }),
  };
}

export function useTypeaheadQuery(
  adapters: TypeaheadAdapter[],
): TypeaheadQuery {
  const [query, setQuery] = useState<Query>(null);
  const receive = useQueryReceiver(setQuery);
  useLateAnswers(adapters, setQuery);

  return {
    ...useMemo(() => queryHandlers(adapters, receive), [adapters, receive]),
    options: useMemo(() => queryOptions(adapters, query), [adapters, query]),
  };
}

function useQueryReceiver(
  change: Dispatch<SetStateAction<Query>>,
): (next: Query) => void {
  return useCallback(
    (next: Query): void => change((previous) => nextQuery(previous, next)),
    [change],
  );
}

// The same query again, as a new object, so the options are read once more.
const asked = (query: Query): Query => query && { ...query };

// A late answer to the query being asked makes the options be read again.
function useLateAnswers(
  adapters: TypeaheadAdapter[],
  change: Dispatch<SetStateAction<Query>>,
): void {
  useEffect(() => {
    const refresh = (): void => change(asked);
    const stops = adapters.flatMap((adapter) =>
      adapter.subscribe ? [adapter.subscribe(refresh)] : [],
    );

    return () => {
      for (const stop of stops) stop();
    };
  }, [adapters, change]);
}
