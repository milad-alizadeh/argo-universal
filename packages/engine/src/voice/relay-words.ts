// What the relay says to the voice in its own words; the Agent's messages pass as they are.
export const relayWords = {
  started: 'Sent to the Agent. It is working on it.',
  steered: 'Sent to the Agent. It takes this into its current work.',
  queued: 'The Agent is busy. This waits until its current work is done.',
  notSteered: (reason: string): string =>
    `The Agent could not take this into its current work: ${reason}. This waits until that work is done.`,
  unsent: (reason: string): string => `That could not be sent: ${reason}`,
  typed: (text: string): string =>
    `The person typed this to the Agent: ${text}`,
  finished: 'The Agent finished its Turn.',
  failed: (error: string): string => `The Agent's Turn failed: ${error}`,
  stopped: (stopReason: string): string =>
    `The Agent's Turn stopped: ${stopReason}.`,
  permissionWaiting: (title: string): string =>
    `The Agent is waiting for permission: ${title}. The person answers it on screen.`,
};
