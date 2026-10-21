import { kitStyling } from './kit-styling.ts';
import { ruleTester } from './rule-tester.ts';

const kitStyled = [{ messageId: 'kitStyling' }];

const button = "import { Button } from '@repo/kit/primitives/actions/button';";

ruleTester.run('kit-styling', kitStyling, {
  valid: [
    `${button} <Button label="Save" variant="primary" />;`,
    'import { View } from \'react-native\'; <View className="flex-1" />;',
    "import { Thing } from './thing'; <Thing style={{ flex: 1 }} />;",
    `${button} <Button label="Save" {...rest} />;`,
    {
      code: 'import { Thing } from \'../../lib/product/things/thing\'; <Thing className="x" />;',
      filename: '/repo/packages/client/src/features/sessions/view.tsx',
    },
    'import { type Button } from \'@repo/kit/primitives/actions/button\'; <Button className="x" />;',
    'import type { ButtonProps } from \'@repo/kit/primitives/actions/button\'; <ButtonProps className="x" />;',
  ],
  invalid: [
    {
      code: `${button} <Button label="Save" contentClassName="gap-2" />;`,
      errors: kitStyled,
    },
    {
      code: `${button} <Button label="Save" iconClassName="text-danger" />;`,
      errors: kitStyled,
    },
    {
      code: `${button} <Button label="Save" {...{ className: 'mt-2' }} />;`,
      errors: kitStyled,
    },
    {
      code: 'import { Button } from \'../../actions/button\'; <Button className="mt-2" />;',
      filename: '/repo/packages/kit/src/primitives/lists/list/list.tsx',
      errors: kitStyled,
    },
    {
      code: 'import { Button } from \'#primitives/actions/button\'; <Button className="mt-2" />;',
      errors: kitStyled,
    },
    {
      code: `${button} <Button label="Save" className="mt-2" />;`,
      errors: kitStyled,
    },
    {
      code: `${button} <Button label="Save" style={{ margin: 2 }} />;`,
      errors: kitStyled,
    },
    {
      code: 'import { Button as Action } from \'@repo/kit/primitives/actions/button\'; <Action className="mt-2" />;',
      errors: kitStyled,
    },
    {
      code: 'import * as Menu from \'@repo/kit/primitives/overlays/menu\'; <Menu.Item className="mt-2" />;',
      errors: kitStyled,
    },
    {
      code: "import { Pressable } from '@repo/kit/primitives/actions/pressable'; <Pressable style={styles.row} />;",
      errors: kitStyled,
    },
  ],
});
