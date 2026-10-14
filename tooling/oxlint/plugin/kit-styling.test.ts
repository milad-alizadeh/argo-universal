import { kitStyling } from './kit-styling.ts';
import { ruleTester } from './rule-tester.ts';

const kitStyled = [{ messageId: 'kitStyling' }];

const button = "import { Button } from '#primitives/buttons/button';";

ruleTester.run('kit-styling', kitStyling, {
  valid: [
    `${button} <Button label="Save" variant="primary" />;`,
    'import { View } from \'react-native\'; <View className="flex-1" />;',
    "import { Thing } from './thing'; <Thing style={{ flex: 1 }} />;",
    `${button} <Button label="Save" contentClassName="gap-2" />;`,
    'import type { ButtonProps } from \'#primitives/buttons/button\'; <ButtonProps className="x" />;',
  ],
  invalid: [
    {
      code: `${button} <Button label="Save" className="mt-2" />;`,
      errors: kitStyled,
    },
    {
      code: `${button} <Button label="Save" style={{ margin: 2 }} />;`,
      errors: kitStyled,
    },
    {
      code: 'import { Button as Action } from \'#primitives/buttons/button\'; <Action className="mt-2" />;',
      errors: kitStyled,
    },
    {
      code: 'import * as Menu from \'#primitives/overlays/menu\'; <Menu.Item className="mt-2" />;',
      errors: kitStyled,
    },
    {
      code: "import { Pressable } from '#primitives/pressable'; <Pressable style={styles.row} />;",
      errors: kitStyled,
    },
  ],
});
