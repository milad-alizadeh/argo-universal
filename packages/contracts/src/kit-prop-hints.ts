type RequiredProps<Props> = {
  [Prop in keyof Props]-?: Record<never, never> extends Pick<Props, Prop>
    ? never
    : Prop;
}[keyof Props];

type HintValues<Props, Hints> = {
  [Prop in keyof Hints]: Prop extends keyof Props ? Props[Prop] : never;
};

type DescribedProps<Props, Hints> = Required<
  Pick<HintValues<Props, Hints>, Extract<RequiredProps<Props>, keyof Hints>>
> &
  Partial<
    Pick<
      HintValues<Props, Hints>,
      Exclude<Extract<keyof Props, keyof Hints>, RequiredProps<Props>>
    >
  > &
  Omit<Props, keyof Hints>;

// Generated comments supply hints; the schema owns keys, values and optionality.
export type WithPropHints<Props, Hints> = Props extends object
  ? DescribedProps<Props, Hints>
  : Props;
