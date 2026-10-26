import type { Metadata } from 'next';
import { LogbookScreen } from '@/components/LogbookScreen';

export const metadata: Metadata = { title: 'Logbook — Off the Map' };

export default function Page() {
  return <LogbookScreen />;
}
