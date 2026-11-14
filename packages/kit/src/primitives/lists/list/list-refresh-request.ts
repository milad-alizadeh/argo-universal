import { useListRequest, type ListRequest } from './list-request';

const failure = {
  title: "Couldn't refresh",
  message: 'Pull down to try again.',
};

export const useListRefreshRequest = (): ListRequest => useListRequest(failure);
