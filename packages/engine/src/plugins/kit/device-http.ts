import type { DeviceFlowArgo } from '@repo/contracts/plugins/device-flow-api';
import { z } from 'zod';

// What a device endpoint may answer; every field is optional, so an answer that is not JSON reads as one with none.
export const CodeAnswer = z.object({
  device_code: z.string().min(1).optional(),
  user_code: z.string().min(1).optional(),
  verification_uri: z.string().min(1).optional(),
  expires_in: z.number().nonnegative().optional(),
  interval: z.number().nonnegative().optional(),
  error_description: z.string().optional(),
});

// RFC 8628 section 3.2: a code lasts as the service says, and is polled every five seconds unless it says.
const defaultLifetimeSeconds = 900;

const defaultIntervalSeconds = 5;

// A code answer that has everything the page shows and the poll needs, with the service's defaults for the rest.
export const CompleteCode = z.object({
  device_code: z.string().min(1),
  user_code: z.string().min(1),
  verification_uri: z.string().min(1),
  expires_in: z.number().nonnegative().default(defaultLifetimeSeconds),
  interval: z.number().nonnegative().default(defaultIntervalSeconds),
});

export const TokenAnswer = z.object({
  access_token: z.string().min(1).optional(),
  error: z.string().optional(),
  error_description: z.string().optional(),
});

const form = (fields: Record<string, string>): string =>
  Object.entries(fields)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&');

function parsed<Answer>(schema: z.ZodType<Answer>, text: string): Answer {
  try {
    return schema.parse(JSON.parse(text));
  } catch {
    return schema.parse({});
  }
}

// One form POST to an endpoint, read as JSON; no answer from the service reads as an empty one.
export async function postForm<Answer>(
  fetch: DeviceFlowArgo['fetch'],
  target: { url: string; fields: Record<string, string> },
  schema: z.ZodType<Answer>,
): Promise<Answer> {
  const response = await fetch(target.url, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: form(target.fields),
  });

  return parsed(schema, response ? await response.text() : '');
}

const LabelAnswer = z.record(z.string(), z.unknown());

const Label = z.string().min(1).nullable().catch(null);

type Response = Awaited<ReturnType<DeviceFlowArgo['fetch']>>;

async function labelIn(response: Response, field: string): Promise<string | null> {
  if (!response?.ok) return null;

  const value = parsed(LabelAnswer, await response.text())[field];

  return Label.parse(value);
}

// The `field` of the JSON `url` answers when it is called with the token, and the status it answered with.
export async function labelRead(
  fetch: DeviceFlowArgo['fetch'],
  token: string,
  { url, field }: { url: string; field: string },
): Promise<{ label: string | null; status: number | null }> {
  const response = await fetch(url, {
    headers: { authorization: `Bearer ${token}`, accept: 'application/json' },
  });

  return {
    label: await labelIn(response, field),
    status: response?.status ?? null,
  };
}
