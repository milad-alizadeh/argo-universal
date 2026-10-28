export interface OperationWaitClock {
  schedule: (callback: () => void, milliseconds: number) => () => void;
}

export const operationWaitLimitMs = 90_000;

export const operationWaitClock: OperationWaitClock = {
  schedule: (callback, milliseconds) => {
    const timer = setTimeout(callback, milliseconds);

    return (): void => clearTimeout(timer);
  },
};
