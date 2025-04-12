# Markdown Web Docs

A local web server for viewing Markdown documentation with a dynamic sidebar, breadcrumbs, and diagram support.

## Features

- Dynamically generates a sidebar based on the directory structure of the documentation source.
- Renders Markdown content to HTML using `marked`.
- Provides breadcrumbs for easy navigation.
- Supports rendering Mermaid diagrams embedded in Markdown files.
- Optionally supports rendering DOT/Graphviz diagrams (client-side or with post-processing).
- Accepts a command-line argument to specify the documentation directory (defaults to `./docs`).

## Prerequisites

- Node.js and npm must be installed on your system.

## Installation

```bash
npm install
```

## Usage

### Running the Server (Default Directory)

To start the server and serve documentation from the default `./docs` directory:

```bash
npm start
```

### Specifying a Custom Documentation Directory

To serve documentation from a different directory:

```bash
npm start path/to/your/markdown/files
```

### Development Mode

For development with automatic server restarts on file changes:

```bash
npm run dev
```

The server will be available at `http://localhost:3000`.

## How it Works

This application scans the specified directory for Markdown (`.md`) files, generates a dynamic sidebar for navigation, converts the Markdown content to HTML using a template (`template.html`), and handles rendering of Mermaid and DOT diagrams within the documentation.

## Dependencies

- `express`: Web server framework.
- `marked`: Markdown to HTML converter.
- `mermaid`: Diagram rendering library.
- `fs-extra`: File system utilities.
- `@viz-js/viz`: Graphviz/DOT rendering (optional, for server-side rendering).
- `yargs`: Command-line argument parsing.

## License

This project is licensed under the ISC License.
