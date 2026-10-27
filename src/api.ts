import { getRouteApi } from '@tanstack/react-router';
export const useMeta = () => ({ data: getRouteApi('__root__').useLoaderData() });
export const useListing = () => ({ data: getRouteApi('/').useLoaderData() });
export const useProduct = () => ({ data: getRouteApi('/products/$productId').useLoaderData() });
