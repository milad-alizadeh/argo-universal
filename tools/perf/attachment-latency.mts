import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { FileChooser, Page } from '@playwright/test';
import {
  type AttachmentFile,
  attachmentFile,
  type AttachmentKind,
  type AttachmentSize,
  payload,
} from './attachment-file.mts';
import { untilTrue } from './driver-wait.mts';
import type { DriverAction, ElapsedScenario } from './elapsed-scenario.mts';
import { desktop, openApp, openSession } from './page.mts';
import type { SeededServer } from './seed.mts';

export type AttachmentArm = 'preview' | 'upload';

export interface AttachmentOption {
  kind: AttachmentKind;
  size: AttachmentSize;
  arm: AttachmentArm;
  // How long the upload arm waits for the Server to hold the bytes.
  timeout: number;
}

const message = 'Attachment check';

// The wide Frame's Attach menu offers one entry, Files, for images and text alike; Photos is the phone's.
async function chooseFile(page: Page): Promise<FileChooser> {
  await page.getByRole('button', { name: 'Attach', exact: true }).click();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Files', exact: true }).click();

  return chooser;
}

const drawnPreview = (wanted: string): boolean =>
  [...document.querySelectorAll('[aria-label], img')].some(
    (element) =>
      (element.getAttribute('aria-label') ?? element.getAttribute('alt')) ===
      wanted,
  );

// The Composer shows the file's preview.
const previewShown = (page: Page, name: string): Promise<void> =>
  untilTrue(page, drawnPreview, name);

async function stored(
  server: SeededServer,
  file: AttachmentFile,
): Promise<boolean> {
  const response = await fetch(`${server.httpUrl}/blobs/${file.blobId}`);

  return (
    response.ok && (await response.arrayBuffer()).byteLength === file.bytes
  );
}

async function untilStored(
  server: SeededServer,
  file: AttachmentFile,
  deadline: number,
): Promise<void> {
  while (!(await stored(server, file))) {
    if (performance.now() > deadline)
      throw Object.assign(new Error(`Blob ${file.blobId} never arrived`), {
        name: 'TimeoutError',
      });
  }
}

interface Context {
  page: Page;
  server: SeededServer;
  directory: string;
  option: AttachmentOption;
  trial: { count: number; last?: AttachmentFile };
}

// A new file on disk; the last trial's is removed first, since the large ones are megabytes.
async function freshFile(context: Context): Promise<AttachmentFile> {
  const { directory, option, trial } = context;
  const { kind, size } = option;

  if (trial.last) await rm(trial.last.path, { force: true });
  trial.count += 1;
  trial.last = await attachmentFile(directory, {
    kind,
    size,
    trial: trial.count,
  });

  return trial.last;
}

// A new file, chosen in the file chooser of the Session reopened without the last trial's draft.
async function chosen(
  context: Context,
): Promise<{ file: AttachmentFile; chooser: FileChooser }> {
  const { page, server } = context;
  const file = await freshFile(context);

  await page.goto('/');
  await openSession(page, server.shortSessionTitle);

  return { file, chooser: await chooseFile(page) };
}

async function attachBeforeSend(
  context: Context,
  chooser: FileChooser,
  file: AttachmentFile,
): Promise<void> {
  const { page, server } = context;
  await chooser.setFiles(file.path);
  await previewShown(page, file.name);

  // An upload that began at selection would already be stored, and this arm would time nothing.
  if (await stored(server, file))
    throw new Error('The Blob was stored before Send; Send starts no upload');
  await page.getByRole('textbox', { name: 'Message' }).fill(message);
}

async function prepareUpload(
  context: Context,
  chooser: FileChooser,
  file: AttachmentFile,
): Promise<DriverAction> {
  const { page, server, option } = context;
  await attachBeforeSend(context, chooser, file);

  return {
    dispatch: () =>
      page.getByRole('button', { name: 'Send', exact: true }).click(),
    ready: () => untilStored(server, file, performance.now() + option.timeout),
  };
}

async function prepareAttachment(context: Context): Promise<DriverAction> {
  const { file, chooser } = await chosen(context);

  if (context.option.arm === 'upload')
    return prepareUpload(context, chooser, file);

  return {
    dispatch: () => chooser.setFiles(file.path),
    ready: () => previewShown(context.page, file.name),
  };
}

const boundary = ({ kind, size, arm }: AttachmentOption): string =>
  arm === 'preview'
    ? `File chooser selection of a ${size} synthetic ${kind} file → its preview drawn in the Composer; ${payload(kind, size)}; includes automation round trips`
    : `Send press with a ${size} synthetic ${kind} file attached → the Server answers its Blob with every byte; ${payload(kind, size)}, new random content per trial; the Agent's receipt of the file is not observed`;

/*
 * PF-14: attaches a synthetic file to a Composer through the real file chooser. The preview arm
 * ends when the Composer shows it; the upload arm ends when the Server holds the bytes.
 */
export async function attachment(
  page: Page,
  server: SeededServer,
  option: AttachmentOption,
): Promise<ElapsedScenario> {
  await openApp(page, { serverUrl: server.serverUrl, viewport: desktop });
  const directory = await mkdtemp(path.join(os.tmpdir(), 'argo-perf-attach-'));
  const context = { page, server, directory, option, trial: { count: 0 } };

  return {
    condition: 'document-reload',
    boundary: boundary(option),
    driverOnly: true,
    prepare: () => prepareAttachment(context),
  };
}
