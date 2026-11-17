import { useQueryClient } from '@tanstack/react-query';
import { useTRPCClient } from '#features/connection';
import type { PageAddresses } from '../utils/page-addresses';
import { pageAddressesFor } from '../utils/page-addresses-registry';

// The App's Page addresses on the connected Server, drawn through `plugins.draw` and followed live through `plugins.live`. Every caller under one Connection shares them.
export function usePageAddresses(): PageAddresses {
  return pageAddressesFor(useQueryClient(), useTRPCClient());
}
