import {
  isModelOption,
  type AgentOptionsUpdate,
  type InitialConfigOption,
  type SessionConfigOption,
  type SessionOpenError,
} from '@repo/contracts';
import {
  chosenOptions,
  initialConfigOptions,
  type ConfigurationPicks,
} from './session-option-choices';

export interface OptionsChoice {
  agent: string | undefined;
  projectId: string | undefined;
  sessionId?: string;
  liveConfigOptions?: SessionConfigOption[];
}

type Accepted = { update?: AgentOptionsUpdate; picks: ConfigurationPicks };

type Projection = {
  liveConfigOptions?: SessionConfigOption[];
  error?: SessionOpenError;
};

export interface OptionsSnapshot extends Partial<
  Pick<AgentOptionsUpdate, 'commands' | 'stage' | 'progress' | 'error'>
> {
  configOptions: SessionConfigOption[];
  loading: boolean;
  configuration: { initial: InitialConfigOption[] };
}

const ownerOf = ({ agent, projectId, sessionId }: OptionsChoice): string =>
  JSON.stringify([agent, projectId, sessionId]);

function retainOptions(
  previous: AgentOptionsUpdate | undefined,
  next: AgentOptionsUpdate,
): AgentOptionsUpdate {
  if (next.configOptions !== null) return next;
  const configOptions = previous ? previous.configOptions : null;

  return { ...next, configOptions };
}

// Own accepted Server updates and unsent picks for one Agent, Project and Session.
export class SessionOptionsState {
  readonly owner: string;
  readonly picks: ConfigurationPicks;
  private readonly update: AgentOptionsUpdate | undefined;

  constructor(
    private readonly choice: OptionsChoice,
    accepted: Accepted = { picks: {} },
  ) {
    this.owner = ownerOf(choice);
    this.picks = accepted.picks;
    this.update = accepted.update;
  }

  forChoice(choice: OptionsChoice): SessionOptionsState {
    return this.owner === ownerOf(choice)
      ? this
      : new SessionOptionsState(choice);
  }

  receive(owner: string, update: AgentOptionsUpdate): SessionOptionsState {
    if (owner !== this.owner) return this;

    return new SessionOptionsState(this.choice, {
      picks: this.picks,
      update: retainOptions(this.update, update),
    });
  }

  pick(configId: string, value: string | boolean): SessionOptionsState {
    const options = this.snapshot().configOptions;

    const model = options.some(
      (option) => option.configId === configId && isModelOption(option),
    );

    let picks = { ...this.picks };

    if (model) picks = {};
    picks[configId] = value;

    return new SessionOptionsState(this.choice, { update: this.update, picks });
  }

  snapshot(projection: Projection = {}): OptionsSnapshot {
    const error = this.failure(projection.error);
    const options = this.options(projection.liveConfigOptions);

    return {
      configOptions: options,
      loading: options.length === 0 && this.loading(error),
      configuration: { initial: initialConfigOptions(options, this.picks) },
      ...this.metadata(),
      error,
    };
  }

  private options(
    live: SessionConfigOption[] | undefined,
  ): SessionConfigOption[] {
    if (live?.length) return live;

    return chosenOptions(this.cached(), this.picks);
  }

  private loading(error: SessionOpenError | undefined): boolean {
    if (error) return false;

    return this.chosen() && this.hasNoSnapshot();
  }

  private hasNoSnapshot(): boolean {
    return this.update?.configOptions == null;
  }

  private cached(): SessionConfigOption[] {
    return this.update?.configOptions ?? [];
  }

  private failure(
    error: SessionOpenError | undefined,
  ): SessionOpenError | undefined {
    return this.update?.error ?? error;
  }

  private metadata(): Partial<
    Pick<AgentOptionsUpdate, 'commands' | 'stage' | 'progress'>
  > {
    if (!this.update) return {};
    const { commands, stage, progress } = this.update;

    return { commands, stage, progress };
  }

  private chosen(): boolean {
    return Boolean(this.choice.agent && this.choice.projectId);
  }
}
