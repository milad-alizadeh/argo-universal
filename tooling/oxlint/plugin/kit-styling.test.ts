import { kitStyling } from './kit-styling.ts';
import { ruleTester } from './rule-tester.ts';

const kitStyled = [{ messageId: 'kitStyling' }];

const button = "import { Button } from '#primitives/actions/button';";

ruleTester.run('kit-styling', kitStyling, {
  valid: [
    `${button} <Button label="Save" variant="primary" />;`,
    'import { View } from \'react-native\'; <View className="flex-1" />;',
    "import { Thing } from './thing'; <Thing style={{ flex: 1 }} />;",
    `${button} <Button label="Save" {...rest} />;`,
    {
      code: 'import { Thing } from \'../../lib/generic/things/thing\'; <Thing className="x" />;',
      filename: '/repo/packages/client/src/features/sessions/view.tsx',
    },
    'import { type Button } from \'#primitives/actions/button\'; <Button className="x" />;',
    'import type { ButtonProps } from \'#primitives/actions/button\'; <ButtonProps className="x" />;',
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
      code: 'import { Button } from \'../../lib/generic/primitives/actions/button\'; <Button className="mt-2" />;',
      filename: '/repo/packages/client/src/features/sessions/view.tsx',
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
      code: 'import { Button as Action } from \'#primitives/actions/button\'; <Action className="mt-2" />;',
      errors: kitStyled,
    },
    {
      code: 'import * as Menu from \'#primitives/overlays/menu\'; <Menu.Item className="mt-2" />;',
      errors: kitStyled,
    },
    {
      code: "import { Pressable } from '#primitives/actions/pressable'; <Pressable style={styles.row} />;",
      errors: kitStyled,
    },
  ],
});
