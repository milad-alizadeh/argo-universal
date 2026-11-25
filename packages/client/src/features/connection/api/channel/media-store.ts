import { memoryMedia, objectUrls } from './media-store-core';

// Web has no file system to write to, so what arrives is held in memory until the page closes. Native Apps keep files instead (`media-store.native.ts`).
const web = memoryMedia(objectUrls);

export const createMediaStore = web.store;

export const forgetServerMedia = web.forget;

export const rememberServerMedia = web.remember;
