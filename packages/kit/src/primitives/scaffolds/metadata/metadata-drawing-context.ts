import { createContext, use } from 'react';
import { Platform } from 'react-native';
import { useInList } from '../../../list-look-context';
import {
  metadataDrawing,
  type MetadataDrawing,
  type MetadataFacts,
  type MetadataPlatform,
  type MetadataWidth,
} from './metadata-drawing';

export const currentPlatform: MetadataPlatform =
  Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : 'web';

/*
 * What Metadata is told from outside and what it tells its fields. A Detail's columns set the width; the Metadata
 * root resolves its drawing from it and passes both on to its fields.
 */
interface MetadataScene {
  width: MetadataWidth;
  drawing?: MetadataDrawing;
}

export const MetadataSceneContext = createContext<MetadataScene>({
  width: 'column',
});

export function useMetadataFacts(): MetadataFacts {
  const { width } = use(MetadataSceneContext);

  return { platform: currentPlatform, inList: useInList(), width };
}

// The drawing of the Metadata a field sits in; a field outside any draws as Metadata alone in its column does.
export function useMetadataDrawing(): MetadataDrawing {
  const { drawing, width } = use(MetadataSceneContext);

  return (
    drawing ??
    metadataDrawing({ platform: currentPlatform, inList: false, width })
  );
}
