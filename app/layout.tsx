import type { Metadata, Viewport } from 'next';
import { Barlow_Condensed, IBM_Plex_Mono, IBM_Plex_Sans } from 'next/font/google';
import { InkFilter } from '@/components/InkFilter';
import './tokens.css';
import './otm.css';
import './app.css';

const flap = Barlow_Condensed({ subsets: ['latin'], weight: ['500', '600', '700', '800'], variable: '--ff-flap', display: 'swap' });
const mono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--ff-mono', display: 'swap' });
const sans = IBM_Plex_Sans({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--ff-sans', display: 'swap' });

export const metadata: Metadata = {
  title: 'Off the Map — daily geography departures',
  description: 'Seven stops a day. Twenty seconds each. Rare answers travel farther. A perfect flight is 40,075 km.',
  applicationName: 'Off the Map',
  appleWebApp: { capable: true, title: 'Off the Map', statusBarStyle: 'black-translucent' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#121417',
  colorScheme: 'dark',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${flap.variable} ${mono.variable} ${sans.variable}`}>
      <body>
        <InkFilter />
        <div className="otm-app">{children}</div>
      </body>
    </html>
  );
}
