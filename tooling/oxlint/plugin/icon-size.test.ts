import { iconSize } from './icon-size.ts';
import { ruleTester } from './rule-tester.ts';

const rawSize = [{ messageId: 'iconSize' }];

ruleTester.run('icon-size', iconSize, {
  valid: [
    '<Icon as={ArrowUpIcon} size="md" />;',
    '<IconSpinner size="sm" className="text-muted" />;',
    '<Image size={16} />;',
    '<Icon as={ArrowUpIcon} className="max-size-4" />;',
  ],
  invalid: [
    { code: '<Icon as={ArrowUpIcon} size={16} />;', errors: rawSize },
    { code: '<IconSpinner className="size-4 text-muted" />;', errors: rawSize },
    {
      code: '<ComposerGlyph className={cn("size-5", tone)}>x</ComposerGlyph>;',
      errors: rawSize,
    },
  ],
});
