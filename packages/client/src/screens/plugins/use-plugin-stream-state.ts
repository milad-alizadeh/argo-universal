import { useState } from 'react';
import type { useTRPC } from '#features/connection';

interface Source {
  trpc: ReturnType<typeof useTRPC>;
  key: string;
}

interface Stream<Value, Message> {
  value: Value;
  receive: (message: Message) => void;
}

export function usePluginStreamState<Value, Message>(
  source: Source,
  initial: Value,
  reduce: (value: Value, message: Message) => Value,
): Stream<Value, Message> {
  const [stored, receive] = useState({ source, value: initial });

  const receiveMessage = (message: Message): void =>
    receive((previous) => ({
      source,
      value: reduce(current(previous, source, initial), message),
    }));

  return { value: current(stored, source, initial), receive: receiveMessage };
}

function current<Value>(
  stored: { source: Source; value: Value },
  source: Source,
  initial: Value,
): Value {
  return stored.source.trpc === source.trpc && stored.source.key === source.key
    ? stored.value
    : initial;
}
