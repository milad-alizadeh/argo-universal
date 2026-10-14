import type { PlanEntry } from '@repo/contracts';
import { newSessionInputs } from '@repo/mocks/app';
import type { ComposerAttachment } from '../src/features/composer/components/composer/composer';
import { redSquareDataUrl } from '../src/lib/product/feed-message.mocks';

export const composerImages: ComposerAttachment[] = newSessionInputs.flatMap(
  ({ agent, prompt }) =>
    prompt.flatMap((block) =>
      block.type === 'image'
        ? [
            {
              id: `${agent}:image`,
              name: 'screenshot.png',
              uri: redSquareDataUrl,
              bytes: block.blob.bytes,
              mimeType: block.mimeType,
            },
          ]
        : [],
    ),
);

const imageFromContract = composerImages[0];

if (!imageFromContract)
  throw new Error('New Session contract mock needs an image.');

export const oversizedComposerImage: ComposerAttachment = {
  ...imageFromContract,
  name: 'full-screen.png',
  bytes: 27 * 1024 * 1024,
};

// A text file shows its first lines; any other file shows its kind.
export const composerFiles: ComposerAttachment[] = [
  {
    id: 'notes:file',
    name: 'release-notes.md',
    uri: 'file:///Users/me/release-notes.md',
    bytes: 1_204,
    mimeType: 'text/markdown',
    preview:
      '# Release notes\n\n- Attach any file to a prompt\n- Drop files on the Composer\n- Text files go to the Agent inline',
  },
  {
    id: 'report:file',
    name: 'quarterly-report.pdf',
    uri: 'file:///Users/me/quarterly-report.pdf',
    bytes: 482_113,
    mimeType: 'application/pdf',
  },
];

export const composerPlan: PlanEntry[] = [
  {
    content: 'Inspect the Composer layout',
    priority: 'high',
    status: 'completed',
  },
  {
    content: 'Update the shared controls',
    priority: 'high',
    status: 'in_progress',
  },
  {
    content: 'Verify phone and desktop',
    priority: 'medium',
    status: 'pending',
  },
];

export const composerPlanDone: PlanEntry[] = composerPlan.map((entry) => ({
  ...entry,
  status: 'completed',
}));
