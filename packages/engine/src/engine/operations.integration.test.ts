import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { startProjectTestHost } from '#mocks/project-host';

const tokenFilename = 'control.token';

const projectListId = 'project.list';

const jsonHeaders = { 'content-type': 'application/json' };

it.each([
  { procedure: 'list', options: undefined },
  {
    procedure: 'run',
    options: {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ id: projectListId, params: {} }),
    },
  },
])(
  'refuses operations.$procedure without a token',
  async ({ procedure, options }) => {
    const host = await startProjectTestHost();

    const response = await fetch(
      `${host.url}/trpc/operations.${procedure}`,
      options,
    );

    expect(response.status).toBe(401);
  },
);

it('discovers and runs the same Project list as the App with its private user token', async () => {
  const host = await startProjectTestHost();
  const tokenPath = join(host.home, tokenFilename);
  const token = (await readFile(tokenPath, 'utf8')).trim();
  expect((await stat(tokenPath)).mode & 0o777).toBe(0o600);

  const headers = {
    authorization: `Bearer ${token}`,
    ...jsonHeaders,
  };

  const list = await fetch(`${host.url}/trpc/operations.list`, { headers });
  expect(await list.json()).toMatchObject({
    result: {
      data: expect.arrayContaining([
        expect.objectContaining({
          id: projectListId,
          enabled: true,
          disabledReason: null,
        }),
      ]),
    },
  });

  const run = await fetch(`${host.url}/trpc/operations.run`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ id: projectListId, params: {} }),
  });

  expect(await run.json()).toEqual({
    result: { data: await host.caller.project.list() },
  });
});

it('names an invalid Operation argument so a caller can repair it', async () => {
  const host = await startProjectTestHost();

  const token = (await readFile(join(host.home, tokenFilename), 'utf8')).trim();

  const response = await fetch(`${host.url}/trpc/operations.run`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      ...jsonHeaders,
    },
    body: JSON.stringify({ id: projectListId, params: { projectId: 42 } }),
  });

  expect(response.status).toBe(400);
  expect(await response.json()).toMatchObject({
    error: {
      message: expect.stringContaining('projectId'),
      data: { code: 'BAD_REQUEST' },
    },
  });
});

it('refuses a wrong token before discovering Operations', async () => {
  const host = await startProjectTestHost();

  const response = await fetch(`${host.url}/trpc/operations.list`, {
    headers: { authorization: 'Bearer wrong' },
  });

  expect(response.status).toBe(401);
});

it('finds Operations by a keyword without matching case', async () => {
  const host = await startProjectTestHost();

  const token = (await readFile(join(host.home, tokenFilename), 'utf8')).trim();

  const input = encodeURIComponent(JSON.stringify({ filter: 'FOLDERS' }));

  const response = await fetch(
    `${host.url}/trpc/operations.list?input=${input}`,
    { headers: { authorization: `Bearer ${token}` } },
  );

  expect(await response.json()).toMatchObject({
    result: { data: [{ id: projectListId }] },
  });
});
