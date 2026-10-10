import type { RenderSymbolImage } from '../src/lib/generic/symbols/symbol-images';

// Storybook's dev server draws SF Symbols on macOS; elsewhere it answers empty and the cell stays blank.
export const renderStorybookSymbol: RenderSymbolImage = async ({
  name,
  pointSize,
}) => {
  const response = await fetch(
    `/__sf-symbol?name=${encodeURIComponent(name)}&pointSize=${pointSize}`,
  );
  if (response.status !== 200) return null;
  const image = await response.blob();
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (): void =>
      resolve(typeof reader.result === 'string' ? reader.result : null);
    reader.onerror = (): void => resolve(null);
    reader.readAsDataURL(image);
  });
};
