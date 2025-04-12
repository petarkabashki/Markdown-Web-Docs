# Tech Context

## Core Technology

- **Docsify.js:** The primary library used for rendering the documentation website. It handles fetching and displaying Markdown content client-side.

## Hosting Environment

- **Simple HTTP Server:** A basic HTTP server (e.g., Python's `http.server`, `npx serve`, or similar) is required to serve the static `index.html` file of the Docsify app and the Markdown files from the `docs/` directory.
- **No Build Step:** Docsify operates directly on Markdown files, so no compilation or build process is necessary for the documentation content itself.

## Constraints

- The existing `docs/` directory structure and content should remain unmodified.