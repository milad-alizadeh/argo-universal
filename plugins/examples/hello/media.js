import {
  Audio,
  ScrollView,
  Stack,
  Surface,
  Text,
  Video,
  useEffect,
  useState,
} from '@argo/plugin-kit';

// The Server resolves each file to a reference; the App streams it from the Server, never from the Plugin.
const resolveMedia = async (assets) => {
  const [clip, poster, chime] = await Promise.all([
    assets.resolve({ asset: 'assets/clip.mp4' }),
    assets.resolve({ asset: 'assets/poster.jpeg' }),
    assets.resolve({ asset: 'assets/chime.mp3' }),
  ]);

  return { clip, poster, chime };
};

export const helloMedia = (assets) =>
  function HelloMedia() {
    const [media, setMedia] = useState(null);

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

function MediaStack({ media }) {
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
