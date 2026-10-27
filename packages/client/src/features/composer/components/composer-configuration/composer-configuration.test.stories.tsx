import { layoutWidths } from '@repo/kit/mocks/story-layout';
import type { Meta } from '@storybook/react-native-web-vite';
import { defaultEffort } from '../../../../../mocks/composer-configuration/default-effort';
import {
  FastModeSwitchPhone as fastModePhone,
  FastModeSwitchWide as fastModeWide,
  FastModeOnMarksTrigger as fastModeMarker,
} from '../../../../../mocks/composer-configuration/fast-mode';
import { heldConfiguration } from '../../../../../mocks/composer-configuration/held-configuration';
import {
  LongListsReachableWide as longListsWide,
  LongListsReachableInPhoneSheet as longListsPhone,
  ShortModelListFitsWide as shortModelListWide,
} from '../../../../../mocks/composer-configuration/long-lists';
import { ComposerAgentModelControl } from './composer-configuration';
import { DefaultEffort } from './composer-configuration.stories';

export const LongListsReachableWide = longListsWide;

export const LongListsReachableInPhoneSheet = longListsPhone;

export const ShortModelListFitsWide = shortModelListWide;

export const FastModeSwitchPhone = fastModePhone;

export const FastModeSwitchWide = fastModeWide;

export const FastModeOnMarksTrigger = fastModeMarker;

const meta = {
  title: 'Tests/Composer/ComposerConfiguration',
  component: ComposerAgentModelControl,
  render: DefaultEffort.render,
  args: { disabled: false },
} satisfies Meta<typeof ComposerAgentModelControl>;

export default meta;

export const DefaultEffortPhoneFirstAgent = defaultEffort(
  layoutWidths.phone,
  0,
);

export const DefaultEffortPhoneSecondAgent = defaultEffort(
  layoutWidths.phone,
  1,
);

export const DefaultEffortWideFirstAgent = defaultEffort(layoutWidths.wide, 0);

export const DefaultEffortWideSecondAgent = defaultEffort(layoutWidths.wide, 1);

export const HeldConfigurationPhoneFirstAgent = heldConfiguration(
  layoutWidths.phone,
  0,
);

export const HeldConfigurationPhoneSecondAgent = heldConfiguration(
  layoutWidths.phone,
  1,
);

export const HeldConfigurationWideFirstAgent = heldConfiguration(
  layoutWidths.wide,
  0,
);

export const HeldConfigurationWideSecondAgent = heldConfiguration(
  layoutWidths.wide,
  1,
);
