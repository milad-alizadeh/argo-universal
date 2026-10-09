import type { Services } from '../src/services/services';
export { startRouterTestHost } from './router';

export const mockUpload: Services['blob']['upload'] = async (file) => ({
  blobId: await file.text(),
  mime: file.type || 'application/octet-stream',
  bytes: file.size,
});

type ServiceOverrides = { [Name in keyof Services]?: Partial<Services[Name]> };

const createUnexpectedCallRejection =
  (procedure: string): (() => never) =>
  (): never => {
    throw new Error(`Unexpected call to ${procedure}`);
  };

// Services whose every method throws, except the ones a test gives.
export function createRejectingServices(
  overrides: ServiceOverrides = {},
): Services {
  return {
    blob: {
      upload: createUnexpectedCallRejection('blob.upload'),
      ...overrides.blob,
    },
  };
}
