import katex from 'katex';
import { useMemo } from 'react';

/**
 * Renders a TeX string with KaTeX (offline: fonts are inlined into the build).
 * Only \htmlData is trusted, so symbols can carry a data-sym attribute that
 * opens their glossary entry when clicked.
 */
export function Formula({ tex, display = false }: { tex: string; display?: boolean }) {
  const html = useMemo(
    () =>
      katex.renderToString(tex, {
        displayMode: display,
        throwOnError: false,
        output: 'html',
        strict: false,
        trust: (ctx) => ctx.command === '\\htmlData',
      }),
    [tex, display],
  );
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}
