import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { VoicePreviewClip } from '@repo/contracts';

// What makes a greeting sound as it does: who speaks it, the voice and how it speaks, and the name it greets with.
export interface PreviewClipKey {
  provider: string;
  voice: string;
  style?: string;
  label: string;
}

// The same key always names the same file; a change to any part names another.
const fileOf = (key: PreviewClipKey): string =>
  `${createHash('sha256')
    .update(
      JSON.stringify([key.provider, key.voice, key.style ?? null, key.label]),
    )
    .digest('hex')}.json`;

/*
 * The greetings the App recorded from voice previews (ADR-0064), one file each in `directory`. A clip is never
 * removed: changing a custom voice's name or description names a new clip, and the old one is only unused.
 */
export class VoicePreviewClips {
  public constructor(private readonly directory: string) {}

  // The stored clip, or null when there is none or the file cannot be read, so the next preview records it again.
  public async read(key: PreviewClipKey): Promise<VoicePreviewClip | null> {
    try {
      const stored = VoicePreviewClip.safeParse(
        JSON.parse(await readFile(join(this.directory, fileOf(key)), 'utf8')),
      );

      return stored.success ? stored.data : null;
    } catch {
      return null;
    }
  }

  // Written to a side file first, so a clip is whole or not there.
  public async write(
    key: PreviewClipKey,
    clip: VoicePreviewClip,
  ): Promise<void> {
    await mkdir(this.directory, { recursive: true });
    const file = join(this.directory, fileOf(key));
    const partial = `${file}.${process.pid}.${Date.now()}.partial`;
    await writeFile(partial, JSON.stringify(clip));
    await rename(partial, file);
  }
}
