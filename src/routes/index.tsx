import { createFileRoute } from '@tanstack/react-router';
import { Catalog } from '../components/catalog';
import { getListing } from '../data';
export const Route = createFileRoute('/')({ loader: getListing, component: Catalog });
