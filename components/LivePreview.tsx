'use client';

import React, { useState, useMemo } from 'react';
import { AlertCircle, Eye, Monitor } from 'lucide-react';

interface LivePreviewProps {
  code: string;
  componentName: string;
  files?: Array<{ name: string; content: string; type: string }>;
}

export default function LivePreview({ code, componentName, files }: LivePreviewProps) {
  const [error, setError] = useState<string | null>(null);
  const [useIframe, setUseIframe] = useState(true); // Default to iframe for better isolation
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewMode, setPreviewMode] = useState<'full' | 'simplified' | 'static'>('full');

  // Create iframe content for isolated preview
  const iframeContent = useMemo(() => {
    try {
      // Performance check: if code is too large, switch to simplified mode
      if (code.length > 50000) {
        console.warn('Code too large for full preview, switching to simplified mode');
        if (previewMode === 'full') {
          setPreviewMode('simplified');
        }
      }
      
      // If in simplified mode, show a basic preview
      if (previewMode === 'simplified') {
        return createSimplifiedPreview(code, componentName);
      }
      
      // If in static mode, show static preview
      if (previewMode === 'static') {
        return createStaticPreview(code, componentName);
      }
      
      setIsProcessing(true);
      // Extract the actual component name from the code
      const functionComponentMatch = code.match(/function\s+([A-Z][A-Za-z0-9]*)/);
      const constComponentMatch = code.match(/const\s+([A-Z][A-Za-z0-9]*)\s*=.*=>/);
      const exportComponentMatch = code.match(/export\s+default\s+function\s+([A-Z][A-Za-z0-9]*)/);
      
      const actualComponentName = 
        functionComponentMatch?.[1] || 
        constComponentMatch?.[1] || 
        exportComponentMatch?.[1] || 
        componentName || 
        'Component';

      // Extract CSS files from the files array
      const cssFiles = files?.filter(file => file.type === 'css') || [];
      const cssContent = cssFiles.map(file => file.content).join('\\n');
      
      
      // Detect styling approach
      const hasTailwindClasses = code.includes('className=') && 
        (code.includes('bg-') || code.includes('text-') || code.includes('flex') || code.includes('grid'));
      const usesTailwind = hasTailwindClasses || cssFiles.length === 0;

      // Clean the code for iframe execution by removing TypeScript and imports
      let cleanCode = code
        // Remove all import statements (including CSS imports, regular imports, etc.)
        .replace(/import\s+.*?from\s+['"][^'"]*['"];?\s*/g, '') // Standard imports
        .replace(/import\s+['"][^'"]*['"];?\s*/g, '') // CSS/side-effect imports
        .replace(/import\s+.*?['"][^'"]*['"];?\s*/g, '') // Any remaining import patterns
        .replace(/^['"][^'"]*['"];?\s*/gm, '') // Standalone string imports at line start
        .replace(/export\s+default\s+/g, '') // Remove export default
        .replace(/export\s+/g, '') // Remove export
        .replace(/interface\s+\w+\s*{[^}]*}\s*/g, '') // Remove interfaces
        .replace(/type\s+\w+\s*=\s*[^;]+;/g, '') // Remove type definitions
        .replace(/:\s*React\.FC<[^>]*>/g, '') // Remove React.FC types
        .replace(/:\s*FC<[^>]*>/g, '') // Remove FC types
        .replace(/:\s*FunctionComponent<[^>]*>/g, '') // Remove FunctionComponent types
        .replace(/:\s*JSX\.Element/g, '') // Remove JSX.Element return types
        .replace(/:\s*ReactElement/g, '') // Remove ReactElement return types
        .replace(/:\s*ReactNode/g, '') // Remove ReactNode types
        .replace(/\(\s*{\s*([^}:]+)\s*}\s*:\s*[^)]+\s*\)/g, '({ $1 })') // Remove prop types
        .replace(/(\w+)\s*:\s*\w+(\[\])?\s*(?=[,)])/g, '$1') // Remove parameter types
        .replace(/\)\s*:\s*\w+(\[\])?\s*=>/g, ') =>') // Remove return types
        .replace(/:\s*\w+(\[\])?\s*(?=[=;,\)])/g, '') // Remove variable types
        .replace(/as\s+\w+/g, '') // Remove type assertions
        // Convert const/let to var for better eval compatibility
        .replace(/\bconst\b/g, 'var')
        .replace(/\blet\b/g, 'var')
        // Clean up any malformed syntax from replacements
        .replace(/\s+/g, ' ') // Normalize whitespace
        .replace(/;\s*;/g, ';') // Remove double semicolons
        .trim();

      // Check if this is just a JSX fragment without a function wrapper
      const isJustJSX = !cleanCode.includes('function ') && 
                        !cleanCode.includes('const ') && 
                        !cleanCode.includes('=>') &&
                        (cleanCode.startsWith('<') || cleanCode.match(/^\w+.*=/));

      if (isJustJSX) {
        console.log('Detected JSX fragment, wrapping in function component');
        cleanCode = `function ${actualComponentName}() {
          return (
            ${cleanCode}
          );
        }`;
      }

      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Component Preview</title>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  ${usesTailwind ? `
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    // Enhanced Tailwind configuration for arbitrary values
    tailwind.config = {
      theme: {
        extend: {
          colors: {},
          spacing: {},
          fontFamily: {
            'sans': ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif']
          }
        }
      },
      safelist: [
        {pattern: /bg-\[.+\]/},
        {pattern: /text-\[.+\]/},
        {pattern: /w-\[.+\]/},
        {pattern: /h-\[.+\]/},
        {pattern: /p-\[.+\]/},
        {pattern: /rounded-\[.+\]/},
        {pattern: /border-\[.+\]/},
        {pattern: /shadow-\[.+\]/},
        {pattern: /gap-\[.+\]/},
        {pattern: /space-\w+-\[.+\]/},
        {pattern: /font-\[.+\]/},
        {pattern: /leading-\[.+\]/},
        {pattern: /tracking-\[.+\]/},
        {pattern: /flex/},
        {pattern: /grid/},
        {pattern: /hidden/},
        {pattern: /block/},
        {pattern: /inline/}
      ]
    };
  </script>` : ''}
  <style>
    body { 
      margin: 0; 
      padding: 0; 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f9fafb;
    }
    .preview-header {
      background: #3b82f6;
      color: white;
      padding: 8px 16px;
      font-size: 12px;
      font-weight: 500;
    }
    #root {
      min-height: calc(100vh - 32px);
    }
    .error { 
      color: #ef4444; 
      background: #fef2f2; 
      padding: 16px; 
      margin: 16px;
      border-radius: 8px; 
      border: 1px solid #fecaca;
    }
  </style>
