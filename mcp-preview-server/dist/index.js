#!/usr/bin/env node
/**
 * MCP Preview Server
 *
 * A Model Context Protocol server that provides stable React component
 * preview rendering by leveraging Claude's artifact system with intelligent
 * context chunking to handle token limitations.
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { ContextChunker } from './context-chunker.js';
import { PreviewManager } from './preview-manager.js';
// Server configuration
const SERVER_INFO = {
    name: 'figma-preview-renderer',
    version: '1.0.0',
    description: 'Stable React component preview rendering with context chunking'
};
// Initialize components
const contextChunker = new ContextChunker();
const previewManager = new PreviewManager();
// Create the MCP server
const server = new Server(SERVER_INFO, {
    capabilities: {
        tools: {},
    },
});
// Define available tools
const TOOLS = [
    {
        name: 'render_component_preview',
        description: 'Render a React component with intelligent context chunking for stable previews',
        inputSchema: {
            type: 'object',
            properties: {
                code: {
                    type: 'string',
                    description: 'The React component code to render'
                },
                componentName: {
                    type: 'string',
                    description: 'Name of the component'
                },
                framework: {
                    type: 'string',
                    enum: ['react', 'vue', 'angular'],
                    default: 'react',
                    description: 'Framework used for the component'
                },
                styling: {
                    type: 'string',
                    enum: ['tailwind', 'css', 'styled-components'],
                    default: 'tailwind',
                    description: 'Styling approach used'
                },
                files: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            name: { type: 'string' },
                            content: { type: 'string' },
                            type: { type: 'string' }
                        },
                        required: ['name', 'content', 'type']
                    },
                    description: 'Additional files (CSS, etc.)'
                },
                options: {
                    type: 'object',
                    properties: {
                        maxChunkSize: { type: 'number', default: 8000 },
                        useIncrementalBuilding: { type: 'boolean', default: true },
                        priority: { type: 'string', enum: ['fast', 'stable', 'comprehensive'], default: 'stable' }
                    },
                    description: 'Rendering options'
                }
            },
            required: ['code', 'componentName']
        }
    },
    {
        name: 'get_preview_status',
        description: 'Get the status of a preview rendering request',
        inputSchema: {
            type: 'object',
            properties: {
                previewId: {
                    type: 'string',
                    description: 'The preview ID returned from render_component_preview'
                }
            },
            required: ['previewId']
        }
    },
    {
        name: 'get_preview_url',
        description: 'Get the stable URL for a completed preview',
        inputSchema: {
            type: 'object',
            properties: {
                previewId: {
                    type: 'string',
                    description: 'The preview ID returned from render_component_preview'
                }
            },
            required: ['previewId']
        }
    },
    {
        name: 'analyze_code_complexity',
        description: 'Analyze code complexity and suggest optimal chunking strategy',
        inputSchema: {
            type: 'object',
            properties: {
                code: {
                    type: 'string',
                    description: 'The code to analyze'
                }
            },
            required: ['code']
        }
    }
];
// Handle tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: TOOLS
    };
});
// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
        switch (name) {
            case 'render_component_preview':
                return await handleRenderComponentPreview(args);
            case 'get_preview_status':
                return await handleGetPreviewStatus(args);
            case 'get_preview_url':
                return await handleGetPreviewUrl(args);
            case 'analyze_code_complexity':
                return await handleAnalyzeCodeComplexity(args);
            default:
                throw new Error(`Unknown tool: ${name}`);
        }
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
            content: [{
                    type: 'text',
                    text: `Error: ${errorMessage}`
                }],
            isError: true
        };
    }
});
/**
 * Handle component preview rendering with context chunking
 */
async function handleRenderComponentPreview(args) {
    const { code, componentName, framework = 'react', styling = 'tailwind', files = [], options = {} } = args;
    if (!code || !componentName) {
        throw new Error('Code and componentName are required');
    }
    // Create a unique preview ID
    const previewId = previewManager.generatePreviewId(componentName);
    // Analyze code and create chunks
    const chunks = contextChunker.chunkCode(code, componentName, files);
    // Create preview request
    const previewRequest = {
        id: previewId,
        componentName,
        framework,
        styling,
        chunks,
        files,
        options,
        status: 'processing',
        createdAt: new Date().toISOString()
    };
    // Store the preview request
    previewManager.storePreviewRequest(previewId, previewRequest);
    // Create focused prompt for Claude Desktop
    const focusedPrompt = contextChunker.createFocusedPrompt(chunks, 0);
    // Create artifact-style response
    const artifactResponse = createArtifactResponse(previewId, componentName, focusedPrompt, chunks);
    return {
        content: [{
                type: 'text',
                text: artifactResponse
            }]
    };
}
/**
 * Handle preview status requests
 */
