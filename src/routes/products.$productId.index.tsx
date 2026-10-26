import { createFileRoute } from '@tanstack/react-router';
import { ProductPage } from '../components/product';
export const Route = createFileRoute('/products/$productId/')({ component: Page });
function Page() {
  const { productId } = Route.useParams();
  return <ProductPage id={productId} />;
}
