// An Agent (a Session's delegate) by its title, when it has one.
const agentNamed = (title: string | null): string =>
  title ? `The Agent "${title}"` : 'An Agent';

// What the relay says to the voice in its own words; the Agent's messages pass as they are.
export const relayWords = {
  started: 'Sent to the Agent. It is working on it.',
  steered: 'Sent to the Agent. It takes this into its current work.',
  queued: 'The Agent is busy. This waits until its current work is done.',
  notSteered: (reason: string): string =>
    `The Agent could not take this into its current work: ${reason}. This waits until that work is done.`,
  stopping: 'Stopping the Agent. Its current work is cancelled.',
  nothingToStop:
    'The Agent is not working on anything, so nothing was stopped.',
  unsent: (reason: string): string => `That could not be sent: ${reason}`,
  typed: (text: string): string =>
    `The person typed this to the Agent: ${text}`,
  finished: 'The Agent finished its Turn.',
  failed: (error: string): string => `The Agent's Turn failed: ${error}`,
  stopped: (stopReason: string): string =>
    `The Agent's Turn stopped: ${stopReason}.`,
  noImages:
    'This voice cannot be given a picture of the screen, so nothing was captured. Tell the person, and say the Agent can look at it instead.',
  looked:
    'You now have one still picture of the person’s screen, as background. Look at it and answer what they asked. It is not kept.',
  screenOff:
    'Looking at the screen is turned off on this Device, so nothing was captured. Tell the person if they ask.',
  screenUnreachable:
    'No App that can capture the screen is reachable, so nothing was captured.',
  screenUnavailable: (reason: string): string =>
    `The screen could not be captured: ${reason}`,
  permissionWaiting: (title: string): string =>
    `The Agent is waiting for permission: ${title}. The person answers it on screen.`,
  elicitationWaiting: (message: string): string =>
    `The Agent is asking the person: ${message} The person answers it on screen, or a new request settles it.`,
  startedFinished: (title: string, last: string | null): string =>
    last
      ? `The Session "${title}" finished. It said: ${last}`
      : `The Session "${title}" finished.`,
  startedFailed: (title: string, error: string): string =>
    `The Session "${title}" failed: ${error}`,
  startedStopped: (title: string, stopReason: string): string =>
    `The Session "${title}" stopped: ${stopReason}.`,
  startedWaitingPermission: (title: string, what: string): string =>
    `The Session "${title}" is waiting for permission: ${what}. The person answers it on screen.`,
  startedAsking: (title: string, question: string): string =>
    `The Session "${title}" is asking the person: ${question} The person answers it on screen.`,
  agentFinished: (title: string | null): string =>
    `${agentNamed(title)} finished.`,
  agentStopped: (title: string | null, stopReason: string): string =>
    `${agentNamed(title)} stopped: ${stopReason}.`,
  // What a request for work is answered with while a Permission request waits: speech never answers it.
  permissionStillWaiting: (title: string): string =>
    `Nothing was allowed or rejected: the Agent is still waiting for permission: ${title}. The person answers it on screen.`,
};
