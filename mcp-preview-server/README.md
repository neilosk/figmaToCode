# MCP Preview Server

A Model Context Protocol (MCP) server for stable React component preview rendering.

## Overview

This MCP server provides a stable alternative to client-side component rendering by leveraging Claude's artifact system. It handles context chunking and incremental building to work around Claude Desktop's token limitations.

## Features

- **Stable Rendering**: Uses Claude's proven artifact rendering system
- **Context Chunking**: Handles large code contexts by breaking them into manageable pieces
- **Incremental Building**: Supports multi-step component generation
- **Multiple AI Provider Support**: Normalizes code from different AI providers
- **Persistent Previews**: Generates stable URLs for rendered components

## Architecture

```
Figma-to-Code App → MCP Server → Claude Desktop → Artifact Preview
```

## Context Management Strategy

To handle Claude Desktop's context limitations:

1. **Code Preprocessing**: Clean and normalize code before sending to Claude
2. **Chunked Requests**: Break large contexts into smaller pieces
3. **Incremental Building**: Use multi-step process for complex components
4. **Retry Logic**: Automatically handle "continue" scenarios

## Installation

```bash
npm install @modelcontextprotocol/sdk
node mcp-server.js
```

## Usage

The MCP server exposes these tools:

- `render_component_preview`: Render a React component
- `get_preview_status`: Check rendering status
- `get_preview_url`: Get stable preview URL