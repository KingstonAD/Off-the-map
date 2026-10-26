import type { NextConfig } from 'next';

const config: NextConfig = {
  // Flight files and share-card fonts are read from disk at runtime; ship them with every function.
  outputFileTracingIncludes: {
    '/**': ['./data/**/*.json', './assets/fonts/*.ttf'],
  },
};

export default config;
