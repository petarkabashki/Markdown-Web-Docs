# System Patterns

## Documentation Serving

- **Client-Side Rendering:** The application utilizes Docsify.js, which operates entirely in the user's browser. It fetches Markdown files (`.md`) dynamically as the user navigates and renders them into HTML.
- **Existing Content Directory:** The documentation source is the pre-existing `/media/mu6mula/Data1/AI-Stuff/Markdown-Web-Docs/docs` directory. The Docsify application reads directly from this directory without needing to copy or modify its contents.
- **No Backend Logic:** There is no server-side application logic required for rendering documentation. A simple static file server is sufficient to serve the main `index.html` and the contents of the `docs/` directory.