async function handleGetPreviewStatus(args) {
    const { previewId } = args;
    if (!previewId) {
        throw new Error('previewId is required');
    }
    const preview = previewManager.getPreviewRequest(previewId);
    if (!preview) {
        throw new Error(`Preview not found: ${previewId}`);
    }
    return {
        content: [{
                type: 'text',
                text: JSON.stringify({
                    id: preview.id,
                    status: preview.status,
                    componentName: preview.componentName,
                    chunks: preview.chunks.length,
                    createdAt: preview.createdAt
                }, null, 2)
            }]
    };
}
/**
 * Handle preview URL requests
 */
async function handleGetPreviewUrl(args) {
    const { previewId } = args;
    if (!previewId) {
        throw new Error('previewId is required');
    }
    const preview = previewManager.getPreviewRequest(previewId);
    if (!preview) {
        throw new Error(`Preview not found: ${previewId}`);
    }
    const previewUrl = previewManager.getPreviewUrl(previewId);
    return {
        content: [{
                type: 'text',
                text: JSON.stringify({
                    previewId,
                    previewUrl,
                    status: preview.status,
                    componentName: preview.componentName
                }, null, 2)
            }]
    };
}
/**
 * Handle code complexity analysis
 */
async function handleAnalyzeCodeComplexity(args) {
    const { code } = args;
    if (!code) {
        throw new Error('code is required');
    }
    const chunks = contextChunker.chunkCode(code, 'AnalysisComponent');
    const analysis = {
        totalSize: code.length,
        totalChunks: chunks.length,
        chunkSizes: chunks.map(c => ({ type: c.type, size: c.size })),
        recommendedStrategy: chunks.length > 3 ? 'incremental' : 'single-pass',
        estimatedTokens: Math.ceil(code.length / 4), // Rough estimate
        claudeDesktopCompatible: chunks.length <= 5
    };
    return {
        content: [{
                type: 'text',
                text: JSON.stringify(analysis, null, 2)
            }]
    };
}
/**
 * Create an artifact-style response that Claude Desktop can work with
 */
function createArtifactResponse(previewId, componentName, focusedPrompt, chunks) {
    return `# React Component Preview Ready

🎯 **Preview ID**: \`${previewId}\`
🔧 **Component**: ${componentName}
📦 **Chunks**: ${chunks.length} parts
🚀 **Status**: Ready for Claude Desktop

## Optimized for Claude Desktop

This request has been optimized for Claude Desktop's context limitations:

- **Context Chunking**: Code split into ${chunks.length} manageable parts
- **Focused Prompts**: Each chunk has a specific purpose
- **Incremental Building**: Supports multi-step "continue" workflow
- **Artifact Ready**: Formatted for Claude's artifact system

## Next Steps

1. **Copy the prompt below** and paste it into Claude Desktop
2. **If Claude asks for more context**, use the chunked approach
3. **Each chunk builds on the previous** - this handles the "continue" scenarios
4. **Final result** will be a stable HTML preview

---

## Prompt for Claude Desktop

${focusedPrompt}

---

## Chunk Information

${chunks.map((chunk, index) => `
**Chunk ${index + 1}** (${chunk.type}):
- Size: ${chunk.size} characters
- Priority: ${chunk.priority}
- Content: ${chunk.type === 'metadata' ? 'Component metadata and structure' : 'Code content'}
`).join('\n')}

## Technical Details

- **Framework**: React
- **Chunking Strategy**: Intelligent context-aware splitting
- **Claude Desktop Compatible**: Yes
- **Artifact System**: Optimized for Claude's rendering engine

The chunked approach ensures that even complex components can be rendered reliably in Claude Desktop, handling the token limitations gracefully.`;
}
// Start the server
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('MCP Preview Server running on stdio');
}
// Handle process termination
process.on('SIGINT', async () => {
    console.error('Shutting down MCP Preview Server...');
    await server.close();
    process.exit(0);
});
// Start the server
main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map