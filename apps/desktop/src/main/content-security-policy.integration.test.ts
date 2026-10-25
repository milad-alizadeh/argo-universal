import { type Server, createServer } from 'node:http';
import { type Browser, chromium } from 'playwright';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { contentSecurityPolicy } from './content-security-policy';

// Runs as the page's own script, since Playwright's evaluate is exempt from the page's policy. The module is the smallest valid WebAssembly: the magic number and version 1.
const probe = `
  let evalThrows = false;
  try { eval('1'); } catch { evalThrows = true; }
  WebAssembly.compile(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0])).then(
    () => true,
    () => false,
  ).then((compiled) => { window.probe = { evalThrows, compiled }; });
`;

const page =
  '<!doctype html><title>Argo</title><script src="/probe.js"></script>';

let server: Server;

let browser: Browser;

let pageUrl: string;

beforeAll(async () => {
  server = createServer((request, response) => {
    const isProbe = request.url === '/probe.js';

    response.setHeader('Content-Security-Policy', contentSecurityPolicy);
    response.setHeader(
      'Content-Type',
      isProbe ? 'text/javascript' : 'text/html',
    );
    response.end(isProbe ? probe : page);
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));

  const address = server.address();

  if (address === null || typeof address === 'string')
    throw new Error('The test server has no port.');
  pageUrl = `http://127.0.0.1:${address.port}/`;
  browser = await chromium.launch();
});

afterAll(async () => {
  await browser?.close();
  server?.close();
});

it('allows WebAssembly compilation but never JavaScript eval', async () => {
  expect(contentSecurityPolicy).toContain("'wasm-unsafe-eval'");
  expect(contentSecurityPolicy).not.toContain("'unsafe-eval'");

  const tab = await browser.newPage();
  await tab.goto(pageUrl);
  const probed = await tab.waitForFunction('window.probe');

  expect(await probed.jsonValue()).toEqual({
    evalThrows: true,
    compiled: true,
  });
});
