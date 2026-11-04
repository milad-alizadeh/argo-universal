import { noNestedConditionalType } from './no-nested-conditional-type.ts';
import { ruleTester } from './rule-tester.ts';

ruleTester.run('no-nested-conditional-type', noNestedConditionalType, {
  valid: [
    'type Name<T> = T extends string ? "text" : "other";',
    'type Inner<T> = T extends number ? 1 : 2;\ntype Outer<T> = T extends string ? "text" : Inner<T>;',
    'type Checked<T> = (T extends string ? 1 : 2) extends 1 ? "text" : "other";',
  ],
  invalid: [
    {
      code: 'type Name<T> = T extends string ? "text" : T extends number ? "number" : "other";',
      errors: [{ messageId: 'noNestedConditionalType' }],
    },
    {
      code: 'type Name<T> = T extends string ? (T extends "" ? "empty" : "text") : "other";',
      errors: [{ messageId: 'noNestedConditionalType' }],
    },
  ],
});
