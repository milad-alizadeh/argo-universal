import { lexicalZone } from './lexical-zone.ts';
import { ruleTester } from './rule-tester.ts';

ruleTester.run('lexical-zone', lexicalZone, {
  valid: [
    "import { RichTextarea } from '#primitives/controls/rich-textarea';",
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
    {
      code: "import { x } from 'lexical/subpath';",
      errors: [{ messageId: 'lexicalZone' }],
    },
    {
      code: "import { createHeadlessEditor } from '@lexical/headless';",
      errors: [{ messageId: 'lexicalZone' }],
    },
    {
      code: "const lexical = await import('lexical');",
      errors: [{ messageId: 'lexicalZone' }],
    },
    {
      code: "const markdown = require('@lexical/markdown');",
      errors: [{ messageId: 'lexicalZone' }],
    },
  ],
});
