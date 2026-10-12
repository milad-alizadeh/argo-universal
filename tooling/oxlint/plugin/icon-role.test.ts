import { iconRole } from './icon-role.ts';
import { ruleTester } from './rule-tester.ts';

const pixelSize = [{ messageId: 'iconRole' }];
const nativeSymbol = [{ messageId: 'nativeSymbol' }];

ruleTester.run('icon-role', iconRole, {
  valid: [
    '<Icon name="add" role="control" />;',
    '<IconSpinner iconRole="row" className="text-muted" />;',
    '<IconButton icon="add" size="md" iconRole="action" />;',
    '<Icon name="add" role="body" className="max-size-4" />;',
    'size(pixels, pixels);',
    "import { Host, Text } from '@expo/ui/swift-ui';",
    "import { Image } from 'expo-image';",
    '<NativeSymbol name="search" role="action" muted />;',
  ],
  invalid: [
    { code: '<Icon name="add" size={16} />;', errors: pixelSize },
    { code: '<Icon name="add" size="md" />;', errors: pixelSize },
    {
      code: '<IconSpinner className="size-4 text-muted" />;',
      errors: pixelSize,
    },
    { code: '<IconSlot role="row" className="size-6" />;', errors: pixelSize },
    { code: '<Image systemName="chevron.right" />;', errors: nativeSymbol },
    { code: 'size(16, 16);', errors: nativeSymbol },
    {
      code: "import { Host, Image } from '@expo/ui/swift-ui';",
      errors: nativeSymbol,
    },
  ],
});
