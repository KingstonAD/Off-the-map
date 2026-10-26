import type { Metadata } from 'next';
import { PlayScreen } from '@/components/PlayScreen';

export const metadata: Metadata = { title: 'In flight — Off the Map' };

export default function Page() {
  return <PlayScreen />;
}
