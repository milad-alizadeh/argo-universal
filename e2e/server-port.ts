const serverHost = '127.0.0.1';
export const serverUrlFor = (port: number): string =>
  `ws://${serverHost}:${port}`;
export const serverHttpUrl = (port: number): string =>
  `http://${serverHost}:${port}`;
