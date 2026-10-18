export interface PartBinding {
  prop: string;
  event: string;
  throttleMs?: number;
  protectFocus?: boolean;
  pending?: boolean;
}

export interface PartUi {
  bindings?: readonly PartBinding[];
  pending?: Readonly<Record<string, 'loading' | 'disabled'>>;
  flush?: readonly string[];
}

export const valueUi = {
  bindings: [{ prop: 'value', event: 'onValueChange', pending: true }],
} as const satisfies PartUi;

export const textUi = {
  bindings: [
    {
      prop: 'value',
      event: 'onChangeText',
      throttleMs: 150,
      protectFocus: true,
    },
  ],
  pending: { onSubmit: 'disabled' },
  flush: ['onSubmit'],
} as const satisfies PartUi;

export const pressUi = {
  pending: { onPress: 'loading', onAction: 'loading' },
} as const satisfies PartUi;
