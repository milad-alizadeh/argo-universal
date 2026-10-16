const homeFolder = /^(\/Users\/[^/]+|\/home\/[^/]+)(?=\/|$)/;

// "/Users/milad/Developer/argo" reads as "~/Developer/argo"; a path outside a home folder stays whole.
export const homePath = (path: string): string => path.replace(homeFolder, '~');
