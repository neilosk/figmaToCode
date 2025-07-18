/**
 * Preview Manager - Handles preview storage, URLs, and lifecycle
 */

import { v4 as uuidv4 } from 'uuid';
import { CodeChunk } from './context-chunker.js';

export interface PreviewRequest {
  id: string;
  componentName: string;
  framework: string;
  styling: string;
  chunks: CodeChunk[];
  files: Array<{ name: string; content: string; type: string }>;
  options: any;
  status: 'processing' | 'ready' | 'error';
  createdAt: string;
  previewUrl?: string;
  error?: string;
}

export class PreviewManager {
  private previews: Map<string, PreviewRequest> = new Map();
  private readonly BASE_URL = 'http://localhost:3015/preview'; // MCP server preview endpoint

  /**
   * Generate a unique preview ID
   */
  generatePreviewId(componentName: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    const cleanName = componentName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    return `${cleanName}-${timestamp}-${random}`;
  }

  /**
   * Store a preview request
   */
  storePreviewRequest(previewId: string, request: PreviewRequest): void {
    this.previews.set(previewId, request);
  }

  /**
   * Get a preview request
   */
  getPreviewRequest(previewId: string): PreviewRequest | undefined {
    return this.previews.get(previewId);
  }

  /**
   * Update preview status
   */
  updatePreviewStatus(previewId: string, status: PreviewRequest['status'], error?: string): void {
    const preview = this.previews.get(previewId);
    if (preview) {
      preview.status = status;
      if (error) {
        preview.error = error;
      }
      this.previews.set(previewId, preview);
    }
  }

  /**
   * Get preview URL
   */
  getPreviewUrl(previewId: string): string {
    const preview = this.previews.get(previewId);
    if (!preview) {
      throw new Error(`Preview not found: ${previewId}`);
    }

    // Generate stable URL
    const previewUrl = `${this.BASE_URL}/${previewId}`;
    
    // Update the preview with the URL
    if (!preview.previewUrl) {
      preview.previewUrl = previewUrl;
      this.previews.set(previewId, preview);
    }

    return previewUrl;
  }

  /**
   * Generate HTML preview content
   */
  generatePreviewHTML(previewId: string): string {
    const preview = this.previews.get(previewId);
    if (!preview) {
      throw new Error(`Preview not found: ${previewId}`);
    }

    // Reconstruct the complete code from chunks
    const completeCode = this.reconstructCodeFromChunks(preview.chunks);
    
    // Generate CSS content from files
    const cssContent = preview.files
      .filter(f => f.type === 'css')
      .map(f => f.content)
      .join('\n\n');

    // Create HTML template
    return this.createHTMLTemplate(preview.componentName, completeCode, cssContent, preview.styling);
  }

  /**
   * Reconstruct complete code from chunks
   */
  private reconstructCodeFromChunks(chunks: CodeChunk[]): string {
    // Sort chunks by priority
    const sortedChunks = [...chunks].sort((a, b) => a.priority - b.priority);
    
    const codeBuilder: string[] = [];
    
    for (const chunk of sortedChunks) {
      if (chunk.type === 'imports') {
        codeBuilder.push(chunk.content);
      } else if (chunk.type === 'types') {
        codeBuilder.push(chunk.content);
      } else if (chunk.type === 'component') {
        codeBuilder.push(chunk.content);
      }
      // Skip metadata and styles chunks as they're handled separately
    }
    
    return codeBuilder.join('\n\n');
  }

  /**
   * Create HTML template for preview
   */
  private createHTMLTemplate(componentName: string, code: string, cssContent: string, styling: string): string {
    const needsTailwind = styling === 'tailwind' || code.includes('className=');
    const componentWrapperName = componentName.replace(/[^a-zA-Z0-9]/g, '') || 'GeneratedComponent';

    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${componentName} - MCP Preview</title>
    <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    ${needsTailwind ? '<script src="https://cdn.tailwindcss.com"></script>' : ''}
    
    <style>
        /* Reset and base styles */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f9fafb;
            padding: 20px;
            min-height: 100vh;
        }
        
        .mcp-preview-container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        
        .mcp-preview-header {
            background: #f8fafc;
            border-bottom: 1px solid #e2e8f0;
            padding: 16px 24px;
            display: flex;
            justify-content: between;
            align-items: center;
        }
        
        .mcp-preview-header h1 {
            font-size: 18px;
            font-weight: 600;
            color: #1e293b;
        }
        
        .mcp-preview-badge {
            background: #3b82f6;
            color: white;
            padding: 4px 8px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 500;
        }
        
        .mcp-preview-content {
            padding: 24px;
        }
        
        .mcp-error {
            background: #fef2f2;
            border: 1px solid #fecaca;
            border-radius: 8px;
            padding: 16px;
            color: #dc2626;
        }
        
        /* Custom CSS from component */
        ${cssContent}
    </style>
</head>
<body>
    <div class="mcp-preview-container">
        <div class="mcp-preview-header">
            <h1>${componentName}</h1>
            <div class="mcp-preview-badge">MCP Preview</div>
        </div>
        <div class="mcp-preview-content">
            <div id="root">
                <div style="text-align: center; padding: 40px; color: #64748b;">
                    Loading component...
                </div>
            </div>
        </div>
    </div>
    
    <script type="text/babel">
        function renderComponent() {
            try {
                // Component code
                const componentCode = \`${code.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`;
                
                // Clean the code
                let processedCode = componentCode
                    .replace(/import[^\\n]+\\n/g, '')  // Remove imports
                    .replace(/export\\s+default\\s+/g, '')  // Remove export default
                    .replace(/export\\s+/g, '')  // Remove other exports
                    .trim();
                
                // Transform with Babel
                const transformedCode = Babel.transform(processedCode, {
                    presets: ['react']
                }).code;
                
                // Execute the code
                eval(transformedCode);
                
                // Find the component function
                const componentFunction = window.${componentWrapperName} || 
                                        window[Object.keys(window).find(key => 
                                            typeof window[key] === 'function' && 
                                            key.charAt(0) === key.charAt(0).toUpperCase() &&
                                            !['React', 'ReactDOM', 'Babel'].includes(key)
                                        )];
                
                if (componentFunction) {
                    const root = ReactDOM.createRoot(document.getElementById('root'));
                    root.render(React.createElement(componentFunction));
                } else {
                    throw new Error('Component function not found');
                }
                
            } catch (error) {
                console.error('Render error:', error);
                document.getElementById('root').innerHTML = \`
                    <div class="mcp-error">
                        <strong>Render Error:</strong> \${error.message}
                        <details style="margin-top: 10px;">
                            <summary>Debug Information</summary>
                            <pre style="font-size: 12px; margin-top: 10px; white-space: pre-wrap;">\${error.stack}</pre>
                        </details>
                    </div>
                \`;
            }
        }
        
        // Wait for React to load
        if (typeof React !== 'undefined' && typeof ReactDOM !== 'undefined') {
            renderComponent();
        } else {
            setTimeout(renderComponent, 100);
        }
    </script>
</body>
</html>`;
  }

  /**
   * Clean up old previews
   */
  cleanup(maxAge: number = 3600000): void { // 1 hour default
    const now = Date.now();
    const toDelete: string[] = [];
    
    for (const [id, preview] of this.previews) {
      const age = now - new Date(preview.createdAt).getTime();
      if (age > maxAge) {
        toDelete.push(id);
      }
    }
    
    for (const id of toDelete) {
      this.previews.delete(id);
    }
  }

  /**
   * Get all previews (for debugging)
   */
  getAllPreviews(): PreviewRequest[] {
    return Array.from(this.previews.values());
  }
}