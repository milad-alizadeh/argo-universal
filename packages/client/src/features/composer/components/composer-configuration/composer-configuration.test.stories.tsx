import type { Meta } from '@storybook/react-native-web-vite';
import { cantStartAgentRecheck } from '../../../../../mocks/composer-configuration/agent-retry';
import { defaultEffort } from '../../../../../mocks/composer-configuration/default-effort';
import {
  FastModeSwitchPhone as fastModePhone,
  FastModeSwitchWide as fastModeWide,
  FastModeOnMarksTrigger as fastModeMarker,
} from '../../../../../mocks/composer-configuration/fast-mode';
import { heldConfiguration } from '../../../../../mocks/composer-configuration/held-configuration';
import {
  LongListsScrollUnderFadesWide as longListsWide,
  LongListsReachableInPhoneSheet as longListsPhone,
  ShortListsHaveNoFadesWide as shortListsWide,
} from '../../../../../mocks/composer-configuration/long-lists';
import { layoutWidths } from '../../../../lib/generic/each-layout';
import { ComposerAgentModelControl } from './composer-configuration';
import { DefaultEffort } from './composer-configuration.stories';
export const LongListsScrollUnderFadesWide = longListsWide;
export const LongListsReachableInPhoneSheet = longListsPhone;
export const ShortListsHaveNoFadesWide = shortListsWide;
export const FastModeSwitchPhone = fastModePhone;
export const FastModeSwitchWide = fastModeWide;
export const FastModeOnMarksTrigger = fastModeMarker;
const meta = {
  title: 'Tests/ComposerConfiguration',
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

export const CantStartAgentRecheckPhoneFirstAgent = cantStartAgentRecheck(
  layoutWidths.phone,
  0,
  'new',
);
export const CantStartAgentRecheckPhoneSecondAgent = cantStartAgentRecheck(
  layoutWidths.phone,
  1,
  'new',
);
export const CantStartAgentRecheckWideFirstAgent = cantStartAgentRecheck(
  layoutWidths.wide,
  0,
  'new',
);
export const CantStartAgentRecheckWideSecondAgent = cantStartAgentRecheck(
  layoutWidths.wide,
  1,
  'new',
);
export const StartedSessionAgentRetryPhoneFirstAgent = cantStartAgentRecheck(
  layoutWidths.phone,
  0,
  'started',
);
export const StartedSessionAgentRetryPhoneSecondAgent = cantStartAgentRecheck(
  layoutWidths.phone,
  1,
  'started',
);
export const StartedSessionAgentRetryWideFirstAgent = cantStartAgentRecheck(
  layoutWidths.wide,
  0,
  'started',
);
export const StartedSessionAgentRetryWideSecondAgent = cantStartAgentRecheck(
  layoutWidths.wide,
  1,
  'started',
);

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
