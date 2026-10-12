import { lexicalZone } from './lexical-zone.ts';
import { ruleTester } from './rule-tester.ts';

ruleTester.run('lexical-zone', lexicalZone, {
  valid: [
    "import { RichTextarea } from '#primitives/inputs/rich-textarea/rich-textarea';",
    "import { lexicalish } from 'lexicalish';",
    "import { x } from '@lexicalfork/react';",
  ],
  invalid: [
    {
      code: "import { $getRoot } from 'lexical';",
      errors: [{ messageId: 'lexicalZone' }],
    },
    {
      code: "import { LexicalComposer } from '@lexical/react/LexicalComposer';",
      errors: [{ messageId: 'lexicalZone' }],
    },
    {
      code: "export { TRANSFORMERS } from '@lexical/markdown';",
      errors: [{ messageId: 'lexicalZone' }],
    },
  ],
});
