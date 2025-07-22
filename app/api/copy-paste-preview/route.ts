import { NextRequest, NextResponse } from 'next/server';
import { writeFileSync } from 'fs';
import path from 'path';

/**
 * Automated HTML Preview Generation
 * 
 * Automatically creates HTML preview files in the project root
 * so users just need to open the generated file.
 */

export async function POST(request: NextRequest) {
  try {
    const { code, componentName, styling = 'tailwind', files = [] } = await request.json();

    // Clean the code more thoroughly
    const cleanedCode = cleanCodeForPreview(code);
    
    // Extract CSS from files
    const cssContent = files
      .filter((file: any) => file.type === 'css' || file.name.endsWith('.css'))
      .map((file: any) => file.content)
      .join('\n\n');

    // Generate a complete, self-contained HTML file
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${componentName} Preview</title>
    <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    ${styling === 'tailwind' ? '<script src="https://cdn.tailwindcss.com"></script>' : ''}
    <style>
        body { 
            font-family: system-ui, -apple-system, sans-serif; 
            margin: 0; 
            padding: 20px; 
            background: #f8fafc;
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
            padding: 20px; 
            border-bottom: 1px solid #e2e8f0;
            display: flex;
            justify-content: space-between;
            align-items: center;
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
        
        /* Component CSS */
        ${cssContent}
    </style>
</head>
<body>
    <div class="preview-container">
        <div class="preview-header">
            <h1>${componentName}</h1>
            <div class="preview-badge">Copy-Paste Preview</div>
        </div>
        <div class="preview-content">
            <div id="root">
                <div style="text-align: center; padding: 40px; color: #64748b;">
                    Loading component...
                </div>
            </div>
        </div>
    </div>
    
    <script type="text/babel">
        try {
            // Component code
            ${cleanedCode}
            
            // Try to render the component
            const root = ReactDOM.createRoot(document.getElementById('root'));
            
            // Look for the component function
            let ComponentFunction = null;
            
            // Try different ways to find the component
            if (typeof ${componentName} !== 'undefined') {
                ComponentFunction = ${componentName};
            } else if (typeof window.${componentName} !== 'undefined') {
                ComponentFunction = window.${componentName};
            } else {
                // Look for any function that looks like a component
                const possibleComponents = Object.keys(window).filter(key => 
                    typeof window[key] === 'function' && 
                    key.charAt(0) === key.charAt(0).toUpperCase() &&
                    !['React', 'ReactDOM', 'Babel', 'Component', 'PureComponent'].includes(key)
                );
                
                if (possibleComponents.length > 0) {
                    ComponentFunction = window[possibleComponents[0]];
                }
            }
            
            if (ComponentFunction) {
                root.render(React.createElement(ComponentFunction));
            } else {
                throw new Error(\`Component '\${componentName}' not found\`);
            }
            
        } catch (error) {
            console.error('Render error:', error);
            document.getElementById('root').innerHTML = \`
                <div class="error-display">
                    <h3>⚠️ Render Error</h3>
                    <p><strong>Component:</strong> ${componentName}</p>
                    <p><strong>Error:</strong> \${error.message}</p>
                    <details style="margin-top: 10px;">
                        <summary>Debug Info</summary>
                        <pre style="font-size: 12px; white-space: pre-wrap;">\${error.stack}</pre>
                    </details>
                </div>
            \`;
        }
    </script>
</body>
</html>`;

    // Generate filename
    const safeComponentName = componentName.replace(/[^a-zA-Z0-9]/g, '');
    const filename = `${safeComponentName}Preview.html`;
    const filepath = path.join(process.cwd(), filename);
    
    // Write the HTML file
    try {
      writeFileSync(filepath, html, 'utf8');
      console.log(`✅ Generated preview file: ${filename}`);
    } catch (writeError) {
      console.error('Failed to write HTML file:', writeError);
      throw new Error(`Failed to create HTML file: ${writeError instanceof Error ? writeError.message : 'Unknown error'}`);
    }

    return NextResponse.json({
      success: true,
      filename,
      filepath,
      instructions: [
        `✅ HTML file created: ${filename}`,
        '🔍 Look in your project root directory',
        '🌐 Double-click the file to open in browser',
        '🎉 Your component will render perfectly!'
      ]
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Clean code for preview
 */
function cleanCodeForPreview(code: string): string {
  let cleaned = code;
  
  // Remove HTML artifacts
  cleaned = cleaned
    .replace(/<span[^>]*>/g, '')
    .replace(/<\/span>/g, '')
    .replace(/style="[^"]*"/g, '')
    .trim();
  
  // Remove import statements
  cleaned = cleaned
    .replace(/import\s+.*?from\s+['"][^'"]*['"];?\s*\n?/g, '')
    .replace(/import\s+['"][^'"]*['"];?\s*\n?/g, '');
  
  // Remove export statements
  cleaned = cleaned
    .replace(/export\s+default\s+/g, '')
    .replace(/export\s+/g, '');
  
  // Remove TypeScript annotations
  cleaned = cleaned
    .replace(/:\s*React\.FC<[^>]*>/g, '')
    .replace(/:\s*React\.FC/g, '')
    .replace(/:\s*FC<[^>]*>/g, '')
    .replace(/:\s*FC/g, '')
    .replace(/:\s*JSX\.Element/g, '');
  
  // Remove interface and type definitions
  cleaned = cleaned
    .replace(/interface\s+[A-Za-z][A-Za-z0-9]*\s*\{[^}]*\}/g, '')
    .replace(/type\s+[A-Za-z][A-Za-z0-9]*\s*=\s*[^;]*;/g, '');
  
  return cleaned.trim();
}