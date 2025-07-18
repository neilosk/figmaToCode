# MCP Integration Guide

This guide explains how to set up and use the MCP (Model Context Protocol) preview system for stable React component rendering.

## What We Built

We've created an MCP server that solves the preview stability issues by:

1. **Context Chunking**: Breaks large code into manageable pieces for Claude Desktop
2. **Intelligent Prompting**: Creates focused prompts that handle Claude's token limitations
3. **Fallback System**: Maintains the original preview system as backup
4. **Stable Rendering**: Uses Claude's proven artifact system for consistent results

## Files Added

### MCP Server (`/mcp-preview-server/`)
- `src/index.ts` - Main MCP server implementation
- `src/context-chunker.ts` - Handles code chunking and prompt generation
- `src/preview-manager.ts` - Manages preview storage and URLs
- `package.json` - Dependencies and scripts
- `claude-desktop-config.json` - Configuration for Claude Desktop

### Integration Files
- `app/api/mcp-preview/route.ts` - API route for MCP communication
- Updated `app/page.tsx` - Added MCP preview functionality

## How It Works

### 1. **User Flow**
1. User generates code with any AI provider (Claude, OpenAI, Gemini)
2. User clicks "Preview" button
3. App sends code to MCP server
4. MCP server analyzes code and creates chunks
5. User gets a focused prompt optimized for Claude Desktop
6. User pastes prompt in Claude Desktop for stable rendering

### 2. **Context Chunking Strategy**
```typescript
// Code is broken into logical chunks:
- metadata: Component information
- imports: Import statements  
- types: TypeScript definitions
- styles: CSS content
- component: Main component code
```

### 3. **Claude Desktop Integration**
```json
{
  "mcpServers": {
    "figma-preview-renderer": {
      "command": "node",
      "args": ["dist/index.js"],
      "cwd": "/path/to/mcp-preview-server"
    }
  }
}
```

## Setup Instructions

### 1. **Install Dependencies**
```bash
cd mcp-preview-server
npm install
npm run build
```

### 2. **Test MCP Server**
```bash
node test-mcp.js
```

### 3. **Configure Claude Desktop**
1. Copy `claude-desktop-config.json` content
2. Add to your Claude Desktop configuration
3. Update the `cwd` path to match your setup

### 4. **Start Your App**
```bash
npm run dev
```

## Usage

### 1. **Generate Component**
- Use any AI provider to generate React components
- The MCP system works with all providers

### 2. **Preview with MCP**
- Click the "Preview" button
- Choose "OK" when prompted about MCP preview
- The focused prompt will be copied to your clipboard

### 3. **Claude Desktop Workflow**
1. Open Claude Desktop
2. Paste the focused prompt
3. If Claude asks for more context, say "continue"
4. Claude will generate a stable HTML preview

## Key Benefits

### **Stability**
- ✅ Consistent rendering across AI providers
- ✅ Handles complex components reliably
- ✅ No client-side processing issues

### **Context Management**
- ✅ Intelligent code chunking
- ✅ Handles Claude's token limitations
- ✅ Optimized prompts for multi-step building

### **Fallback System**
- ✅ Original preview system still works
- ✅ Graceful degradation if MCP fails
- ✅ User always gets a preview

## Troubleshooting

### **MCP Server Issues**
```bash
# Check if MCP server builds
npm run build

# Test MCP server
node test-mcp.js

# Check logs
npm run dev
```

### **Claude Desktop Issues**
1. Verify `claude-desktop-config.json` is correctly configured
2. Check that the MCP server path is correct
3. Restart Claude Desktop after configuration changes

### **Preview Issues**
1. MCP preview failing → Falls back to original system
2. Check browser console for error messages
3. Verify API routes are accessible

## Advanced Configuration

### **Custom Chunking**
```typescript
// Modify context-chunker.ts
private readonly DEFAULT_MAX_CHUNK_SIZE = 6000; // Smaller chunks
```

### **Custom Prompts**
```typescript
// Modify createFocusedPrompt in context-chunker.ts
// Add your own prompt templates
```

### **Preview Styling**
```typescript
// Modify preview-manager.ts
// Customize the HTML template
```

## Development Notes

### **Claude Desktop Context Limitations**
- Claude Desktop often requires "continue" prompts for large contexts
- Our chunking system handles this automatically
- Each chunk is optimized for Claude's processing

### **AI Provider Differences**
- Different providers generate slightly different code formats
- MCP normalizes these differences
- Chunking works consistently across providers

### **Future Enhancements**
- [ ] Direct MCP server integration with Claude Desktop
- [ ] Real-time preview updates
- [ ] Component variant handling
- [ ] Enhanced error recovery

## Support

If you encounter issues:
1. Check the console logs
2. Verify MCP server is running
3. Test with the simple test script
4. Check Claude Desktop configuration

The MCP integration provides a robust, stable alternative to client-side preview rendering while maintaining backward compatibility with your existing system.