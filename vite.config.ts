/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

/** KaTeX ships every font as woff2 + woff + ttf; all target browsers read woff2, so drop the rest. */
const katexWoff2Only = (): Plugin => ({
  name: 'katex-woff2-only',
  enforce: 'pre',
  transform(code, id) {
    if (!/katex(\.min)?\.css/.test(id)) return null;
    return code.replace(/,\s*url\([^)]*\.(woff|ttf)\)\s*format\("(woff|truetype)"\)/g, '');
  },
});

// Everything (JS, CSS, KaTeX fonts) is inlined into one offline dist/index.html.
export default defineConfig({
  base: './',
  plugins: [katexWoff2Only(), react(), tailwindcss(), viteSingleFile()],
  build: {
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
