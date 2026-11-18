export const firstBrowseTimeoutMs = 4000;

const laterBrowseTimeoutMs = 3000;

export const browseTimeoutMs = (firstBrowse: boolean | undefined): number =>
  firstBrowse ? firstBrowseTimeoutMs : laterBrowseTimeoutMs;
