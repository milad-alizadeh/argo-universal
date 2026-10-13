import { isPlainText, isPromptImage } from '@repo/contracts';
import { getDocumentAsync } from 'expo-document-picker';
import { File } from 'expo-file-system';
import { launchImageLibraryAsync } from 'expo-image-picker';
import type { PickedAttachment } from '../state/attachment-draft';

interface ChosenFile {
  key: string;
  name: string;
  uri: string;
  bytes: number;
  mimeType: string;
  file: Blob;
}

// A file that reads as plain text shows its first lines, by the rule the Engine inlines it by.
const previewBytes = 2048;
// Cutting the file can split its last character.
const splitLastCharacter = /\uFFFD$/u;

let picked = 0;

async function readPreview(chosen: ChosenFile): Promise<string | undefined> {
  if (isPromptImage(chosen.mimeType)) return undefined;
  const start = await chosen.file.slice(0, previewBytes).text();
  const preview = start.replace(splitLastCharacter, '');
  return isPlainText(preview) ? preview : undefined;
}

async function toPickedAttachment(
  chosen: ChosenFile,
): Promise<PickedAttachment> {
  picked += 1;
  return {
    attachment: {
      id: `${chosen.key}#${picked}`,
      name: chosen.name,
      uri: chosen.uri,
      bytes: chosen.bytes,
      mimeType: chosen.mimeType,
      preview: await readPreview(chosen).catch((): undefined => undefined),
    },
    file: chosen.file,
  };
}

interface PickerAsset {
  uri: string;
  mimeType?: string | null;
  file?: Blob;
}

type Described = Pick<ChosenFile, 'key' | 'name'> & { bytes?: number | null };

// The browser gives its own File; Expo's fetch rejects React Native `{uri}` FormData parts, so native sends an expo-file-system File.
function fromPicker<Asset extends PickerAsset>(
  assets: readonly Asset[],
  describe: (asset: Asset, file: File | Blob) => Described,
): Promise<PickedAttachment[]> {
  return Promise.all(
    assets.map((asset) => {
      const file = asset.file ?? new File(asset.uri);
      const { key, name, bytes } = describe(asset, file);
      const mimeType = asset.mimeType ?? file.type;
      const size = bytes ?? file.size;
      return toPickedAttachment({
        key,
        name,
        uri: asset.uri,
        bytes: size,
        mimeType,
        file,
      });
    }),
  );
}

// Opens the photo library, or the browser's file chooser, and returns none when the user cancels.
export async function pickImages(): Promise<PickedAttachment[]> {
  const result = await launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    quality: 1,
  });
  if (result.canceled) return [];
  return fromPicker(result.assets, (asset, file) => ({
    key: asset.assetId ?? asset.uri,
    name: asset.fileName ?? ('name' in file ? file.name : 'Image'),
    bytes: asset.fileSize,
  }));
}

export async function pickFiles(): Promise<PickedAttachment[]> {
  const result = await getDocumentAsync({ multiple: true, base64: false });
  if (result.canceled) return [];
  return fromPicker(result.assets, (asset) => ({
    key: asset.uri,
    name: asset.name,
    bytes: asset.size,
  }));
}

export function droppedFiles(
  files: readonly globalThis.File[],
): Promise<PickedAttachment[]> {
  return Promise.all(
    files.map((file) =>
      toPickedAttachment({
        key: file.name,
        name: file.name,
        uri: URL.createObjectURL(file),
        bytes: file.size,
        mimeType: file.type,
        file,
      }),
    ),
  );
}
