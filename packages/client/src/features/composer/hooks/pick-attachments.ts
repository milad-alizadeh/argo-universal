import {
  inlineTextLimitBytes,
  isPlainText,
  isPromptImage,
} from '@repo/contracts';
import { getDocumentAsync } from 'expo-document-picker';
import { File } from 'expo-file-system';
import { launchImageLibraryAsync } from 'expo-image-picker';
import type { PickedAttachment } from '../utils/attachment-draft';

interface ChosenFile {
  key: string;
  name: string;
  uri: string;
  bytes: number;
  mimeType: string;
  file: Blob;
}

// A file the Agent would read inline shows its first lines; Expo's native File can't slice, so it is read whole.
const previewCharacters = 2048;

let picked = 0;

function canPreview(chosen: ChosenFile): boolean {
  return (
    !isPromptImage(chosen.mimeType) && chosen.bytes <= inlineTextLimitBytes
  );
}

async function readPreview(chosen: ChosenFile): Promise<string | undefined> {
  if (!canPreview(chosen)) return;
  const text = await chosen.file.text();

  return isPlainText(text) ? text.slice(0, previewCharacters) : undefined;
}

async function toPickedAttachment(
  chosen: ChosenFile,
): Promise<PickedAttachment> {
  picked += 1;

  return {
    attachment: await attachmentDescription(chosen, picked),
    file: chosen.file,
  };
}

async function attachmentDescription(
  chosen: ChosenFile,
  occurrence: number,
): Promise<PickedAttachment['attachment']> {
  return {
    id: `${chosen.key}#${occurrence}`,
    name: chosen.name,
    uri: chosen.uri,
    bytes: chosen.bytes,
    mimeType: chosen.mimeType,
    preview: await readPreview(chosen).catch((): undefined => undefined),
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
  return Promise.all(assets.map((asset) => describePicked(asset, describe)));
}

function describePicked<Asset extends PickerAsset>(
  asset: Asset,
  describe: (asset: Asset, file: File | Blob) => Described,
): Promise<PickedAttachment> {
  const file = asset.file ?? new File(asset.uri);
  const { key, name, bytes } = describe(asset, file);

  return toPickedAttachment({
    key,
    name,
    uri: asset.uri,
    bytes: bytes ?? file.size,
    mimeType: pickerMime(asset, file),
    file,
  });
}

function imageName(file: File | Blob): string {
  return 'name' in file ? file.name : 'Image';
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
    name: asset.fileName ?? imageName(file),
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
  return Promise.all(files.map(droppedAttachment));
}

function droppedAttachment(file: globalThis.File): Promise<PickedAttachment> {
  return toPickedAttachment({
    key: file.name,
    name: file.name,
    uri: URL.createObjectURL(file),
    bytes: file.size,
    mimeType: file.type,
    file,
  });
}

function pickerMime(asset: PickerAsset, file: File | Blob): string {
  return asset.mimeType ?? file.type;
}
