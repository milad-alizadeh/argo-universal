import type { Argo } from '@argo/plugin-kit';
import { postForm, text, withScope, type Reply } from './reply';
import { failed, type Ended } from './steps';

export type DeviceClient = {
  name: string;
  clientId: string;
  scope?: string;
  deviceUrl: string;
  tokenUrl: string;
};

export type CodeAnswer = {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
};

type Partly = { [Key in keyof CodeAnswer]: string | null };

const answerOf = (reply: Reply): Partly => ({
  deviceCode: text(reply, 'device_code'),
  userCode: text(reply, 'user_code'),
  verificationUri: text(reply, 'verification_uri'),
});

const complete = (answer: Partly): answer is CodeAnswer =>
  Object.values(answer).every((value) => value !== null);

export function codeOf(reply: Reply): CodeAnswer | null {
  const answer = answerOf(reply);

  return complete(answer) ? answer : null;
}

export const noCode = (client: DeviceClient, reply: Reply): Ended =>
  failed(
    text(reply, 'error_description') ?? `${client.name} sent no sign-in code.`,
  );

export async function askForCode(
  { fetch }: Pick<Argo, 'fetch'>,
  client: DeviceClient,
): Promise<Reply> {
  const target = { url: client.deviceUrl, name: client.name };
  const fields = withScope({ client_id: client.clientId }, client.scope);

  return postForm(fetch, target, fields);
}
