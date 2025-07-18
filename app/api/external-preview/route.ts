import { NextRequest, NextResponse } from 'next/server';

/**
 * External Preview Service Integration
 * 
 * Instead of trying to render components ourselves, use services that
 * already solve this problem perfectly: CodeSandbox, StackBlitz, etc.
 */

interface ExternalPreviewRequest {
  code: string;
  componentName: string;
  styling?: 'tailwind' | 'css';
  files?: Array<{ name: string; content: string; type: string }>;
}

export async function POST(request: NextRequest) {
  try {
    const { code, componentName, styling = 'tailwind', files = [] }: ExternalPreviewRequest = await request.json();

    // Create CodeSandbox preview
    const sandboxUrl = await createCodeSandboxPreview(code, componentName, styling, files);
    
    return NextResponse.json({
      success: true,
      previewUrl: sandboxUrl,
      service: 'CodeSandbox',
      componentName
    });

  } catch (error) {
    console.error('External preview error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Create CodeSandbox preview - they handle all the complexity
 */
async function createCodeSandboxPreview(
  code: string, 
  componentName: string, 
  styling: string, 
  files: Array<{ name: string; content: string; type: string }>
): Promise<string> {
  
  // Clean the code minimally
  const cleanCode = code
    .replace(/export default /g, '')
    .replace(/export /g, '');

  // Create package.json
  const packageJson = {
    name: `${componentName.toLowerCase()}-preview`,
    version: '1.0.0',
    dependencies: {
      'react': '^18.2.0',
      'react-dom': '^18.2.0',
      'react-scripts': '^5.0.1',
      ...(styling === 'tailwind' && { 'tailwindcss': '^3.3.0' })
    },
    scripts: {
      start: 'react-scripts start',
      build: 'react-scripts build'
    },
    browserslist: {
      production: ['>0.2%', 'not dead', 'not op_mini all'],
      development: ['last 1 chrome version', 'last 1 firefox version', 'last 1 safari version']
    }
  };

  // Create the files structure
  const sandboxFiles: Record<string, { content: string }> = {
    'package.json': {
      content: JSON.stringify(packageJson, null, 2)
    },
    'public/index.html': {
      content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${componentName} Preview</title>
  ${styling === 'tailwind' ? '<script src="https://cdn.tailwindcss.com"></script>' : ''}
</head>
<body>
  <div id="root"></div>
</body>
</html>`
    },
    'src/index.js': {
      content: `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);`
    },
    'src/App.js': {
      content: `import React from 'react';

${cleanCode}

// Export the component
const App = ${componentName};
export default App;`
    }
  };

  // Add CSS files if provided
  files.forEach(file => {
    if (file.type === 'css') {
      sandboxFiles[`src/${file.name}`] = {
        content: file.content
      };
    }
  });

  // Create the sandbox via CodeSandbox API
  const response = await fetch('https://codesandbox.io/api/v1/sandboxes/define', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      files: sandboxFiles,
      template: 'create-react-app'
    })
  });

  if (!response.ok) {
    throw new Error(`CodeSandbox API error: ${response.status}`);
  }

  const result = await response.json();
  return `https://codesandbox.io/s/${result.sandbox_id}`;
}

/**
 * Alternative: StackBlitz integration
 */
async function createStackBlitzPreview(
  code: string, 
  componentName: string, 
  styling: string
): Promise<string> {
  // StackBlitz API would go here
  // They have an excellent API for this exact use case
  return `https://stackblitz.com/edit/react-${componentName.toLowerCase()}`;
}