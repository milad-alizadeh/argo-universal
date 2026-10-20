import type { FetchResponse } from '@repo/contracts/plugins/argo-api';
import type { FetchReply } from '@repo/contracts/plugins/argo-calls';

export const fetchResponse = (reply: FetchReply): FetchResponse =>
  Object.freeze({
    ...reply,
    headers: Object.freeze({ ...reply.headers }),
    text: async () => reply.body,
    json: async () => JSON.parse(reply.body),
  });
