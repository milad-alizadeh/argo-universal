// A command once its first argument, the deps it runs with, is given.
export type Bound<Command> = Command extends (
  deps: never,
  ...args: infer Args
) => infer Result
  ? (...args: Args) => Result
  : never;
