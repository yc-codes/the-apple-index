import { createFileRoute, notFound, Outlet } from '@tanstack/react-router';
import { getProduct } from '../data';
import { familyById } from '../../server/families';
export const Route = createFileRoute('/products/$productId')({
  loader: async ({ params }) => {
    const product = await getProduct(params.productId);
    if (!product && !familyById[params.productId]) throw notFound();
    return product;
  },
  component: Outlet,
});
