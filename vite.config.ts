/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

/**
 * KaTeX and Fontsource ship fonts as woff2 + woff (+ ttf); every target browser
 * reads woff2, so drop the rest before they get inlined into the single file.
 */
const woff2Only = (): Plugin => ({
  name: 'woff2-only',
  enforce: 'pre',
  transform(code, id) {
    if (!/(katex(\.min)?|@fontsource\/.*)\.css/.test(id)) return null;
    return code.replace(/,\s*url\([^)]*\.(woff|ttf)\)\s*format\(["'](woff|truetype)["']\)/g, '');
  },
});

// Everything (JS, CSS, KaTeX fonts) is inlined into one offline dist/index.html.
export default defineConfig({
  base: './',
  plugins: [woff2Only(), react(), tailwindcss(), viteSingleFile()],
  build: {
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
