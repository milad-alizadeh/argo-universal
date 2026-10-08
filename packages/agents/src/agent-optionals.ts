export type PresentOptional<Value> = {
  [Key in keyof Value]: Exclude<Value[Key], undefined>;
};
