import AsyncStorage from '@react-native-async-storage/async-storage';
import type {} from '@repo/contracts';
import { QueryClient } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  catalogCases,
  drafted,
  accepted,
} from '../../../../mocks/composer-preference-mock';
import { memoryStorage } from '../../../../mocks/memory-storage';
import {
  rememberSessionConfiguration,
  savedChoicesQuery,
} from './session-configuration-preferences';
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('rememberSessionConfiguration', () => {
  it.each(catalogCases)(
    'keeps the choice $agent.agent accepted while an older read is still loading',
    async ({ agent, model, effort, narrower, chosenEffort, defaultMode }) => {
      vi.stubGlobal('window', { localStorage: memoryStorage() });
      const client = new QueryClient();
      const query = savedChoicesQuery(agent.agent);
      const olderRead = Promise.withResolvers<string | null>();
      const read = vi
        .spyOn(AsyncStorage, 'getItem')
        .mockReturnValue(olderRead.promise);
      const loading = client.fetchQuery(query).catch(() => null);
      await vi.waitFor(() => expect(read).toHaveBeenCalledTimes(3));
      rememberSessionConfiguration(
        client,
        agent.agent,
        accepted(agent, { model: narrower.value, thought_level: chosenEffort }),
      );
      olderRead.resolve(null);
      await loading;
      expect(drafted(agent, client.getQueryData(query.queryKey) ?? {})).toEqual(
        [
          { configId: model.configId, value: narrower.value },
          { configId: effort.configId, value: chosenEffort },
          defaultMode,
        ],
      );
    },
  );

  it.each(catalogCases)(
    'saves the choice $agent.agent accepted for the next App start',
    async ({ agent, narrower, chosenEffort, otherMode }) => {
      vi.stubGlobal('window', { localStorage: memoryStorage() });
      rememberSessionConfiguration(
        new QueryClient(),
        agent.agent,
        accepted(agent, {
          model: narrower.value,
          thought_level: chosenEffort,
          mode: otherMode.value,
        }),
      );
      await expect(
        new QueryClient().fetchQuery(savedChoicesQuery(agent.agent)),
      ).resolves.toEqual({
        model: narrower.value,
        thought_level: chosenEffort,
        mode: otherMode.value,
      });
    },
  );
});
