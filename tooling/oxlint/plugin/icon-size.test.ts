import { iconSize } from './icon-size.ts';
import { ruleTester } from './rule-tester.ts';

const pixelSize = [{ messageId: 'iconSize' }];

const nativeSymbol = [{ messageId: 'nativeSymbol' }];

ruleTester.run('icon-size', iconSize, {
  valid: [
    '<Icon name="add" size="sm" />;',
    '<IconSpinner iconSize="md" className="text-muted" />;',
    '<IconButton icon="add" size="md" />;',
    '<Icon name="add" size="sm" className="max-size-4" />;',
    'size(pixels, pixels);',
    "import { Host, Text } from '@expo/ui/swift-ui';",
    "import { Image } from 'expo-image';",
    '<NativeSymbol name="search" size="md" tone="muted" />;',
    'const icon = { assetName: image.name };',
  ],
  invalid: [
    { code: '<Icon name="add" size={16} />;', errors: pixelSize },
    {
      code: '<IconSpinner className="size-4 text-muted" />;',
      errors: pixelSize,
    },
    { code: '<IconSlot size="md" className="size-6" />;', errors: pixelSize },
    { code: '<Image systemName="chevron.right" />;', errors: nativeSymbol },
    { code: '<Label systemImage="folder" />;', errors: nativeSymbol },
    { code: 'const icon = { systemImage: image.name };', errors: nativeSymbol },
    { code: 'size(16, 16);', errors: nativeSymbol },
    {
      code: "import { Host, Image } from '@expo/ui/swift-ui';",
      errors: nativeSymbol,
    },
  ],
});
