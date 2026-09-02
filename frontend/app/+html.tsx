import { ScrollViewStyleReset } from 'expo-router/html';
import type { ReactNode } from 'react';

// Web-only. Configures the root HTML document during static rendering, so this
// runs in Node and has no access to the DOM.
export default function Root({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />
        <meta name="theme-color" content="#06070B" />
        <meta name="color-scheme" content="dark" />
        <title>Studio Lab — AI video studio</title>

        {/* Keeps ScrollView behaviour on web close to native. */}
        <ScrollViewStyleReset />

        <style dangerouslySetInnerHTML={{ __html: rootStyles }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const rootStyles = `
:root { color-scheme: dark; }

html, body {
  background-color: #06070B;
  margin: 0;
}

body {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
  overscroll-behavior: none;
}

/* Slim, dark scrollbars so they don't break the glass aesthetic. */
* {
  scrollbar-width: thin;
  scrollbar-color: rgba(255,255,255,0.18) transparent;
}
*::-webkit-scrollbar { width: 10px; height: 10px; }
*::-webkit-scrollbar-track { background: transparent; }
*::-webkit-scrollbar-thumb {
  background-color: rgba(255,255,255,0.16);
  border-radius: 999px;
  border: 3px solid transparent;
  background-clip: content-box;
}
*::-webkit-scrollbar-thumb:hover { background-color: rgba(255,255,255,0.28); }

::selection { background: rgba(175,196,228,0.28); }

@media (prefers-reduced-motion: reduce) {
  * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
`;
