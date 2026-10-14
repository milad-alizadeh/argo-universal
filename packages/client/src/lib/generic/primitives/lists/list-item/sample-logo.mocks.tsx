import type * as React from 'react';
import { Image } from 'react-native';

// A stand-in for an Agent's logo: a blue disc, 48 pixels square.
const sampleLogoUri =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAArUlEQVR42u2auxHAIAxD2SijZXCGIGWqXPjI2BbSHTXvVYBMKcqb666tZ6WEDiezCu4mggbfJmINbiqyGx4q4QUPkfCGX5KIAj8lEQ1+WCK1QFT4bonUAtHhfyVQG3zFVMAS3EIELjCaUAKzgQl4wEMljhVARQISkIAEdA6ceRrrMkd1nU7/oKF4UqqVUDekZo6k3KWo1ykGHBQjJoohH8WYlWbQTfPVgOazh3ce16jpAIQ/8hkAAAAASUVORK5CYII=';

export function SampleLogo(): React.JSX.Element {
  return (
    <Image
      source={{ uri: sampleLogoUri }}
      accessibilityIgnoresInvertColors
      className="size-full"
    />
  );
}
