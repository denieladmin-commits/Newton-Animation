import katex from 'katex';
import { useMemo } from 'react';

/** Renders a TeX string with KaTeX (offline: fonts are inlined into the build). */
export function Formula({ tex, display = false }: { tex: string; display?: boolean }) {
  const html = useMemo(
    () => katex.renderToString(tex, { displayMode: display, throwOnError: false, output: 'html' }),
    [tex, display],
  );
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}
