# Product Context

## Purpose

This project aims to create a web application that serves Markdown documentation stored in a local `docs/` directory.

## Problem Solved

- Provides a user-friendly web interface to browse and read local Markdown documentation files.
- Eliminates the need for manual conversion of Markdown to HTML for viewing.
- Ensures the original Markdown files in the `docs/` directory remain untouched.
- Offers a simple way to view documentation without complex server setups or external dependencies for the end-user (once the application is running).

## How it Works

1.  The application monitors or scans the specified `docs/` directory (`/media/mu6mula/Data1/AI-Stuff/Markdown-Web-Docs/docs`).
2.  It reads the Markdown files found within that directory.
3.  It converts the Markdown content to HTML dynamically or during a build step.
4.  It presents the HTML content through a web server, providing a navigation structure based on the `docs/` directory hierarchy.
5.  Users access the documentation through their web browser via the application's local URL.