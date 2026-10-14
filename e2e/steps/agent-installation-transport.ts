import type { Page, WebSocketRoute } from '@playwright/test';
import { z } from 'zod';
import { expect } from '../fixtures';
import { Given, Then } from './fixtures';

const dropped = new WeakSet<Page>();

type JsonValue = z.infer<ReturnType<typeof z.json>>;

type JsonObject = { [key: string]: JsonValue };

const jsonObject = (value: JsonValue): value is JsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const frames = (message: string | Buffer): JsonValue[] => {
  try {
    const value = z.json().parse(JSON.parse(message.toString()));

    return Array.isArray(value) ? value : [value];
  } catch {
    return [];
  }
};

const frameId = (frame: JsonObject): string | undefined =>
  typeof frame.id === 'number' ? String(frame.id) : undefined;

const installationRequest = (frame: JsonObject): boolean => {
  const params = frame.params ?? null;

  return jsonObject(params) && params.path === 'agents.install';
};

const installationId = (frame: JsonValue): string | undefined =>
  jsonObject(frame) && installationRequest(frame) ? frameId(frame) : undefined;

const responseMatches = (frame: JsonValue, id: string): boolean =>
  jsonObject(frame) && frameId(frame) === id;

function interruptAcceptedResponse(page: Page, route: WebSocketRoute): void {
  const server = route.connectToServer();
  let installId: string | undefined;
  route.onMessage((message): void => {
    installId ??= frames(message)
      .map(installationId)
      .find((id) => id !== undefined);
    server.send(message);
  });
  server.onMessage(dropAcceptedResponse(page, route, () => installId));
}

const shouldDrop = (
  message: string | Buffer,
  id: string | undefined,
): boolean =>
  id !== undefined &&
  frames(message).some((frame) => responseMatches(frame, id));

const dropAcceptedResponse =
  (
    page: Page,
    route: WebSocketRoute,
    id: () => string | undefined,
  ): ((message: string | Buffer) => void) =>
  (message): void => {
    if (shouldDrop(message, id())) {
      dropped.add(page);
      void route.close();
    } else route.send(message);
  };

Given(
  'the App loses the accepted installation response',
  async ({ page }): Promise<void> => {
    await page.routeWebSocket(/ws:\/\//, (route): void => {
      if (dropped.has(page)) route.connectToServer();
      else interruptAcceptedResponse(page, route);
    });
    await page.reload();
  },
);

Then(
  'the App recovered the dropped installation response',
  async ({ page }): Promise<void> => {
    await expect.poll(() => dropped.has(page)).toBe(true);
  },
);
