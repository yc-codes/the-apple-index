import { createFileRoute } from '@tanstack/react-router';
import { ProductPage } from '../components/product';
export const Route = createFileRoute('/products/$productId/$variantId')({ component: Page });
function Page() {
  const { productId, variantId } = Route.useParams();
  return <ProductPage id={productId} variantId={variantId} />;
}
