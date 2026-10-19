import type { SessionConfigOption } from '@repo/contracts';
import { useMemo, useState } from 'react';
import {
  type ConfigurationPicks,
  type EmptySessionConfiguration,
  initialConfigOptions,
  useSessionOptions,
} from '#features/sessions';
import type { OpenedSession } from './opened-session';

export type ConfigPick = (configId: string, value: string | boolean) => void;

type DraftPick = (
  configId: string,
  value: string | boolean,
  reset?: boolean,
) => void;

const noPicks: ConfigurationPicks = {};

// The reader's picks belong to the Agent they were made for.
function usePicks(agent: string | undefined): [ConfigurationPicks, DraftPick] {
  const [picked, setPicked] = useState<{
    agent: string | undefined;
    picks: ConfigurationPicks;
  }>({ agent, picks: noPicks });

  const picks = picked.agent === agent ? picked.picks : noPicks;

  const pick: DraftPick = (configId, value, reset) =>
    setPicked({
      agent,
      picks: { ...(reset ? noPicks : picks), [configId]: value },
    });

  return [picks, pick];
}

export interface Choices {
  configuration: EmptySessionConfiguration;
  configOptions: SessionConfigOption[];
  loading: boolean;
  discovery: ReturnType<typeof useSessionOptions>;
  pick: ConfigPick;
}

// What the store opens and brings the Session to; the same object while nothing changes.
const useConfiguration = (
  configOptions: SessionConfigOption[],
  picks: ConfigurationPicks,
): EmptySessionConfiguration =>
  useMemo(
    () => ({ initial: initialConfigOptions(configOptions, picks) }),
    [configOptions, picks],
  );

// The Server snapshot with unsent choices over it.
export function useOptionChoices(opened: OpenedSession): Choices {
  const { agent, projectId } = opened;
  const [picks, pick] = usePicks(JSON.stringify([agent, projectId]));

  const options = useSessionOptions({ agent, projectId, picks });

  return {
    configuration: useConfiguration(options.configOptions, picks),
    ...options,
    discovery: options,
    pick: (configId, value) =>
      pick(configId, value, isModel(options.configOptions, configId)),
  };
}

const isModel = (options: SessionConfigOption[], configId: string): boolean =>
  options.some(
    (option) => option.configId === configId && option.category === 'model',
  );
