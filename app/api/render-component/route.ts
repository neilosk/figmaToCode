import { NextRequest, NextResponse } from 'next/server';

/**
 * Simplified Server-Side Component Renderer
 * 
 * This API endpoint takes React component code and renders it as a clean HTML page.
 * It handles code normalization from different AI providers and provides stable previews.
 */

interface RenderRequest {
  code: string;
  componentName: string;
  styling?: 'tailwind' | 'css' | 'styled-components';
  files?: Array<{ name: string; content: string; type: string }>;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { code, componentName, styling = 'tailwind', files = [] }: RenderRequest = await request.json();

    if (!code || !componentName) {
      return NextResponse.json({
        error: 'Code and componentName are required'
      }, { status: 400 });
    }

    // Clean and normalize the code
    const cleanedCode = cleanReactCode(code);
    
    // Extract CSS from files
    const cssContent = extractCSSContent(files);
    
    // Generate the HTML preview
    const html = generatePreviewHTML(cleanedCode, componentName, styling, cssContent);
    
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    console.error('Component render error:', error);
    
    // Return error HTML page
    const errorHTML = generateErrorHTML(error instanceof Error ? error.message : 'Unknown error');
    return new NextResponse(errorHTML, {
      status: 500,
      headers: { 'Content-Type': 'text/html' }
    });
  }
}

/**
 * Clean and normalize React code from different AI providers
 */
function cleanReactCode(code: string): string {
  let cleaned = code;
  
  // Remove HTML artifacts (spans, styles, etc.)
  cleaned = cleaned
    .replace(/<span[^>]*>/g, '')
    .replace(/<\/span>/g, '')
    .replace(/style="[^"]*"/g, '')
    .trim();
  
  // Remove import statements (we'll handle dependencies in HTML)
  cleaned = cleaned
    .replace(/import\s+.*?from\s+['"][^'"]*['"];?\s*\n?/g, '')
    .replace(/import\s+['"][^'"]*['"];?\s*\n?/g, '');
  
  // Remove export statements
  cleaned = cleaned
    .replace(/export\s+default\s+/g, '')
    .replace(/export\s+/g, '');
  
  // Remove TypeScript type annotations
  cleaned = cleaned
    .replace(/:\s*React\.FC<[^>]*>/g, '')
    .replace(/:\s*React\.FC/g, '')
    .replace(/:\s*FC<[^>]*>/g, '')
    .replace(/:\s*FC/g, '')
    .replace(/:\s*JSX\.Element/g, '')
    .replace(/:\s*ReactElement/g, '')
    .replace(/:\s*ReactNode/g, '');
  
  // Remove interface and type definitions
  cleaned = cleaned
    .replace(/interface\s+[A-Za-z][A-Za-z0-9]*\s*\{[^}]*\}/g, '')
    .replace(/type\s+[A-Za-z][A-Za-z0-9]*\s*=\s*[^;]*;/g, '');
  
  // Clean up parameter types
  cleaned = cleaned
    .replace(/\(([^)]*?):\s*[A-Za-z][A-Za-z0-9<>\[\]]*\)/g, '($1)')
    .replace(/\{([^}]*?):\s*[A-Za-z][A-Za-z0-9<>\[\]]*;?\s*/g, '{$1 ')
    .replace(/\{([^}]*?):\s*[A-Za-z][A-Za-z0-9<>\[\]]*\}/g, '{$1}');
  
  // Remove empty lines and extra whitespace
  cleaned = cleaned
    .split('\n')
    .filter(line => line.trim() !== '')
    .join('\n')
    .trim();
  
  return cleaned;
}

/**
 * Extract CSS content from files
 */
function extractCSSContent(files: Array<{ name: string; content: string; type: string }>): string {
  return files
    .filter(file => file.type === 'css' || file.name.endsWith('.css'))
    .map(file => file.content)
    .join('\n\n');
}

/**
 * Generate the complete HTML preview
 */
