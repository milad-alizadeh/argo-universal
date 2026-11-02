// The harness is Node and so writes no Origin; it speaks to the Server as the desktop App's page, whose Origin the Server serves and no other page can write (#1696).
export const asTheApp = { origin: 'app://app' };
