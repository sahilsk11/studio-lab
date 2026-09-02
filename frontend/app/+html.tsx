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
        <meta name="theme-color" content="#FBF8EF" />
        <meta name="color-scheme" content="light" />
        <title>Reel — start to video</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700;12..96,800&family=IBM+Plex+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />

        {/* Keeps ScrollView behaviour on web close to native. */}
        <ScrollViewStyleReset />

        <style dangerouslySetInnerHTML={{ __html: rootStyles }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const rootStyles = `
:root { color-scheme: light; }

html, body {
  background-color: #FBF8EF;
  margin: 0;
}

body {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
  overscroll-behavior: none;
}

/* Quiet scrollbars that sit naturally on the paper canvas. */
* {
  scrollbar-width: thin;
  scrollbar-color: #CDC1B2 transparent;
}
*::-webkit-scrollbar { width: 10px; height: 10px; }
*::-webkit-scrollbar-track { background: transparent; }
*::-webkit-scrollbar-thumb {
  background-color: #CDC1B2;
  border-radius: 999px;
  border: 3px solid transparent;
  background-clip: content-box;
}
*::-webkit-scrollbar-thumb:hover { background-color: #A99C8C; }

::selection { background: rgba(217,91,56,0.22); }
`;
