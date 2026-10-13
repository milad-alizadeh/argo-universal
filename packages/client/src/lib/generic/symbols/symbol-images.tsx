import type { SFSymbol } from 'expo-symbols';
import type * as React from 'react';
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react';

interface SymbolImageRequest {
  name: SFSymbol;
  pointSize: number;
}

// Draws an SF Symbol through the operating system and resolves to a PNG data URL, or null when it has no such symbol.
export type RenderSymbolImage = (
  request: SymbolImageRequest,
) => Promise<string | null>;

const SymbolImagesContext = createContext<RenderSymbolImage | null>(null);

export interface SymbolImagesProviderProps {
  render: RenderSymbolImage | undefined;
  children: ReactNode;
}

// The desktop app on macOS gives a renderer; everywhere else icons draw Material Symbols.
export function SymbolImagesProvider({
  render,
  children,
}: SymbolImagesProviderProps): React.JSX.Element {
  return (
    <SymbolImagesContext.Provider value={render ?? null}>
      {children}
    </SymbolImagesContext.Provider>
  );
}

export function useSymbolImageRenderer(): RenderSymbolImage | null {
  return useContext(SymbolImagesContext);
}

// A drawn symbol with its size in image pixels, so symbols drawn at one point size can share one scale.
export interface SymbolImage {
  url: string;
  width: number;
  height: number;
}

const pendingImages = new Map<string, Promise<SymbolImage | null>>();
const loadedImages = new Map<string, SymbolImage | null>();

function symbolKey({ name, pointSize }: SymbolImageRequest): string {
  return `${name}@${pointSize}`;
}

async function measureImage(url: string): Promise<SymbolImage> {
  const image = new Image();
  image.src = url;
  await image.decode();
  return { url, width: image.naturalWidth, height: image.naturalHeight };
}

// A failed render draws nothing, as an unknown symbol does.
function renderImage(
  render: RenderSymbolImage,
  request: SymbolImageRequest,
): Promise<SymbolImage | null> {
  return render(request)
    .then((url) => (url ? measureImage(url) : null))
    .catch(() => null);
}

function loadImage(
  render: RenderSymbolImage,
  request: SymbolImageRequest,
): Promise<SymbolImage | null> {
  const key = symbolKey(request);
  const pending =
    pendingImages.get(key) ??
    renderImage(render, request).then((image) => {
      loadedImages.set(key, image);
      return image;
    });
  pendingImages.set(key, pending);
  return pending;
}

function deliverUntilCancelled<T>(
  pending: Promise<T>,
  deliver: (value: T) => void,
): () => void {
  let current = true;
  void pending.then((value) => {
    if (current) deliver(value);
  });
  return (): void => {
    current = false;
  };
}

// Undefined until the image arrives, so the caller can hold the icon's box empty meanwhile.
export function useSymbolImage(
  render: RenderSymbolImage,
  request: SymbolImageRequest,
): SymbolImage | null | undefined {
  const { name, pointSize } = request;
  const key = symbolKey(request);
  const [image, setImage] = useState(() => loadedImages.get(key));
  useEffect(
    () =>
      deliverUntilCancelled(loadImage(render, { name, pointSize }), setImage),
    [render, name, pointSize],
  );
  return loadedImages.has(key) ? loadedImages.get(key) : image;
}
