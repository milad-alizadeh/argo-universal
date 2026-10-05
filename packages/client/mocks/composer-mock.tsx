import { newSessionInputs } from '@repo/api/mocks';
import { useState } from 'react';
import {
  Composer,
  type ComposerImage,
  type ComposerProps,
} from '../src/components/Composer';

const imageUri =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAIAAAD8GO2jAAAAKklEQVR4nGN4piFHU8QwasGoBaMWjFowasGoBaMWjFowasGoBaMWDBULANahsD1zXuJAAAAAAElFTkSuQmCC';

export const composerImages: ComposerImage[] = newSessionInputs.flatMap(
  ({ agent, prompt }) =>
    prompt.flatMap((block) =>
      block.type === 'image'
        ? [
            {
              id: `${agent}:image`,
              name: 'screenshot.png',
              uri: imageUri,
              bytes: block.blob.bytes,
            },
          ]
        : [],
    ),
);

const imageFromContract = composerImages[0];
if (!imageFromContract)
  throw new Error('New Session contract mock needs an image.');
export const oversizedComposerImage: ComposerImage = {
  ...imageFromContract,
  name: 'full-screen.png',
  bytes: 27 * 1024 * 1024,
};

export function ComposerMock(props: ComposerProps) {
  const [draft, setDraft] = useState(props.draft);
  return (
    <Composer
      {...props}
      draft={draft}
      onDraftChange={(next) => {
        setDraft(next);
        props.onDraftChange(next);
      }}
      onSend={(sent) => {
        props.onSend(sent);
        setDraft({ text: '', images: [] });
      }}
      onAttachImages={() => {
        const image = composerImages.find(
          (image) => !draft.images.some((attached) => attached.id === image.id),
        );
        if (image) setDraft({ ...draft, images: [...draft.images, image] });
        props.onAttachImages();
      }}
    />
  );
}
