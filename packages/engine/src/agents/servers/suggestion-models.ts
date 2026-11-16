import {
  SessionConfigOption,
  SuggestionModelChoice,
  type AgentSuggestionModel,
} from '@repo/contracts';
import type { Database } from '@repo/db';
import { agentOptions, agentServers } from '@repo/db/schema';
import { desc, eq } from 'drizzle-orm';
import { jsonCodec } from '../../lib/json-codec';
import type { StorageTransaction, WriterJob } from '../../storage';
import { defaultSuggestionModel } from '../vendor';
import { readAgentServers } from './agent-servers-sql';

type ModelChoice = AgentSuggestionModel['models'][number];

const StoredChoice = jsonCodec(SuggestionModelChoice);

// The user's choice when it reads as one; otherwise the Agent's vendor default.
const choiceOf = (id: string, stored: string | null): SuggestionModelChoice => {
  const parsed = StoredChoice.safeParse(stored);

  return parsed.success ? parsed.data : defaultSuggestionModel(id);
};

export const readSuggestionModel = (
  database: Database,
  id: string,
): SuggestionModelChoice => {
  const row = database
    .select({ suggestionModel: agentServers.suggestionModel })
    .from(agentServers)
    .where(eq(agentServers.id, id))
    .get();

  return choiceOf(id, row?.suggestionModel ?? null);
};

type OptionEntry =
  | ModelChoice
  | { name: string; options: readonly ModelChoice[] };

// The values of a select option, flattened out of any groups; it reads an ACP option and a stored one alike.
export const modelValues = (option: {
  type: string;
  options?: readonly OptionEntry[];
}): ModelChoice[] => {
  if (option.type !== 'select') return [];

  return (option.options ?? []).flatMap((entry) =>
    'options' in entry
      ? entry.options.map(({ value, name }) => ({ value, name }))
      : [{ value: entry.value, name: entry.name }],
  );
};

// The models the Agent offered most recently, in any Project; none until it has run a Session.
const offeredModels = (database: Database, id: string): ModelChoice[] => {
  const row = database
    .select({ configOptions: agentOptions.configOptions })
    .from(agentOptions)
    .where(eq(agentOptions.agent, id))
    .orderBy(desc(agentOptions.revision))
    .get();

  const options = SessionConfigOption.array().safeParse(row?.configOptions);

  return options.success ? modelsIn(options.data) : [];
};

const modelsIn = (options: SessionConfigOption[]): ModelChoice[] => {
  const model = options.find((option) => option.category === 'model');

  return model ? modelValues(model) : [];
};

export const readSuggestionModels = (
  database: Database,
): AgentSuggestionModel[] =>
  readAgentServers(database).map(({ id, name }) => ({
    id,
    name,
    choice: readSuggestionModel(database, id),
    models: offeredModels(database, id),
  }));

export class SuggestionModelJob implements WriterJob {
  public constructor(
    private readonly id: string,
    private readonly choice: SuggestionModelChoice,
  ) {}
  public describe(): string {
    return `set suggestion model of Registry Agent ${this.id}`;
  }
  public commit(transaction: StorageTransaction): void {
    transaction
      .update(agentServers)
      .set({ suggestionModel: JSON.stringify(this.choice) })
      .where(eq(agentServers.id, this.id))
      .run();
  }
}
