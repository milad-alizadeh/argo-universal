import { mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { VoicePreviewClips, type PreviewClipKey } from './voice-preview-clips';

const directories: string[] = [];

const freshDirectory = (): string => {
  const directory = mkdtempSync(join(tmpdir(), 'argo-preview-clips-'));
  directories.push(directory);

  return directory;
};

afterEach(() => {
  for (const directory of directories.splice(0))
    rmSync(directory, { recursive: true, force: true });
});

const key: PreviewClipKey = {
  provider: 'gpt-live',
  voice: 'cove',
  label: 'Cove',
};

const clip = { mimeType: 'audio/webm', data: 'AAEC' };

describe('Conversation preview clips', () => {
  it('holds nothing until a clip is stored, then returns it, even to a new Server over the same folder', async () => {
    const directory = join(freshDirectory(), 'voice-previews');
    const clips = new VoicePreviewClips(directory);
    expect(await clips.read(key)).toBeNull();

    await clips.write(key, clip);

    expect(await clips.read(key)).toEqual(clip);
    expect(await new VoicePreviewClips(directory).read(key)).toEqual(clip);
  });

  it.each([
    ['provider', { ...key, provider: 'other' }],
    ['voice', { ...key, voice: 'sol' }],
    ['style', { ...key, style: 'Savvy and relaxed' }],
    ['label', { ...key, label: 'Cove 2' }],
  ])('keeps a clip apart when only the %s differs', async (_name, other) => {
    const clips = new VoicePreviewClips(freshDirectory());
    await clips.write(key, clip);

    expect(await clips.read(other)).toBeNull();
  });

  it('replaces the clip stored for the same key and leaves no partial file', async () => {
    const directory = freshDirectory();
    const clips = new VoicePreviewClips(directory);
    await clips.write(key, clip);
    await clips.write(key, { mimeType: 'audio/ogg', data: 'AwQF' });

    expect(await clips.read(key)).toEqual({
      mimeType: 'audio/ogg',
      data: 'AwQF',
    });
    expect(readdirSync(directory)).toHaveLength(1);
  });

  it('treats an unreadable file as no clip, so the next preview records it again', async () => {
    const directory = freshDirectory();
    const clips = new VoicePreviewClips(directory);
    await clips.write(key, clip);
    const [file] = readdirSync(directory);
    writeFileSync(join(directory, file ?? ''), '{not json');

    expect(await clips.read(key)).toBeNull();
  });
});
