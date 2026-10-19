import {
  Audio,
  ScrollView,
  Stack,
  Surface,
  Text,
  Video,
  useEffect,
  useState,
  type Argo,
  type PluginProps,
} from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';

type Assets = Argo['assets'];

type Asset = Awaited<ReturnType<Assets['resolve']>>;

type Resolved = { clip: Asset; poster: Asset; chime: Asset };

type Media = {
  clip: PluginProps['Video']['source'];
  poster: NonNullable<PluginProps['Video']['poster']>;
  chime: PluginProps['Audio']['source'];
};

// The Server takes each format from the file's extension, so the files below always pass.
const isMedia = (media: Resolved): media is Resolved & Media =>
  media.clip.format === 'mp4' &&
  media.poster.format === 'jpeg' &&
  media.chime.format === 'mp3';

// The Server resolves each file to a reference; the App streams it from the Server, never from the Plugin.
const resolveMedia = async (assets: Assets): Promise<Media | null> => {
  const [clip, poster, chime] = await Promise.all([
    assets.resolve({ asset: 'assets/clip.mp4' }),
    assets.resolve({ asset: 'assets/poster.jpeg' }),
    assets.resolve({ asset: 'assets/chime.mp3' }),
  ]);

  const media = { clip, poster, chime };

  return isMedia(media) ? media : null;
};

export const helloMedia = (assets: Assets): (() => JSX.Element) =>
  function HelloMedia() {
    const [media, setMedia] = useState<Media | null>(null);

    useEffect(() => {
      void resolveMedia(assets).then(setMedia);
    }, []);

    return (
      <ScrollView>
        <Surface kind="background" padding={4}>
          {media ? <MediaStack media={media} /> : <Text>Loading media</Text>}
        </Surface>
      </ScrollView>
    );
  };

function MediaStack({ media }: { media: Media }): JSX.Element {
  return (
    <Stack direction="column" gap={4}>
      <Video
        source={media.clip}
        poster={media.poster}
        accessibilityLabel="Hello clip"
      />
      <Audio source={media.chime} accessibilityLabel="Hello chime" />
    </Stack>
  );
}
