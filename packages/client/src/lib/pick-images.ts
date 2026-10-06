import { File } from 'expo-file-system';
import { launchImageLibraryAsync } from 'expo-image-picker';
import type { ComposerImage } from '#components/Composer';

export interface PickedImage {
  image: ComposerImage;
  file: Blob;
}

let picked = 0;

// Opens the photo library, or the browser's file chooser, and returns none when the user cancels.
export async function pickImages(): Promise<PickedImage[]> {
  const result = await launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    quality: 1,
  });
  if (result.canceled) return [];
  return result.assets.map((asset) => {
    // The browser gives its own File; Expo's fetch rejects React Native `{uri}` FormData parts, so native sends an expo-file-system File.
    const file = asset.file ?? new File(asset.uri);
    picked += 1;
    return {
      image: {
        id: `${asset.assetId ?? asset.uri}#${picked}`,
        name: asset.fileName ?? file.name ?? 'Image',
        uri: asset.uri,
        bytes: asset.fileSize ?? file.size,
      },
      file,
    };
  });
}
