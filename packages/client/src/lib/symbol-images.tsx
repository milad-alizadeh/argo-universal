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

const pendingImages = new Map<string, Promise<string | null>>();
const loadedImages = new Map<string, string | null>();

function symbolKey({ name, pointSize }: SymbolImageRequest): string {
  return `${name}@${pointSize}`;
}

// A failed render draws nothing, as an unknown symbol does.
function loadImage(
  render: RenderSymbolImage,
  request: SymbolImageRequest,
): Promise<string | null> {
  const key = symbolKey(request);
  const pending =
    pendingImages.get(key) ??
    render(request)
      .catch(() => null)
      .then((image) => {
        loadedImages.set(key, image);
        return image;
      });
  pendingImages.set(key, pending);
  return pending;
}

// Undefined until the image arrives, so the caller can hold the icon's box empty meanwhile.
export function useSymbolImage(
  render: RenderSymbolImage,
  request: SymbolImageRequest,
): string | null | undefined {
  const { name, pointSize } = request;
  const key = symbolKey(request);
  const [image, setImage] = useState(() => loadedImages.get(key));
  useEffect(() => {
    let current = true;
    void loadImage(render, { name, pointSize }).then((loaded) => {
      if (current) setImage(loaded);
    });
    return (): void => {
      current = false;
    };
  }, [render, name, pointSize]);
  return loadedImages.has(key) ? loadedImages.get(key) : image;
}
