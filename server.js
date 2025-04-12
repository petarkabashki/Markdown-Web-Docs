const express = require('express');
const fs = require('fs').promises; // Use promise-based fs
const path = require('path');
const { marked } = require('marked'); // Import marked
const { instance } = require('@viz-js/viz'); // Import viz.js for DOT rendering

const app = express();
const port = 3000;

let docsDir; // Declare docsDir here, will be set in the async IIFE


// Async IIFE to handle argument parsing and directory validation
(async () => {
  // Get docs directory from command line argument or use default
  const args = process.argv.slice(2); // Get arguments after node executable and script path
  let docsDirInput = args[0];

  if (!docsDirInput) {
    console.warn('Warning: Documentation directory not provided as an argument. Using default: ./docs');
    docsDirInput = 'docs'; // Default to 'docs' in the current working directory if no arg provided
  }

  docsDir = path.resolve(docsDirInput); // Resolve to an absolute path and assign to the outer scope variable

  // Check if the provided directory exists
  try {
      const stats = await fs.stat(docsDir);
      if (!stats.isDirectory()) {
          console.error(`Error: Provided path is not a directory: ${docsDir}`);
          process.exit(1); // Exit if not a directory
      }
      console.log(`Using documentation directory: ${docsDir}`);

      // Start the server only after docsDir is validated
      startServer();

  } catch (error) {
      if (error.code === 'ENOENT') {
          console.error(`Error: Documentation directory not found: ${docsDir}`);
      } else {
          console.error(`Error accessing documentation directory: ${docsDir}`, error);
      }
      process.exit(1); // Exit on error
  }
})();


// #%% Sidebar Generation Logic (Adapted from generate_sidebar.js)

/**
 * Converts a filename or directory name into a human-readable title.
 */
function formatName(name) { // Keep this helper function as it's still useful
  let title = name;
  if (title.toLowerCase().endsWith('.md')) {
    title = title.slice(0, -3);
  }
  title = title.replace(/^\d+_/, '');
  title = title.replace(/[-_]/g, ' ');
  title = title
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  return title;
}

/**
 * Recursively scans a directory and generates sidebar Markdown.
 * Generates links relative to the '/docs/' web route.
 */
async function generateSidebarMarkdown(currentDir, level, baseDocsDir) { // Renamed back
  let markdown = '';
  const indent = '  '.repeat(level); // Reintroduce indentation for Markdown

  try {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    const files = [];
    const dirs = [];

    for (const entry of entries) {
      if (entry.name.startsWith('.') || entry.name.startsWith('_')) {
        continue;
      }
      if (entry.isDirectory()) {
        dirs.push(entry.name);
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
        files.push(entry.name);
      }
    }

    dirs.sort();
    files.sort();

    // Process index/readme file first
    const indexFileIndex = files.findIndex(f => f.toLowerCase() === 'index.md' || f.toLowerCase() === 'readme.md');
    if (indexFileIndex !== -1) {
        const indexFileName = files.splice(indexFileIndex, 1)[0];
        const filePath = path.join(currentDir, indexFileName);
        // Calculate path relative to the base docs directory for the link URL
        const relativePath = path.relative(baseDocsDir, filePath);
        // Construct the web path
        const webPath = `/docs/${relativePath.replace(/\\/g, '/')}`;
        const title = formatName(path.basename(currentDir)); // Use parent dir name for index title
        markdown += `${indent}* [${title}](${webPath})\n`; // Revert to Markdown link
    }


    // Process other files
    for (const fileName of files) {
      const filePath = path.join(currentDir, fileName);
      const relativePath = path.relative(baseDocsDir, filePath);
      const webPath = `/docs/${relativePath.replace(/\\/g, '/')}`;
      const title = formatName(fileName);
      markdown += `${indent}* [${title}](${webPath})\n`; // Revert to Markdown link
    }

    // Process directories recursively
    for (const dirName of dirs) {
      const dirPath = path.join(currentDir, dirName);
      const title = formatName(dirName);
      // Add directory title (non-link)
      markdown += `${indent}* ${title}\n`; // Revert to non-link title
      markdown += await generateSidebarMarkdown(dirPath, level + 1, baseDocsDir); // Recursive call with original name
    }

  } catch (error) {
    console.error(`Error reading directory ${currentDir}:`, error);
  }

  return markdown; // Return Markdown string
}