</head>
<body>
  <div class="preview-header">
    Live Preview: ${actualComponentName}
  </div>
  <div id="root">
    <div style="padding: 40px; text-align: center; color: #6b7280;">
      Loading component...
    </div>
  </div>
  
  <script>
    const componentCode = \`${cleanCode.replace(/`/g, '\\`').replace(/\\/g, '\\\\')}\`;
    
    function renderComponent() {
      try {
        console.log('Original code:', componentCode.substring(0, 300));
        
        // Additional cleanup for any remaining imports or problematic patterns
        let cleanedCode = componentCode
          // Remove any remaining import lines that might have been missed
          .split('\\n')
          .filter(line => {
            const trimmedLine = line.trim();
            return !trimmedLine.startsWith('import ') && 
                   !trimmedLine.startsWith("import'") && 
                   !trimmedLine.startsWith('import"') &&
                   !trimmedLine.match(/^['"].*\\.css['"];?$/) &&
                   !trimmedLine.startsWith('export ') &&
                   trimmedLine !== '' || line.includes('return') || line.includes('function') || line.includes('=>');
          })
          .join('\\n')
          // Replace const with var for better compatibility in eval context
          .replace(/\\bconst\\b/g, 'var')
          .replace(/\\blet\\b/g, 'var')
          // Remove TypeScript-specific syntax that might have been missed
          .replace(/\\s*:\\s*React\\.FC.*?(?=>|=|\\)|{)/g, '')
          .replace(/\\s*:\\s*JSX\\.Element.*?(?=>|=|\\)|{)/g, '')
          .replace(/\\s*:\\s*ReactNode.*?(?=>|=|\\)|{)/g, '')
          // Clean up arrow function types
          .replace(/\\)\\s*:\\s*[A-Z]\\w*.*?(?=\\s*=>)/g, ')')
          .trim();
        
        console.log('Cleaned code:', cleanedCode.substring(0, 300));
        
        // Check if code is already a proper function component
        let codeToTransform = cleanedCode;
        
        if (!cleanedCode.includes('function ') && !cleanedCode.includes('const ') && !cleanedCode.includes('=>')) {
          // If it's just JSX, wrap it in a function component
          codeToTransform = 'function ' + '${actualComponentName}' + '() { return (' + cleanedCode + '); }';
          console.log('Wrapped bare JSX in function component');
        }
        
        // Transform JSX with Babel
        const transformedCode = Babel.transform(codeToTransform, {
          presets: ['react'],
          plugins: []
        }).code;
        
        console.log('Transformed code:', transformedCode.substring(0, 300));
        
        // Extract all possible component function names from the code
        const functionPatterns = [
          /function\\s+([A-Z][A-Za-z0-9]*)/g,           // function ComponentName
          /const\\s+([A-Z][A-Za-z0-9]*)\\s*=/g,         // const ComponentName =
          /var\\s+([A-Z][A-Za-z0-9]*)\\s*=/g,           // var ComponentName =
          /let\\s+([A-Z][A-Za-z0-9]*)\\s*=/g,           // let ComponentName =
          /([A-Z][A-Za-z0-9]*)\\s*=\\s*function/g,      // ComponentName = function
          /([A-Z][A-Za-z0-9]*)\\s*=\\s*\\([^)]*\\)\\s*=>/g  // ComponentName = () =>
        ];
        
        // List of known DOM/Web API constructors and other invalid component names
        const invalidComponentNames = [
          'WebSocketStream', 'WebSocket', 'XMLHttpRequest', 'EventSource', 'MediaSource',
          'AudioContext', 'VideoDecoder', 'AudioDecoder', 'ImageDecoder', 'TextDecoder',
          'BroadcastChannel', 'MessageChannel', 'ServiceWorker', 'SharedWorker', 'Worker',
          'Request', 'Response', 'Headers', 'FormData', 'URLSearchParams', 'URL', 'URLPattern',
          'AbortController', 'AbortSignal', 'ReadableStream', 'WritableStream', 'TransformStream',
          'CompressionStream', 'DecompressionStream', 'TextEncoderStream', 'TextDecoderStream',
          'File', 'Blob', 'FileReader', 'Image', 'Audio', 'Video', 'Canvas', 'Path2D',
          'OffscreenCanvas', 'ImageBitmap', 'ImageData', 'DOMParser', 'XMLSerializer',
          'MutationObserver', 'ResizeObserver', 'IntersectionObserver', 'PerformanceObserver',
          'ReportingObserver', 'Notification', 'PushManager', 'PushSubscription',
          'CacheStorage', 'Cache', 'IDBDatabase', 'IDBTransaction', 'IDBRequest',
          'Geolocation', 'DeviceMotionEvent', 'DeviceOrientationEvent', 'GamepadEvent',
          'HTMLElement', 'Element', 'Node', 'Document', 'Window', 'History', 'Location',
          'Navigator', 'Screen', 'Console', 'Storage', 'Performance', 'Crypto', 'SubtleCrypto'
        ];
        
        const componentFunctionNames = [];
        functionPatterns.forEach(pattern => {
          let match;
          while ((match = pattern.exec(transformedCode)) !== null) {
            if (match[1] && 
                !componentFunctionNames.includes(match[1]) && 
                !invalidComponentNames.includes(match[1])) {
              componentFunctionNames.push(match[1]);
            }
          }
        });
        
        // Add the actual component name as fallback
        if (!componentFunctionNames.includes('${actualComponentName}')) {
          componentFunctionNames.push('${actualComponentName}');
        }
        
        console.log('Detected component names:', componentFunctionNames);
        
        // Execute the transformed code safely using eval in iframe context
        let ComponentFunction;
        let executionError = null;
        
        try {
          // Use eval to execute the code in the iframe's global scope
          console.log('Executing transformed code...');
          eval(transformedCode);
          console.log('Code executed successfully');
          
          // Try each detected component name with validation
          for (const funcName of componentFunctionNames) {
            if (typeof window[funcName] === 'function') {
              // Validate it's a React component by testing if it can be called
              try {
                const testResult = window[funcName]();
                // Check if it returns something that looks like a React element
                if (testResult && (
                  typeof testResult === 'object' && 
                  (testResult.type || testResult.$$typeof || testResult.props)
                )) {
                  ComponentFunction = window[funcName];
                  console.log('Found valid React component:', funcName);
                  break;
                } else {
                  console.log('Skipping non-React function:', funcName, typeof testResult);
                }
              } catch (validationError) {
                // If the function can't be called safely, it's probably not a React component
                console.log('Skipping invalid component function:', funcName, validationError.message);
                continue;
              }
            }
          }
          
          if (!ComponentFunction) {
            // Advanced fallback: search all global functions
            const allKeys = Object.getOwnPropertyNames(window);
            console.log('Searching all global keys:', allKeys.filter(key => 
              typeof window[key] === 'function' && key.charAt(0) === key.charAt(0).toUpperCase()
            ));
            
            const componentKeys = allKeys.filter(key => 
              typeof window[key] === 'function' && 
              key.charAt(0) === key.charAt(0).toUpperCase() &&
              !['React', 'ReactDOM', 'Babel', 'Component', 'PureComponent', 'Fragment'].includes(key) &&
              !invalidComponentNames.includes(key)
            );
            
            if (componentKeys.length > 0) {
              // Validate each potential component
              for (const key of componentKeys.reverse()) { // Start with the last one
                try {
                  const testResult = window[key]();
                  if (testResult && (
                    typeof testResult === 'object' && 
                    (testResult.type || testResult.$$typeof || testResult.props)
                  )) {
                    ComponentFunction = window[key];
                    console.log('Using validated fallback component:', key);
                    break;
                  }
                } catch (fallbackError) {
                  console.log('Fallback validation failed for:', key, fallbackError.message);
                  continue;
                }
              }
            }
          }
          
          if (!ComponentFunction) {
            throw new Error('No component function found after execution. Available functions: ' + 
              Object.keys(window).filter(k => typeof window[k] === 'function').join(', '));
          }
          
        } catch (evalError) {
          executionError = evalError;
          console.error('Eval execution failed:', evalError.message);
          console.error('Transformed code that failed:', transformedCode.substring(0, 500));
          
          // Last resort: try to create a wrapper function
          try {
            console.log('Attempting wrapper function approach...');
            const wrapperCode = \`
              (function() {
                \${transformedCode}
                
                // Return the first component function found
                \${componentFunctionNames.map(name => \`
                  if (typeof \${name} === 'function') return \${name};
                \`).join('')}
                
                // If nothing found, return a placeholder
                return function ErrorComponent() {
                  return React.createElement('div', {
                    style: { padding: '20px', color: 'red', textAlign: 'center' }
                  }, 'Component execution failed');
                };
              })()
            \`;
            
            ComponentFunction = eval(wrapperCode);
            console.log('Wrapper approach succeeded');
            
          } catch (wrapperError) {
            console.error('Wrapper approach also failed:', wrapperError.message);
            throw new Error(\`All execution methods failed. Eval: \${evalError.message}, Wrapper: \${wrapperError.message}\`);
          }
        }
        
        // Create an error boundary wrapper
        class ErrorBoundary extends React.Component {
          constructor(props) {
            super(props);
            this.state = { hasError: false, error: null };
          }
          
          static getDerivedStateFromError(error) {
            return { hasError: true, error: error };
          }
          
          componentDidCatch(error, errorInfo) {
            console.error('React Error Boundary caught an error:', error, errorInfo);
          }
          
          render() {
            if (this.state.hasError) {
              return React.createElement('div', {
                style: {
                  padding: '20px',
                  color: '#ef4444',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  margin: '20px',
                  textAlign: 'center'
                }
              }, [
                React.createElement('h3', { key: 'title' }, 'Component Error'),
                React.createElement('p', { key: 'message' }, this.state.error?.message || 'An error occurred while rendering the component'),
                React.createElement('details', { key: 'details', style: { marginTop: '10px', textAlign: 'left' } }, [
                  React.createElement('summary', { key: 'summary' }, 'Error Details'),
                  React.createElement('pre', { 
                    key: 'stack', 
                    style: { fontSize: '12px', overflow: 'auto', marginTop: '5px' } 
                  }, this.state.error?.stack || 'No stack trace available')
                ])
              ]);
            }
            
            return this.props.children;
          }
        }
        
        // Render the component with error boundary
        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(
          React.createElement(ErrorBoundary, {}, 
            React.createElement(ComponentFunction)
          )
        );
        
        console.log('✅ Component rendered successfully');
        
      } catch (error) {
        console.error('❌ Component rendering failed:', error);
        console.error('Error details:', error.stack);
        
        // Fallback to static preview
        createStaticPreview(error.message);
      }
    }
    
    function createStaticPreview(errorMsg) {
      const hasHeader = /header|Header/i.test(componentCode);
      const hasButton = /button|Button/i.test(componentCode);
      const hasSection = /section|Section/i.test(componentCode);
      const hasFooter = /footer|Footer/i.test(componentCode);
      
      // Extract text content
      const textMatches = componentCode.match(/>([^<>{]{10,})</g);
      const sampleTexts = textMatches ? 
        textMatches.map(t => t.replace(/^>|<$/g, '').trim()).slice(0, 3) : 
        ['Sample Text Content'];
      
      // Extract background color
      const bgMatch = componentCode.match(/bg-\\[([^\\]]+)\\]|backgroundColor.*?['"]([^'"]+)['"]/);
      const bgColor = bgMatch ? (bgMatch[1] || bgMatch[2]) : '#015978';
      
      const staticPreview = React.createElement('div', {
        style: {
          minHeight: '100vh',
          background: bgColor.startsWith('#') ? bgColor : '#015978',
          color: 'white',
          fontFamily: 'system-ui, sans-serif'
        }
      }, [
        React.createElement('div', {
          key: 'error',
          style: {
            background: 'rgba(239, 68, 68, 0.1)',
            color: '#fecaca',
            padding: '10px',
            fontSize: '12px',
            borderBottom: '1px solid rgba(255,255,255,0.1)'
          }
        }, 'Static Preview (Component parsing failed): ' + errorMsg),
        
        hasHeader && React.createElement('header', {
          key: 'header',
          style: { padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.2)' }
        }, React.createElement('h1', {}, sampleTexts[0] || 'Header Title')),
        
        React.createElement('main', {
          key: 'main',
          style: { padding: '40px', textAlign: 'center' }
        }, [
          React.createElement('h1', {
            key: 'title',
            style: { fontSize: '36px', marginBottom: '20px' }
          }, sampleTexts[0] || 'Welcome'),
          
          sampleTexts[1] && React.createElement('p', {
            key: 'subtitle',
            style: { fontSize: '18px', marginBottom: '30px', opacity: 0.9 }
          }, sampleTexts[1]),
          
          hasButton && React.createElement('button', {
            key: 'button',
            style: {
              background: 'white',
              color: bgColor,
              padding: '12px 24px',
              border: 'none',
              borderRadius: '6px',
              fontSize: '16px',
              cursor: 'pointer'
            }
          }, 'Action Button')
        ]),
        
        hasFooter && React.createElement('footer', {
          key: 'footer',
          style: { 
            padding: '20px', 
            textAlign: 'center',
            borderTop: '1px solid rgba(255,255,255,0.2)',
            opacity: 0.8
          }
        }, '© 2024 Component Footer')
      ]);
      
      const root = ReactDOM.createRoot(document.getElementById('root'));
      root.render(staticPreview);
    }
    
    // Inject CSS content if available
    const cssContent = ${JSON.stringify(cssContent)};
    if (cssContent && cssContent.trim()) {
      const styleElement = document.createElement('style');
      styleElement.id = 'component-styles';
      styleElement.textContent = '/* Component CSS */\\n' + cssContent;
      document.head.appendChild(styleElement);
      console.log('📝 CSS injected:', cssContent.length + ' characters');
    }

    // Add timeout protection to prevent browser freezing
    let renderTimeout;
    let hasRendered = false;
    
    const timeoutHandler = () => {
      if (!hasRendered) {
        console.error('Preview rendering timed out');
        document.getElementById('root').innerHTML = 
          '<div class="error">Preview timed out. Component may be too complex. <button onclick="location.reload()">Reload</button></div>';
      }
    };
    
    // Set a 10-second timeout
    const globalTimeout = setTimeout(timeoutHandler, 10000);
    
    // Wait for libraries to load, then render
    setTimeout(() => {
      try {
        if (typeof React !== 'undefined' && typeof ReactDOM !== 'undefined' && typeof Babel !== 'undefined') {
          console.log('🎨 Styling info:', {
            usesTailwind: ${usesTailwind},
            hasCSSFiles: ${cssFiles.length > 0},
            cssContentLength: cssContent ? cssContent.length : 0,
            tailwindAvailable: typeof tailwind !== 'undefined'
          });
          
          // Wrap rendering in timeout protection
          renderTimeout = setTimeout(() => {
            if (!hasRendered) {
              console.error('Component rendering took too long');
              document.getElementById('root').innerHTML = 
                '<div class="error">Component rendering timed out. Try simplified preview mode.</div>';
            }
          }, 5000);
          
          renderComponent();
          hasRendered = true;
          clearTimeout(renderTimeout);
          clearTimeout(globalTimeout);
          
        } else {
          document.getElementById('root').innerHTML = 
            '<div class="error">Failed to load required libraries (React, ReactDOM, or Babel)</div>';
        }
      } catch (initError) {
        console.error('Preview initialization failed:', initError);
        document.getElementById('root').innerHTML = 
          '<div class="error">Preview initialization failed: ' + initError.message + '</div>';
      }
    }, 1500); // Increased timeout for Tailwind to fully load
  </script>
</body>
</html>`;
      
      setError(null);
      setIsProcessing(false);
      return html;
      
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create preview';
      setError(errorMsg);
      setIsProcessing(false);
      return `
<!DOCTYPE html>
<html><body>
  <div style="color: #ef4444; background: #fef2f2; padding: 12px; border-radius: 8px; border: 1px solid #fecaca; margin: 16px;">
    <strong>Preview Error:</strong> ${errorMsg}
  </div>
</body></html>`;
    }
  }, [code, componentName, files, previewMode]);

  // Helper function for simplified preview
  const createSimplifiedPreview = (code: string, componentName: string) => {
    const textContent = code.match(/>([^<]{10,})</g)?.map(m => m.replace(/[><]/g, '').trim()).slice(0, 5) || ['Sample Content'];
    const hasButton = /button|Button/i.test(code);
    const hasImage = /img|Image/i.test(code);
    
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Simplified Preview</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f9fafb; }
    .preview-container { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .preview-header { color: #6b7280; font-size: 12px; margin-bottom: 15px; }
    .content { line-height: 1.6; }
    .button { background: #3b82f6; color: white; padding: 8px 16px; border: none; border-radius: 4px; margin: 5px; }
  </style>
</head>
<body>
  <div class="preview-container">
    <div class="preview-header">⚡ Simplified Preview: ${componentName}</div>
    <div class="content">
      ${textContent.map(text => `<p>${text}</p>`).join('')}
      ${hasButton ? '<button class="button">Sample Button</button>' : ''}
      ${hasImage ? '<div style="width: 100px; height: 60px; background: #e5e7eb; border-radius: 4px; margin: 10px 0;"></div>' : ''}
    </div>
  </div>
</body>
</html>`;
  };

  // Helper function for static preview
  const createStaticPreview = (code: string, componentName: string) => {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Static Preview</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f1f5f9; }
    .static-container { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); text-align: center; }
    .static-header { color: #475569; font-size: 14px; margin-bottom: 20px; }
    .static-content { color: #64748b; }
  </style>
</head>
<body>
  <div class="static-container">
    <div class="static-header">📄 Static Preview: ${componentName}</div>
    <div class="static-content">
      <p>Component is too complex for live preview.</p>
      <p>Generated code length: ${code.length} characters</p>
      <p>Switch to code view to see the generated component.</p>
    </div>
  </div>
</body>
</html>`;
  };

  // Simple preview component for direct rendering (fallback)
  const SimplePreview = useMemo(() => {
    try {
      // Very basic component extraction for direct rendering
      let cleanCode = code
        .replace(/import.*from.*['"][^'"]*['"];?\s*/g, '')
        .replace(/export\s+default\s+/g, '')
        .replace(/export\s+/g, '')
        .replace(/interface\s+\w+\s*{[^}]*}/g, '')
        .replace(/type\s+\w+\s*=\s*[^;]+;/g, '')
        .trim();

      // For very simple cases, try to extract just the JSX return
      const returnMatch = cleanCode.match(/return\s*\(([\s\S]*)\);?\s*}?\s*$/);
      if (returnMatch) {
        const jsxContent = returnMatch[1].trim();
        return () => React.createElement('div', { 
          className: 'p-4 text-center text-gray-600 bg-blue-50 rounded border border-blue-200' 
        }, 'Simple JSX Preview: ', jsxContent.substring(0, 100) + '...');
      }

      return () => React.createElement('div', { 
        className: 'p-4 text-center text-gray-600 bg-yellow-50 rounded border border-yellow-200' 
      }, 'Use iframe preview for full component rendering');
      
    } catch (err) {
      return () => React.createElement('div', { 
        className: 'p-4 text-red-600 bg-red-50 rounded border border-red-200' 
      }, 'Component parsing failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  }, [code]);

  if (error && !useIframe) {
    return (
      <div className="flex items-center justify-center h-64 bg-red-50 rounded-lg border border-red-200">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-red-800 mb-2">Preview Error</h3>
          <p className="text-red-600 text-sm max-w-md">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Preview Mode Toggle */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-700">Live Component Preview</h4>
        <div className="flex items-center gap-2">
          {/* Preview Quality Mode */}
          <select
            value={previewMode}
            onChange={(e) => setPreviewMode(e.target.value as 'full' | 'simplified' | 'static')}
            className="text-xs px-2 py-1 border border-gray-300 rounded-md"
          >
            <option value="full">Full Preview</option>
            <option value="simplified">Simplified</option>
            <option value="static">Static</option>
          </select>
          
          {/* Iframe Toggle */}
          <button
            onClick={() => setUseIframe(!useIframe)}
            className="flex items-center gap-2 px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            {useIframe ? (
              <>
                <Monitor className="w-3 h-3" />
                Isolated
              </>
            ) : (
              <>
                <Eye className="w-3 h-3" />
                Direct
              </>
            )}
          </button>
        </div>
      </div>

      {/* Preview Container */}
      <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
        {useIframe ? (
          <iframe
            srcDoc={iframeContent}
            className="w-full h-96 border-none"
            sandbox="allow-scripts allow-same-origin"
            title={`Component Preview - ${componentName}`}
          />
        ) : (
          <div className="p-4 min-h-64">
            <div className="border-b border-gray-200 pb-2 mb-4">
              <span className="text-xs text-gray-500">Direct Preview - {componentName}</span>
            </div>
            <div className="component-preview">
              <SimplePreview />
            </div>
          </div>
        )}
      </div>
      
      <div className="text-xs text-gray-500 text-center">
        {isProcessing && (
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <span>Processing preview...</span>
          </div>
        )}
        {useIframe ? (
          <>
            <Monitor className="w-3 h-3 inline mr-1" />
            Iframe mode: {previewMode === 'full' ? 'Full component rendering' : previewMode === 'simplified' ? 'Simplified preview' : 'Static preview'} 
            {code.length > 30000 && <span className="text-amber-600"> (Large component: {Math.round(code.length/1000)}KB)</span>}
          </>
        ) : (
          <>
            <Eye className="w-3 h-3 inline mr-1" />
            Direct mode: Simplified rendering (limited TypeScript support)
          </>
        )}
      </div>
    </div>
  );
}