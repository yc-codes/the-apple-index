import { createFileRoute } from '@tanstack/react-router';
export const Route = createFileRoute('/api/$')({
  server: {
    handlers: {
      ANY: async ({ request }) => {
        const { handleRequest } = await import('../../server/data.ts');
        return handleRequest(request);
      },
    },
  },
});
