import {
  RequestError,
  type SessionConfigOption,
  type SetSessionConfigOptionRequest,
} from '@agentclientprotocol/sdk';

export type ScriptedCancellation = {
  cancelled: Promise<void>;
  isCancelled: () => boolean;
};

const selectConfigOption = (
  option: SessionConfigOption,
  params: SetSessionConfigOptionRequest,
): SessionConfigOption => {
  if (option.id !== params.configId) return option;
  if (option.type === 'boolean' && typeof params.value === 'boolean')
    return { ...option, currentValue: params.value };
  if (option.type === 'select' && typeof params.value === 'string')
    return { ...option, currentValue: params.value };
  throw RequestError.invalidParams(undefined, 'Wrong configuration value type');
};

// Node strips types but cannot transform parameter properties, so fields are assigned by hand.
export class ScriptedSessions {
  private readonly initial: readonly SessionConfigOption[];
  private readonly configurations = new Map<string, SessionConfigOption[]>();
  private readonly cancellations = new Map<
    string,
    PromiseWithResolvers<void>
  >();
  public constructor(initial: readonly SessionConfigOption[]) {
    this.initial = initial;
  }
  public open(sessionId: string): SessionConfigOption[] {
    const configOptions = this.configurations.get(sessionId) ?? [
      ...this.initial,
    ];
    this.configurations.set(sessionId, configOptions);
    return configOptions;
  }
  public close(sessionId: string): void {
    this.configurations.delete(sessionId);
  }
  public configure(
    params: SetSessionConfigOptionRequest,
  ): SessionConfigOption[] {
    const configOptions = this.open(params.sessionId).map((option) =>
      selectConfigOption(option, params),
    );
    this.configurations.set(params.sessionId, configOptions);
    return configOptions;
  }
  public startTurn(sessionId: string): ScriptedCancellation {
    const cancellation = Promise.withResolvers<void>();
    let cancelled = false;
    void cancellation.promise.then(() => {
      cancelled = true;
    });
    this.cancellations.set(sessionId, cancellation);
    return { cancelled: cancellation.promise, isCancelled: () => cancelled };
  }
  public cancel(sessionId: string): void {
    this.cancellations.get(sessionId)?.resolve();
  }
  public endTurn(sessionId: string): void {
    this.cancellations.delete(sessionId);
  }
}
