export type KitCallbackReturn<Schema, Returns> = Schema extends {
  readonly acknowledgement: true;
}
  ? void | Promise<void>
  : Returns;

