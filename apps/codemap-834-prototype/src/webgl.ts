export function supportsWebGL(): boolean {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('webgl2');

  if (!context) return false;
  context.getExtension('WEBGL_lose_context')?.loseContext();

  return true;
}
