import type { Metadata } from 'next';
import { ResultsScreen } from '@/components/ResultsScreen';

export const metadata: Metadata = { title: 'Landed — Off the Map' };

export default function Page() {
  return <ResultsScreen />;
}