function generatePreviewHTML(code: string, componentName: string, styling: string, cssContent: string): string {
  const needsTailwind = styling === 'tailwind' || code.includes('className=');
  const componentFunctionName = componentName.replace(/[^a-zA-Z0-9]/g, '') || 'GeneratedComponent';
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${componentName} - Preview</title>
    
    <!-- React Dependencies -->
    <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    
    <!-- Styling -->
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
            background: #f8fafc;
            min-height: 100vh;
            padding: 20px;
        }
        
        .preview-container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        
        .preview-header {
            background: #f1f5f9;
            border-bottom: 1px solid #e2e8f0;
            padding: 16px 24px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .preview-header h1 {
            font-size: 18px;
            font-weight: 600;
            color: #1e293b;
        }
        
        .preview-badge {
            background: #10b981;
            color: white;
            padding: 4px 12px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 500;
        }
        
        .preview-content {
            padding: 24px;
        }
        
        .error-display {
            background: #fef2f2;
            border: 1px solid #fecaca;
            border-radius: 8px;
            padding: 16px;
            color: #dc2626;
            margin: 20px 0;
        }
        
        .error-display h3 {
            margin-bottom: 8px;
            font-weight: 600;
        }
        
        .error-details {
            background: #fff;
            border: 1px solid #e5e7eb;
            border-radius: 4px;
            padding: 12px;
            margin-top: 12px;
            font-family: 'Monaco', 'Menlo', monospace;
            font-size: 12px;
            overflow-x: auto;
        }
        
        /* Component CSS */
        ${cssContent}
    </style>
</head>
<body>
    <div class="preview-container">
        <div class="preview-header">
            <h1>${componentName}</h1>
            <div class="preview-badge">Live Preview</div>
        </div>
        <div class="preview-content">
            <div id="root">
                <div style="text-align: center; padding: 40px; color: #64748b;">
                    <div>Loading component...</div>
                </div>
            </div>
        </div>
    </div>
    
    <script type="text/babel">
        function renderComponent() {
            try {
                // Component code
                ${code}
                
                // Find the component function
                let ComponentFunction = null;
                
                // Try to find the component by name
                if (typeof window.${componentFunctionName} === 'function') {
                    ComponentFunction = window.${componentFunctionName};
                } else {
                    // Look for any function that looks like a component
                    const possibleComponents = Object.keys(window).filter(key => 
                        typeof window[key] === 'function' && 
                        key.charAt(0) === key.charAt(0).toUpperCase() &&
                        !['React', 'ReactDOM', 'Babel', 'Component', 'PureComponent'].includes(key)
                    );
                    
                    if (possibleComponents.length > 0) {
                        ComponentFunction = window[possibleComponents[possibleComponents.length - 1]];
                    }
                }
                
                if (ComponentFunction) {
                    const root = ReactDOM.createRoot(document.getElementById('root'));
                    root.render(React.createElement(ComponentFunction));
                } else {
                    throw new Error(\`Component function '\${componentFunctionName}' not found. Available functions: \${Object.keys(window).filter(k => typeof window[k] === 'function').join(', ')}\`);
                }
                
            } catch (error) {
                console.error('Render error:', error);
                document.getElementById('root').innerHTML = \`
                    <div class="error-display">
                        <h3>Render Error</h3>
                        <div>\${error.message}</div>
                        <div class="error-details">
                            <strong>Component Name:</strong> ${componentName}<br>
                            <strong>Function Name:</strong> ${componentFunctionName}<br>
                            <strong>Error:</strong> \${error.name}<br>
                            <strong>Stack:</strong><br>
                            <pre>\${error.stack}</pre>
                        </div>
                    </div>
                \`;
            }
        }
        
        // Wait for React to load, then render
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
 * Generate error HTML page
 */
function generateErrorHTML(errorMessage: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Preview Error</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f8fafc;
            padding: 40px;
            margin: 0;
        }
        .error-container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            padding: 40px;
            text-align: center;
        }
        .error-icon {
            font-size: 48px;
            margin-bottom: 20px;
        }
        .error-title {
            font-size: 24px;
            font-weight: 600;
            color: #dc2626;
            margin-bottom: 16px;
        }
        .error-message {
            color: #6b7280;
            line-height: 1.6;
        }
    </style>
</head>
<body>
    <div class="error-container">
        <div class="error-icon">⚠️</div>
        <div class="error-title">Preview Generation Failed</div>
        <div class="error-message">${errorMessage}</div>
    </div>
</body>
</html>`;
}