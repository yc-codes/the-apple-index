import { useQuery } from '@tanstack/react-query';
import type { Listing, Meta, Product } from './types';
async function api<T>(path: string): Promise<T> {
  const response = await fetch(path);
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || 'Data is temporarily unavailable.');
  return body;
}
export const useMeta = () =>
  useQuery({ queryKey: ['meta'], queryFn: () => api<Meta>('/api/meta') });
export const useListing = () =>
  useQuery({
    queryKey: ['products'],
    queryFn: () => api<Listing>('/api/products'),
    refetchInterval: (query) => (query.state.data?.ready ? false : 60_000),
  });
export const useProduct = (id: string) =>
  useQuery({
    queryKey: ['product', id],
    queryFn: () => api<Product>('/api/products/' + encodeURIComponent(id)),
  });
