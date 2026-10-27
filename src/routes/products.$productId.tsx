import { createFileRoute, notFound, Outlet } from '@tanstack/react-router';
import { getProduct } from '../data';
import { familyById } from '../../server/families';
export const Route = createFileRoute('/products/$productId')({
  loader: ({ params }) => {
    if (!familyById[params.productId]) throw notFound();
    return getProduct(params.productId);
  },
  component: Outlet,
});
