import { fn } from 'storybook/test';
import {
  composerLongModelList,
  composerLongAgentCatalog,
  composerUnlistedEffortConfigurations,
  composerLongListConfiguration,
} from '../composer-mock';
import type { Configuration } from './common';
export const lastLongModel = requiredListFact(composerLongModelList.at(-1));
export const lastLongAgent = requiredListFact(composerLongAgentCatalog.at(-1));
export const shortConfiguration = requiredListFact(
  composerUnlistedEffortConfigurations[0],
);
function requiredListFact<T>(fact: T | undefined): T {
  if (!fact)
    throw new Error(
      'Recorded catalog needs long and short Agent and model lists.',
    );
  return fact;
}
export function longListConfiguration(): Configuration {
  return {
    ...composerLongListConfiguration,
    onConfigChange: fn(),
    onAgentChange: fn(),
  };
}
