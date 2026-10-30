/*
 * What a drawn story leaves on the page, read twice over: the DOM it built and the pixels it painted.
 * A DOM hash alone misses a portal and a computed style, so the pixels travel beside it.
 */
import { page } from 'vitest/browser';
import type { RenderNode } from '../../tools/story-render-rules.mts';

const HEX = 16;

const BYTE_DIGITS = 2;

/* Long enough for the 150ms state-tint fade and a Reanimated entry to come to rest. */
const SETTLE_MS = 400;

const unstableAttributes = new Set([
  'id',
  'for',
  'aria-controls',
  'aria-labelledby',
  'aria-describedby',
  'aria-activedescendant',
]);

const skippedTags = new Set(['STYLE', 'SCRIPT', 'LINK', 'TEMPLATE']);

const generatedId = /:r[\da-z]+:/g;

export const elementChildren = (element: Element): Element[] =>
  [...element.children].filter(
    (child): boolean => !skippedTags.has(child.tagName),
  );

const attributePair = (element: Element, name: string): string[] =>
  unstableAttributes.has(name)
    ? []
    : [
        `${name}=${(element.getAttribute(name) ?? '').replaceAll(generatedId, '')}`,
      ];

const attributeText = (element: Element): string =>
  element
    .getAttributeNames()
    .sort()
    .flatMap((name): string[] => attributePair(element, name))
    .join('|');

const ownText = (element: Element): string =>
  [...element.childNodes]
    .flatMap((child): string[] =>
      child.nodeType === Node.TEXT_NODE
        ? [(child.textContent ?? '').trim()]
        : [],
    )
    .join(' ');

export const serialize = (element: Element): RenderNode => ({
  tag: element.tagName,
  attributes: attributeText(element),
  text: ownText(element),
  children: elementChildren(element).map(serialize),
});

export const hashOf = async (value: string): Promise<string> => {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(value),
  );

  return [...new Uint8Array(digest)]
    .map((byte): string => byte.toString(HEX).padStart(BYTE_DIGITS, '0'))
    .join('');
};

const nextFrame = (): Promise<void> =>
  new Promise<void>((done): void => {
    requestAnimationFrame((): void => {
      requestAnimationFrame((): void => done());
    });
  });

const pause = (): Promise<void> =>
  new Promise<void>((done): void => {
    setTimeout(done, SETTLE_MS);
  });

/*
 * Back to the top before the camera: a `play` that opens a tall card scrolls the page, and a
 * screenshot is of the viewport, so two identical drawings read as two until the scroll is level.
 */
const rewind = (): void => {
  window.scrollTo(0, 0);

  for (const element of document.querySelectorAll('*')) element.scrollTop = 0;
};

export const settle = async (): Promise<void> => {
  await document.fonts.ready;
  rewind();
  await nextFrame();
  await pause();
};

export const pixelHash = async (): Promise<string> =>
  hashOf(await page.screenshot({ save: false, base64: true }));

export type ViewportPixels = { at: (x: number, y: number) => string };

const screenshotImage = async (): Promise<HTMLImageElement> => {
  const image = new Image();

  image.src = `data:image/png;base64,${await page.screenshot({ save: false, base64: true })}`;
  await image.decode();

  return image;
};

const imageContext = (image: HTMLImageElement): CanvasRenderingContext2D => {
  const canvas = document.createElement('canvas');

  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext('2d');

  if (!context) throw new Error('The render audit needs a 2D pixel reader.');
  context.drawImage(image, 0, 0);

  return context;
};

const pixelReader = (
  context: CanvasRenderingContext2D,
  scaleX: number,
  scaleY: number,
): ViewportPixels => ({
  at: (x, y): string =>
    [
      ...context.getImageData(
        Math.floor(x * scaleX),
        Math.floor(y * scaleY),
        1,
        1,
      ).data,
    ].join(','),
});

/* Decode the same viewport screenshot used by fingerprints, without a PNG dependency. */
export const viewportPixels = async (): Promise<ViewportPixels> => {
  const image = await screenshotImage();

  return pixelReader(
    imageContext(image),
    image.width / window.innerWidth,
    image.height / window.innerHeight,
  );
};
