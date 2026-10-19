import type { SessionConfigOption } from '@repo/contracts';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import {
  isRememberedConfiguration,
  rememberSessionConfiguration,
  type SavedChoices,
  savedChoicesQuery,
} from '#features/composer';
import {
  chosenOptions,
  type ConfigurationPicks,
  type EmptySessionConfiguration,
  initialConfigOptions,
  useSessionOptions,
} from '#features/sessions';
import type { OpenedSession } from './opened-session';

export type ConfigPick = (configId: string, value: string | boolean) => void;

const noSavedChoices: SavedChoices = {};

const noPicks: ConfigurationPicks = {};

// The reader's picks belong to the Agent they were made for.
function usePicks(agent: string | undefined): [ConfigurationPicks, ConfigPick] {
  const [picked, setPicked] = useState<{
    agent: string | undefined;
    picks: ConfigurationPicks;
  }>({ agent, picks: noPicks });

  const picks = picked.agent === agent ? picked.picks : noPicks;

  const pick: ConfigPick = (configId, value) =>
    setPicked({ agent, picks: { ...picks, [configId]: value } });

  return [picks, pick];
}

const isRemembered = (option: SessionConfigOption | undefined): boolean =>
  option !== undefined && isRememberedConfiguration(option);

// A model, effort or mode the reader picks is remembered for the Agent's next Session.
function useRemember(
  agent: string | undefined,
): (
  options: SessionConfigOption[],
  configId: string,
  value: string | boolean,
) => void {
  const queryClient = useQueryClient();

  return (options, configId, value) => {
    const picked = options.find((option) => option.configId === configId);

    if (agent === undefined || !isRemembered(picked)) return;
    const changed = chosenOptions(options, {}, { [configId]: value });
    rememberSessionConfiguration(queryClient, agent, changed);
  };
}

const useSaved = (agent: string | undefined): SavedChoices =>
  useQuery({ ...savedChoicesQuery(agent ?? ''), enabled: !!agent }).data ??
  noSavedChoices;

export interface Choices {
  configuration: EmptySessionConfiguration;
  configOptions: SessionConfigOption[];
  loading: boolean;
  pick: ConfigPick;
}

// What the store opens and brings the Session to; the same object while nothing changes.
const useConfiguration = (
  saved: SavedChoices,
  picks: ConfigurationPicks,
  configOptions: SessionConfigOption[],
): EmptySessionConfiguration =>
  useMemo(
    () => ({ saved, picks, initial: initialConfigOptions(configOptions) }),
    [saved, picks, configOptions],
  );

// The reader's saved choices and picks over the cached options.
export function useOptionChoices(opened: OpenedSession): Choices {
  const { session, ...owner } = opened;
  const saved = useSaved(owner.agent);
  const [picks, pick] = usePicks(owner.agent);

  const opening = session.opening;
  const options = useSessionOptions({ ...owner, saved, picks, opening });

  return {
    configuration: useConfiguration(saved, picks, options.configOptions),
    ...options,
    pick,
  };
}

// A pick shows at once and is remembered for the Agent's next Session.
export function useConfigChange(
  opened: OpenedSession,
  { configOptions, pick }: Choices,
): ConfigPick {
  const remember = useRemember(opened.agent);

  return (configId, value) => {
    pick(configId, value);
    remember(configOptions, configId, value);
  };
}