// Function to get the dynamically generated sidebar HTML using the resolved docsDir
async function getSidebarHtml() {
    try {
        // Pass the resolved docsDir as both the starting point and the base directory
        const sidebarMd = await generateSidebarMarkdown(docsDir, 0, docsDir); // Call Markdown generator
        return marked(sidebarMd); // Re-add marked() processing
    } catch (error) {
        console.error(`Error generating sidebar HTML for ${docsDir}:`, error);
        return '<p>Error loading navigation.</p>'; // Return error message in HTML
    }
}


// #%% Express Setup

// Middleware to log requests
app.use((req, res, next) => {
    console.log(`Request received: ${req.method} ${req.url}`);
    next();
});

// Route to serve documentation pages using a named parameter for the file path
app.get('/docs/:filePath(.*)', async (req, res) => {
    // Get the captured file path from the route parameters
    const requestedPath = req.params.filePath || ''; // Use empty string if undefined
    // Construct the full path to the potential markdown file using the resolved docsDir
    let mdFilePath = path.join(docsDir, requestedPath);

    try {
        // Check if it's a directory, if so, look for index.md or README.md
        const stats = await fs.stat(mdFilePath);
        if (stats.isDirectory()) {
            const indexMdPath = path.join(mdFilePath, 'index.md');
            const readmeMdPath = path.join(mdFilePath, 'README.md');
            try {
                await fs.access(indexMdPath);
                mdFilePath = indexMdPath;
            } catch (err) {
                try {
                    await fs.access(readmeMdPath);
                    mdFilePath = readmeMdPath;
                } catch (err2) {
                     // If neither index.md nor README.md exists in the directory
                    res.status(404).send(`Cannot find index.md or README.md in directory: ${requestedPath}`);
                    return;
                }
            }
        } else if (!mdFilePath.endsWith('.md')) {
             // If it's a file but not a .md file, treat as not found for this route
             res.status(404).send(`Not a markdown file: ${requestedPath}`);
             return;
        }

        // Read the markdown file content
        const mdContent = await fs.readFile(mdFilePath, 'utf-8');

        // --- Custom Marked Renderer (Only for DOT now, if needed) ---
        // Let's remove the custom renderer for mermaid and handle it via post-processing.
        // We'll keep the viz instance logic separate for potential DOT rendering.
        let viz; // To hold the viz.js instance

        // Example: If you still needed custom DOT handling, it would look like this:
        // const renderer = new marked.Renderer();
        // renderer.code = (code, infostring, escaped) => {
        //   const lang = (infostring || '').match(/\S*/)[0];
        //   if (lang === 'dot' || lang === 'graphviz') {
        //     // Render DOT server-side using viz.js
        //     try {
        //       if (!viz) {
        //         // Initialize viz.js instance lazily...
        //         return `<pre><code class="language-dot">${code}</code></pre><p><em>DOT rendering placeholder.</em></p>`;
        //       }
        //       // ... rest of DOT logic
        //     } catch (e) { /* ... error handling ... */ }
        //   }
        //   // For non-DOT languages, fallback to default rendering behavior
        //   // This requires calling the base renderer's code method, which is complex.
        //   // Simpler: Don't use a custom renderer if default behavior is okay.
        //   // Let marked handle mermaid rendering by default.
        //   // We need to call the super method or similar, which marked might not expose easily.
        //   // SAFEST APPROACH: Use default marked rendering and post-process.
        // };
        // const options = { renderer }; // Pass renderer if using custom DOT handling


        // --- Asynchronous DOT Rendering Function (Keep if DOT is used) ---
        async function renderDotDiagrams(htmlContent) { // Keep this function if DOT support is needed
            // ... (existing DOT rendering logic remains the same) ...
            if (!viz) {
                try {
                    viz = await instance();
                } catch (e) {
                    console.error("Failed to initialize Viz.js:", e);
                    return htmlContent.replace(/<p><em>DOT rendering placeholder\.<\/em><\/p>/g, '<p><em>Error initializing DOT renderer.</em></p>');
                }
            }
            const dotRegex = /<pre><code class="language-dot">([\s\S]*?)<\/code><\/pre><p><em>DOT rendering placeholder\.<\/em><\/p>/g;
            let match;
            let processedHtml = htmlContent;
            const replacements = [];
            while ((match = dotRegex.exec(htmlContent)) !== null) {
                const fullMatch = match[0];
                const dotCode = match[1].replace(/</g, '<').replace(/>/g, '>');
                try {
                    const svg = viz.renderString(dotCode, { format: "svg" });
                    replacements.push({ placeholder: fullMatch, svg: svg });
                } catch (e) {
                    console.error("Error rendering DOT:", e);
                    replacements.push({ placeholder: fullMatch, svg: `<p><em>Error rendering DOT diagram.</em></p><pre><code>${match[1]}</code></pre>` });
                }
            }
            for (const rep of replacements) {
                processedHtml = processedHtml.replace(rep.placeholder, rep.svg);
            }
            return processedHtml;
        }


        // Parse markdown to HTML using default marked settings
        // Pass options only if using a custom renderer (e.g., for DOT)
        // let contentHtml = marked(mdContent, options);
        let contentHtml = marked(mdContent); // Use default renderer

        // --- Post-processing Step for Mermaid ---
        // Replace <pre><code class="language-mermaid">...</code></pre> with <div class="mermaid">...</div>
        const mermaidRegex = /<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g;
        contentHtml = contentHtml.replace(mermaidRegex, (match, mermaidCode) => {
            // Decode HTML entities that marked might have added
            const decodedCode = mermaidCode
                .replace(/</g, '<')
                .replace(/>/g, '>')
                .replace(/&/g, '&')
                .replace(/"/g, '"')
                .replace(/&#39;/g, "'");
            return `<div class="mermaid">${decodedCode}</div>`;
        });

        // Render DOT diagrams asynchronously (if needed)
        // contentHtml = await renderDotDiagrams(contentHtml); // Uncomment if DOT support is active


        // Get sidebar HTML
        const sidebarHtml = await getSidebarHtml();

        // Generate Breadcrumbs
        let breadcrumbHtml = '<a href="/">Home</a>'; // Start with Home link
        const pathSegments = requestedPath.split('/').filter(segment => segment); // Split and remove empty segments
        let currentPath = '';
        pathSegments.forEach((segment, index) => {
            currentPath += (currentPath ? '/' : '') + segment;
            const title = formatName(segment);
            if (index < pathSegments.length - 1 || mdFilePath.endsWith('index.md') || mdFilePath.endsWith('README.md')) {
                // Link for intermediate segments or if the final segment is a directory index
                breadcrumbHtml += ` / <a href="/docs/${currentPath}">${title}</a>`;
            } else {
                // Last segment (the actual file) is just text
                breadcrumbHtml += ` / <span>${title}</span>`;
            }
        });


        // Read the HTML template
        const templatePath = path.join(__dirname, 'template.html'); // Assume template is in the same directory
        let templateHtml = await fs.readFile(templatePath, 'utf-8');

        // Replace placeholders in the template
        templateHtml = templateHtml.replace('{{TITLE}}', path.basename(mdFilePath, '.md'));
        templateHtml = templateHtml.replace('{{SIDEBAR_HTML}}', sidebarHtml);
        templateHtml = templateHtml.replace('{{BREADCRUMB_HTML}}', breadcrumbHtml);
        templateHtml = templateHtml.replace('{{CONTENT_HTML}}', contentHtml);

        res.send(templateHtml);

    } catch (error) {
        console.error(`Error processing request for ${requestedPath}:`, error);
        if (error.code === 'ENOENT') {
            res.status(404).send(`Documentation file not found: ${requestedPath}`);
        } else {
            res.status(500).send('Internal Server Error');
        }
    }
});

// Root route - redirect to a default page or show a welcome message
app.get('/', (req, res) => {
    // Redirect to the aider index page as a default, for example
    res.redirect('/docs/aider/');
});

// Function to start the server (called after docsDir is validated)
function startServer() {
    app.listen(port, () => {
        console.log(`Markdown documentation server listening at http://localhost:${port}`);
        console.log(`Serving docs from: ${docsDir}`);
    });
}
