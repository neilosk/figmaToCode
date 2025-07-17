'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, AlertCircle, RefreshCw } from 'lucide-react';

interface ComponentData {
  componentName: string;
  code: string;
  timestamp: number;
  lineCount: number;
  frameName?: string;
  files?: Array<{ name: string; content: string; type: string }>;
}

export default function ComponentRenderPage() {
  const params = useParams();
  const frameName = params.frameName as string;
  
  const [components, setComponents] = useState<ComponentData[]>([]);
  const [selectedComponent, setSelectedComponent] = useState<ComponentData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);

  const fetchComponents = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/preview?frame=${encodeURIComponent(frameName)}`);
      const data = await response.json();
      
      if (response.ok) {
        setComponents(data.components);
        
        // Auto-select the first component if none selected
        if (!selectedComponent && data.components.length > 0) {
          setSelectedComponent(data.components[0]);
        }
      } else {
        setError('Failed to fetch components');
      }
    } catch (err) {
      setError('Error connecting to preview API');
      console.error('Preview fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (frameName) {
      fetchComponents();
    }
  }, [frameName]);

  const displayFrameName = frameName ? decodeURIComponent(frameName).replace(/[-_]/g, ' ') : 'Unknown';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link 
              href={`/preview/${encodeURIComponent(frameName)}`}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-lg font-semibold">
              {displayFrameName} - Visual Preview
            </h1>
          </div>
          <div className="flex items-center space-x-3">
            <select
              value={selectedComponent?.componentName || ''}
              onChange={(e) => {
                const component = components.find(c => c.componentName === e.target.value);
                setSelectedComponent(component || null);
              }}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="">Select component...</option>
              {components.map((comp, index) => (
                <option key={index} value={comp.componentName}>
                  {comp.componentName}
                </option>
              ))}
            </select>
            <button
              onClick={fetchComponents}
              disabled={loading}
              className="flex items-center space-x-2 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors text-sm"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {components.length === 0 && !loading ? (
          <div className="text-center py-12">
            <div className="text-gray-500">
              <h2 className="text-xl font-semibold mb-2">No components found</h2>
              <p className="mb-4">No components have been generated for "{displayFrameName}" yet.</p>
              <Link 
                href="/"
                className="inline-flex items-center px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
              >
                Generate Components
              </Link>
            </div>
          </div>
        ) : selectedComponent ? (
          <div className="space-y-4">
            {/* Component Info */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h2 className="text-lg font-semibold mb-2">{selectedComponent.componentName}</h2>
              <div className="text-sm text-gray-600 space-y-1">
                <p>Lines of code: {selectedComponent.lineCount}</p>
                <p>Generated: {new Date(selectedComponent.timestamp).toLocaleString()}</p>
                <p>Frame: {displayFrameName}</p>
              </div>
            </div>

            {/* Component Render */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                <h3 className="font-medium text-gray-900">Live Component Preview</h3>
              </div>
              <div className="p-6">
                <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
                  <ComponentRenderer 
                    code={selectedComponent.code}
                    componentName={selectedComponent.componentName}
                    files={selectedComponent.files}
                    onError={setRenderError}
                  />
                </div>
                {renderError && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-700 text-sm">{renderError}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">Select a component from the dropdown to preview</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Simple component renderer
function ComponentRenderer({ 
  code, 
  componentName, 
  files, 
  onError 
}: { 
  code: string; 
  componentName: string; 
  files?: Array<{ name: string; content: string; type: string }>; 
  onError: (error: string | null) => void;
}) {
  const [renderedContent, setRenderedContent] = useState<string>('');

  useEffect(() => {
    try {
      onError(null);
      
      // Minimal code cleaning - just remove HTML artifacts
      const cleanCode = code
        .replace(/<span[^>]*>/g, '') // Remove span tags
        .replace(/<\/span>/g, '')
        .replace(/style="[^"]*"/g, '') // Remove inline styles
        .trim();

      // Enhanced CSS detection logic
      const hasClassNames = cleanCode.includes('className=');
      
      // Detect Tailwind classes (utility-first classes)
      const usesTailwind = hasClassNames && 
        (cleanCode.includes('bg-') || cleanCode.includes('text-') || cleanCode.includes('flex') || 
         cleanCode.includes('grid') || cleanCode.includes('p-') || cleanCode.includes('m-') ||
         cleanCode.includes('w-') || cleanCode.includes('h-') || cleanCode.includes('border-') ||
         cleanCode.includes('rounded') || cleanCode.includes('shadow') || cleanCode.includes('hover:'));
      
      // Detect CSS Modules
      const usesCSSModules = cleanCode.includes('import styles from') || 
                            cleanCode.includes('import * as styles from') ||
                            cleanCode.includes('styles.');
      
      // Detect regular CSS classes (non-Tailwind, non-CSS Modules)
      const usesRegularCSS = hasClassNames && !usesTailwind && !usesCSSModules;
      
      // Extract CSS files from the files prop
      const cssFiles = files?.filter(file => file.type === 'css' || file.name.endsWith('.css')) || [];
      const hasCSSFiles = cssFiles.length > 0;
      
      console.log('CSS Detection:', {
        hasClassNames,
        usesTailwind,
        usesCSSModules,
        usesRegularCSS,
        hasCSSFiles,
        cssFileCount: cssFiles.length
      });
      
      // Load Tailwind if using Tailwind classes OR if using CSS Modules (we'll convert them)
      const needsTailwind = usesTailwind || usesCSSModules;

      // Pre-compute component wrapper name for function wrapping
      const componentWrapperName = componentName.replace(/[^a-zA-Z0-9]/g, '') || 'GeneratedComponent';

      // Create HTML content with better error handling
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Component Preview</title>
          <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
          <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
          <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
          ${needsTailwind ? '<script src="https://cdn.tailwindcss.com"></script>' : ''}
          <style>
            /* Base styles for preview */
            body { 
              margin: 0; 
              padding: 20px; 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: #f9fafb;
            }
            
            /* Override background for regular CSS components */
            ${usesRegularCSS || hasCSSFiles ? `
            body {
              background: transparent;
              padding: 0;
            }
            #root {
              min-height: 100vh;
              width: 100%;
            }
            ` : ''}
            .error { 
              color: #ef4444; 
              background: #fef2f2; 
              padding: 16px; 
              border-radius: 8px; 
              border: 1px solid #fecaca;
              margin: 16px;
            }
            
            /* Enhanced styles for CSS Modules components */
            ${usesCSSModules ? `
            /* Icon placeholders - common CSS Modules pattern */
            .dragDropIcon, .searchIcon, .notificationIcon, .listViewIcon, .gridViewIcon,
            .houseIcon, .advisorIcon, .starIcon, .targetIcon, .headphonesIcon, .packageIcon,
            .folderIcon, .documentIcon, .briefcaseIcon, .layersIcon, .plusIcon, .deleteIcon,
            .checkOutlinedIcon, .chevronDownIcon, .eyeIcon, .checkCircleIcon, .exclamationCircleIcon,
            .infoIcon, .questionMarkIcon, .resetIcon, .checkCircleIconGreen, .checkCircleIconSmall,
            .checkIconWhite, .leftArrowIcon {
              width: 16px;
              height: 16px;
              background: #9ca3af;
              border-radius: 2px;
              display: inline-block;
              opacity: 0.7;
            }
            
            .checkboxCheckmark {
              width: 8px;
              height: 8px;
              background: white;
              border-radius: 1px;
            }
            
            .stepperDot {
              width: 8px;
              height: 8px;
              background: white;
              border-radius: 50%;
            }
            
            .dragDropLine {
              height: 2px;
              background: #6b7280;
              margin: 2px 0;
              border-radius: 1px;
            }
            
            .listViewLine, .listViewLineSmall, .listViewLineTiny {
              height: 2px;
              background: #6b7280;
              margin: 1px 0;
              border-radius: 1px;
            }
            
            .listViewDot {
              width: 4px;
              height: 4px;
              background: #6b7280;
              border-radius: 50%;
              margin: 1px 0;
            }
            
            .gridSquare {
              width: 6px;
              height: 6px;
              background: #6b7280;
              border-radius: 1px;
              margin: 1px;
              display: inline-block;
            }
            
            .notificationDot {
              width: 8px;
              height: 8px;
              background: #ef4444;
              border-radius: 50%;
              position: absolute;
              top: 0;
              right: 0;
            }
            
            .bottomLine {
              height: 1px;
              background: #e5e7eb;
              width: 100%;
            }
            ` : ''}
            
            /* Injected CSS from component files */
            ${cssFiles.map(cssFile => cssFile.content).join('\n\n')}
          </style>
        </head>
        <body>
          <div id="root">
            <div style="text-align: center; padding: 20px; color: #6b7280;">
              Loading component...
            </div>
          </div>
          
          <script>
            function renderComponent() {
              try {
                const componentCode = \`${cleanCode.replace(/`/g, '\\`').replace(/\\/g, '\\\\')}\`;
                console.log('Original component code:', componentCode);
                
                // Clean the code for execution - be more careful to preserve JSX
                let processedCode = componentCode;
                
                // Check if this is a CSS Modules component
                const hasCSSModules = componentCode.includes('import styles from') || 
                                    componentCode.includes('import * as styles from');
                
                // Remove imports line by line to avoid corrupting JSX
                processedCode = processedCode
                  .split('\\n')
                  .filter(line => {
                    const trimmed = line.trim();
                    return !trimmed.startsWith('import ') && 
                           !trimmed.match(/^import\\s+['"']/) &&
                           !trimmed.startsWith('export ') &&
                           !trimmed.startsWith('interface ') &&
                           !trimmed.startsWith('type ') &&
                           !trimmed.match(/^\\s*\\/\\*/) && // Remove comments
                           !trimmed.match(/^\\s*\\/\\//) && // Remove single line comments
                           trimmed !== '';
                  })
                  .join('\\n');
                
                // Handle CSS modules - convert to Tailwind-style or basic styling
                if (hasCSSModules) {
                  // Extract CSS class names from the original code for better mapping
                  const cssClasses = [];
                  const classMatches = componentCode.match(/className={styles\\.[\\w]+}/g) || [];
                  classMatches.forEach(match => {
                    const className = match.match(/styles\\.(\\w+)/)?.[1];
                    if (className) cssClasses.push(className);
                  });
                  
                  // Replace styles.xxx with basic styling classes
                  processedCode = processedCode
                    .replace(/className={styles\\.([\\w]+)}/g, (match, className) => {
                      // Map common CSS class names to Tailwind equivalents
                      const tailwindMap = {
                        // Layout containers
                        'container': 'max-w-7xl mx-auto px-4',
                        'productsContainer': 'min-h-screen bg-gray-50 font-sans',
                        'mainContent': 'flex-1 p-6 max-w-4xl mx-auto',
                        'leftNavBar': 'w-64 bg-white shadow-sm border-r min-h-screen',
                        'scrollspy': 'w-48 bg-gray-50 p-4 border-l',
                        'bottomBar': 'bg-white border-t shadow-sm',
                        
                        // Cards and content
                        'card': 'bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6',
                        'innerCard': 'bg-gray-50 rounded-lg p-4 mb-4',
                        'cardHeader': 'flex items-center justify-between mb-4',
                        
                        // Navigation
                        'topBar': 'bg-white border-b px-4 py-3 flex items-center justify-between',
                        'topBarLeft': 'flex items-center space-x-4',
                        'topBarRight': 'flex items-center space-x-3',
                        'navItem': 'flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100',
                        'navItemText': 'text-gray-700 text-sm',
                        'navItemTextBlue': 'text-blue-600 text-sm',
                        
                        // Form elements
                        'inputField': 'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500',
                        'inputFieldLight': 'w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50',
                        'inputFieldContainer': 'flex-1 min-w-0',
                        'inputFieldRow': 'flex gap-4 mb-4',
                        'inputFieldRowEnd': 'flex gap-4',
                        'inputLabelWrapper': 'flex items-center gap-1 mb-1',
                        'labelText14px500': 'text-sm font-medium text-gray-700',
                        'labelText14px500Light': 'text-sm font-medium text-gray-500',
                        'inputFieldText': 'text-gray-900',
                        'inputFieldTextDark': 'text-gray-900 font-medium',
                        'inputFieldTextLight': 'text-gray-500',
                        'helpTextContainer': 'flex items-center gap-1 mt-1',
                        'helpCaption12px500': 'text-xs text-gray-500',
                        'asterisk': 'text-red-500 text-sm',
                        
                        // Buttons
                        'button': 'px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600',
                        'addButtonHidden': 'hidden',
                        'completeButton': 'px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700',
                        'previewButton': 'w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300',
                        'saveButtonHidden': 'hidden',
                        
                        // Typography
                        'heading18px700': 'text-lg font-bold text-gray-900',
                        'heading18px500': 'text-lg font-medium text-gray-800',
                        'buttonText14px700': 'text-sm font-bold',
                        'buttonText14px700White': 'text-sm font-bold text-white',
                        'topBarUserName': 'text-sm text-gray-700',
                        'quickLinksText': 'text-sm text-gray-700',
                        'dbText': 'text-sm font-medium text-gray-700',
                        
                        // Icons and UI elements
                        'toggle': 'w-12 h-6 bg-blue-500 rounded-full relative',
                        'toggleUnchecked': 'w-12 h-6 bg-gray-300 rounded-full relative',
                        'toggleCircle': 'w-5 h-5 bg-white rounded-full absolute top-0.5 right-0.5 shadow-sm',
                        'checkboxChecked': 'w-5 h-5 bg-blue-500 rounded border border-blue-500 flex items-center justify-center',
                        'checkboxUnchecked': 'w-5 h-5 bg-white rounded border border-gray-300',
                        'checkboxItem': 'flex items-center space-x-2',
                        'checkboxRow': 'flex space-x-6 mb-4',
                        'checkboxText': 'text-sm text-gray-700',
                        
                        // Status and feedback
                        'successMessage': 'flex items-center space-x-2 p-3 bg-green-50 border border-green-200 rounded-lg mb-4',
                        'successMessageText': 'text-sm text-green-700',
                        
                        // Stepper
                        'stepperContainer': 'flex items-center justify-center space-x-4 pb-4',
                        'stepperStep': 'flex flex-col items-center space-y-2',
                        'stepperLine': 'w-16 h-0.5 bg-gray-300',
                        'stepperIconChecked': 'w-6 h-6 bg-green-500 rounded-full flex items-center justify-center',
                        'stepperIconActive': 'w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center',
                        'stepperTextChecked': 'text-xs text-green-600',
                        'stepperTextActive': 'text-xs text-blue-600',
                        
                        // Scrollspy
                        'scrollspyHeading': 'text-sm font-semibold text-gray-800 mb-3',
                        'scrollspyMenuItems': 'space-y-2 mb-4',
                        'scrollspyMenuItem': 'flex items-center justify-between p-2 rounded text-sm text-gray-600',
                        'scrollspyMenuItemActive': 'flex items-center justify-between p-2 rounded text-sm bg-blue-50 text-blue-700',
                        'scrollspyMenuItemText': 'text-gray-600',
                        'scrollspyMenuItemTextActive': 'text-blue-700',
                        
                        // Limits section
                        'limitsSection': 'flex gap-6 mb-6',
                        'limitsSectionSingleRow': 'mb-6',
                        'limitColumn': 'flex-1',
                        'limitHeader': 'flex items-center space-x-2 mb-4',
                        'verticalLine': 'w-px h-full bg-gray-200',
                        'inputFieldCurrency': 'flex items-center px-3 py-2 border border-gray-300 rounded-md',
                        'currencySymbol': 'text-gray-500 ml-2',
                        'resetIconContainer': 'ml-2',
                        
                        // Additional common CSS Modules classes
                        'topBarIconContainer': 'relative p-2 hover:bg-gray-100 rounded',
                        'navIconContainer': 'w-8 h-8 bg-gray-100 rounded flex items-center justify-center',
                        'navIconContainerLight': 'w-8 h-8 bg-gray-200 rounded flex items-center justify-center',
                        'navIconContainerBlue': 'w-8 h-8 bg-blue-100 rounded flex items-center justify-center',
                        'quickLinksButton': 'flex items-center space-x-2 px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200',
                        'dbButton': 'w-8 h-8 bg-gray-700 text-white rounded flex items-center justify-center',
                        'deleteIconHidden': 'hidden',
                        'inputFieldContainerHidden': 'hidden',
                        'dragDropIconContainer': 'p-2',
                        'bottomBarHeader': 'flex items-center justify-between p-4',
                        'bottomBarTitle': 'flex items-center space-x-2',
                        'bottomBarButtons': 'flex items-center space-x-2',
                        'bottomLine': 'h-px bg-gray-200 w-full',
                        
                        // Generic utilities
                        'hidden': 'hidden',
                        'visible': 'block',
                        'active': 'bg-blue-100 text-blue-800',
                        'disabled': 'opacity-50 cursor-not-allowed',
                        'flex': 'flex items-center space-x-4',
                        'grid': 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6',
                        'text': 'text-gray-900',
                        'title': 'text-2xl font-bold mb-4',
                        'subtitle': 'text-lg text-gray-600 mb-2',
                        'content': 'text-gray-700 leading-relaxed'
                      };
                      
                      // Use mapped class or fallback to basic styling
                      const mappedClass = tailwindMap[className] || 
                                        \`p-2 border border-gray-200 rounded bg-white text-gray-700\`;
                      return \`className="\${mappedClass}"\`;
                    })
                    .replace(/styles\\.[\\w]+/g, '""'); // Remove any remaining styles references
                } else {
                  // For non-CSS modules, just remove any stray styles references
                  processedCode = processedCode
                    .replace(/className={styles\\.[\\w]+}/g, 'className=""')
                    .replace(/styles\\.[\\w]+/g, '""');
                }
                
                // Enhanced function detection and preservation with better validation
                
                // Helper function to count braces and check balance
                function countBraces(code) {
                  const openBraces = (code.match(/\\{/g) || []).length;
                  const closeBraces = (code.match(/\\}/g) || []).length;
                  return { openBraces, closeBraces, isBalanced: openBraces === closeBraces };
                }
                
                // More robust function detection
                const functionPatterns = [
                  /export\\s+default\\s+function\\s+([A-Z][A-Za-z0-9]*)\\s*\\([^)]*\\)\\s*\\{/,
                  /function\\s+([A-Z][A-Za-z0-9]*)\\s*\\([^)]*\\)\\s*\\{/,
                  /const\\s+([A-Z][A-Za-z0-9]*)\\s*=\\s*\\([^)]*\\)\\s*=>\\s*\\{/,
                  /const\\s+([A-Z][A-Za-z0-9]*)\\s*=\\s*function\\s*\\([^)]*\\)\\s*\\{/
                ];
                
                let detectedFunctionName = null;
                let hasProperFunctionStructure = false;
                
                // Check for proper function structure
                for (const pattern of functionPatterns) {
                  const match = processedCode.match(pattern);
                  if (match) {
                    detectedFunctionName = match[1];
                    hasProperFunctionStructure = true;
                    break;
                  }
                }
                
                // Additional checks for function structure
                const hasReturnStatement = processedCode.includes('return');
                const braceAnalysis = countBraces(processedCode);
                
                console.log('Enhanced function detection:', { 
                  detectedFunctionName, 
                  hasProperFunctionStructure, 
                  hasReturnStatement,
                  braceAnalysis
                });
                
                // Determine if we need to wrap or just clean up exports
                const needsWrapping = !hasProperFunctionStructure && hasReturnStatement;
                
                if (hasProperFunctionStructure) {
                  // We have a proper function structure - just clean up exports
                  console.log('Proper function structure detected, cleaning up exports only');
                  processedCode = processedCode
                    .replace(/export\\s+default\\s+function/g, 'function')
                    .replace(/export\\s+default\\s+/g, '')
                    .replace(/export\\s+function/g, 'function')
                    .replace(/export\\s+const/g, 'const');
                } else if (needsWrapping) {
                  // Check if this is truly a bare return statement scenario
                  const trimmedCode = processedCode.trim();
                  const startsWithReturn = trimmedCode.startsWith('return');
                  const hasOnlyReturn = !trimmedCode.includes('function ') && !trimmedCode.includes('const ') && !trimmedCode.includes('var ');
                  
                  if (startsWithReturn && hasOnlyReturn) {
                    // This looks like a bare return statement - wrap it
                    console.log('Detected bare return statement, wrapping in function');
                    console.log('Brace analysis:', braceAnalysis);
                    
                    const wrapperName = '${componentWrapperName}';
                    processedCode = \`function \${wrapperName}() {
  \${processedCode}
}\`;
                  } else {
                    // Complex case - try standard export cleanup and let Babel handle it
                    console.log('Complex function structure, applying standard processing');
                    console.log('Debug info:', { startsWithReturn, hasOnlyReturn, braceAnalysis });
                    processedCode = processedCode
                      .replace(/export\\s+default\\s+function/g, 'function')
                      .replace(/export\\s+default\\s+/g, '')
                      .replace(/export\\s+function/g, 'function')
                      .replace(/export\\s+const/g, 'const');
                  }
                } else {
                  // No return statement or unclear structure - apply standard processing
                  console.log('No clear function structure, applying standard processing');
                  processedCode = processedCode
                    .replace(/export\\s+default\\s+function/g, 'function')
                    .replace(/export\\s+default\\s+/g, '')
                    .replace(/export\\s+function/g, 'function')
                    .replace(/export\\s+const/g, 'const');
                }
                  
                // Remove TypeScript types more carefully
                processedCode = processedCode
                  .replace(/:\\s*React\\.FC<[^>]*>/g, '')
                  .replace(/:\\s*React\\.FC/g, '')
                  .replace(/:\\s*FC<[^>]*>/g, '')
                  .replace(/:\\s*FC/g, '')
                  .replace(/:\\s*JSX\\.Element/g, '')
                  .replace(/:\\s*ReactElement/g, '')
                  .replace(/:\\s*ReactNode/g, '')
                  
                // Clean up parameter types but preserve JSX
                processedCode = processedCode
                  .replace(/\\(([^)]*?):\\s*[A-Za-z][A-Za-z0-9<>\\[\\]]*\\)/g, '($1)')
                  .replace(/\\{([^}]*?):\\s*[A-Za-z][A-Za-z0-9<>\\[\\]]*;?\\s*/g, '{$1 ')
                  .replace(/\\{([^}]*?):\\s*[A-Za-z][A-Za-z0-9<>\\[\\]]*\\}/g, '{$1}')
                  .trim();
                
                console.log('Processed code:', processedCode);
                
                // Additional post-processing to fix common JavaScript syntax errors
                // This runs AFTER all existing processing to avoid breaking working code
                try {
                  processedCode = processedCode
                    // Fix common style object issues that cause SyntaxError
                    .replace(/style={{([^}]*?)}}/g, (match, content) => {
                      try {
                        // Only process if the content looks problematic
                        if (content.includes('\\n') || content.includes(';') || content.includes(': ')) {
                          const cleanContent = content
                            .replace(/\\s*\\n\\s*/g, ' ') // Remove newlines within style objects
                            .replace(/;(\\s*[^,}])/g, ',$1') // Convert CSS semicolons to JS commas where appropriate
                            .replace(/,\\s*}/g, '}') // Remove trailing comma before closing brace
                            .trim();
                          return \`style={{\${cleanContent}}}\`;
                        }
                        return match; // Return unchanged if no issues detected
                      } catch (e) {
                        console.warn('Style object processing failed, keeping original:', match);
                        return match;
                      }
                    })
                    // Fix any remaining malformed object syntax
                    .replace(/\\{\\s*([^}]*?)\\s*:\\s*([^},]*?)\\s*;\\s*\\}/g, '{$1: $2}')
                    // Remove any stray semicolons in JSX attributes
                    .replace(/=\\{([^}]*?);([^}]*?)\\}/g, '={$1$2}');
                } catch (postProcessError) {
                  console.warn('Post-processing failed, using original code:', postProcessError);
                  // Don't throw - use the original processed code
                }
                
                // Enhanced validation that accounts for function wrapping
                if (!processedCode.includes('return')) {
                  throw new Error('Incomplete component code - missing return statement');
                }
                
                // Check if we have a function wrapper OR a bare return (which we may have wrapped)
                const hasFunctionWrapper = processedCode.includes('function ');
                const hasReturnInCode = processedCode.includes('return');
                
                if (!hasFunctionWrapper && !hasReturnInCode) {
                  throw new Error('Incomplete component code - missing function wrapper or return statement');
                }
                
                // Additional validation for JSX structure
                const hasJSXStructure = processedCode.includes('(') || processedCode.includes('<');
                if (!hasJSXStructure) {
                  console.warn('Warning: No JSX structure detected in component code');
                }
                
                // Enhanced brace balance validation and correction
                const openParens = (processedCode.match(/\\(/g) || []).length;
                const closeParens = (processedCode.match(/\\)/g) || []).length;
                const openBraces = (processedCode.match(/\\{/g) || []).length;
                const closeBraces = (processedCode.match(/\\}/g) || []).length;
                
                const parenImbalance = openParens - closeParens;
                const braceImbalance = openBraces - closeBraces;
                
                console.log('Brace analysis after processing:', {
                  openParens, closeParens, parenImbalance,
                  openBraces, closeBraces, braceImbalance
                });
                
                // Try to fix minor brace imbalances
                if (braceImbalance > 0 && braceImbalance <= 2) {
                  // Too many opening braces - try to remove trailing ones
                  console.log('Attempting to fix excess opening braces');
                  processedCode = processedCode.replace(/\\{\\s*$/, '');
                } else if (braceImbalance < 0 && braceImbalance >= -2) {
                  // Too many closing braces - try to remove trailing ones
                  console.log('Attempting to fix excess closing braces');
                  processedCode = processedCode.replace(/\\}\\s*$/, '');
                }
                
                if (Math.abs(parenImbalance) > 2 || Math.abs(braceImbalance) > 2) {
                  console.warn('Significant bracket imbalance detected:', { parenImbalance, braceImbalance });
                }
                
                // Transform with Babel - Enhanced error handling
                let transformedCode;
                try {
                  transformedCode = Babel.transform(processedCode, {
                    presets: ['react']
                  }).code;
                } catch (babelError) {
                  console.error('Babel transformation failed:', babelError);
                  
                  // Try to provide helpful error information
                  if (babelError.message.includes('Unexpected token')) {
                    // Try to identify the problematic line
                    const lines = processedCode.split('\\n');
                    const errorLine = babelError.loc ? babelError.loc.line : null;
                    
                    console.error('Problematic code around line', errorLine);
                    if (errorLine && lines[errorLine - 1]) {
                      console.error('Line content:', lines[errorLine - 1]);
                    }
                    
                    // Try a more aggressive cleanup for syntax errors
                    console.log('Attempting more aggressive cleanup...');
                    let cleanedCode = processedCode
                      // Remove any remaining TypeScript syntax
                      .replace(/\\s*style={{[^}]*?\\s*;[^}]*?}}/g, ' style={{}}')
                      // Remove problematic inline styles completely if they're causing issues
                      .replace(/style={{[^}]*?}}/g, 'style={{}}')
                      // Remove any remaining interface or type definitions
                      .replace(/interface\\s+[A-Za-z][A-Za-z0-9]*\\s*\\{[^}]*\\}/g, '')
                      // Remove any remaining type annotations
                      .replace(/:\\s*[A-Z][A-Za-z0-9]*(<[^>]*>)?/g, '');
                    
                    try {
                      transformedCode = Babel.transform(cleanedCode, {
                        presets: ['react']
                      }).code;
                      console.log('Aggressive cleanup successful');
                    } catch (secondError) {
                      console.error('Even aggressive cleanup failed:', secondError);
                      throw babelError; // Throw the original error
                    }
                  } else {
                    throw babelError;
                  }
                }
                
                console.log('Transformed code:', transformedCode);
                
                // Enhanced component pattern detection - consistent with earlier logic
                const componentPatterns = [
                  /function\\s+([A-Z][A-Za-z0-9]*)\\s*\\([^)]*\\)\\s*\\{/,
                  /const\\s+([A-Z][A-Za-z0-9]*)\\s*=\\s*\\([^)]*\\)\\s*=>\\s*\\{/,
                  /const\\s+([A-Z][A-Za-z0-9]*)\\s*=\\s*function\\s*\\([^)]*\\)\\s*\\{/,
                  /var\\s+([A-Z][A-Za-z0-9]*)\\s*=\\s*function\\s*\\([^)]*\\)\\s*\\{/,
                  /let\\s+([A-Z][A-Za-z0-9]*)\\s*=\\s*function\\s*\\([^)]*\\)\\s*\\{/,
                  // Fallback patterns for simpler cases
                  /function\\s+([A-Z][A-Za-z0-9]*)/,
                  /const\\s+([A-Z][A-Za-z0-9]*)\\s*=/,
                  /var\\s+([A-Z][A-Za-z0-9]*)\\s*=/,
                  /let\\s+([A-Z][A-Za-z0-9]*)\\s*=/
                ];
                
                const detectedNames = [];
                componentPatterns.forEach(pattern => {
                  const match = processedCode.match(pattern);
                  if (match && match[1]) {
                    detectedNames.push(match[1]);
                  }
                });
                
                // Also check if we detected the function name earlier in the enhanced detection
                if (detectedFunctionName && !detectedNames.includes(detectedFunctionName)) {
                  detectedNames.unshift(detectedFunctionName); // Add to beginning for priority
                }
                
                console.log('Detected component names:', detectedNames);
                
                // Execute the code
                let ComponentFunction = null;
                
                try {
                  // For const declarations, we need to execute in a way that creates global variables
                  let executableCode = transformedCode;
                  
                  // Convert const declarations to global assignments for better access
                  if (executableCode.includes('const ')) {
                    console.log('Converting const declarations to global assignments');
                    executableCode = executableCode.replace(/const\\s+([A-Z][A-Za-z0-9]*)\\s*=/g, 'window.$1 =');
                  }
                  
                  // Also ensure any arrow functions are assigned to window
                  for (const name of detectedNames) {
                    if (executableCode.includes(\`\${name} = \`) && !executableCode.includes(\`window.\${name}\`)) {
                      executableCode = executableCode.replace(new RegExp(\`\${name}\\\\s*=\`, 'g'), \`window.\${name} =\`);
                    }
                  }
                  
                  console.log('Executing code:', executableCode.substring(0, 200) + '...');
                  
                  eval(executableCode);
                  
                  console.log('Code executed successfully');
                  console.log('Window keys after execution:', Object.keys(window).filter(k => typeof window[k] === 'function' && k.charAt(0) === k.charAt(0).toUpperCase()));
                  
                  // Try each detected name
                  for (const name of detectedNames) {
                    if (typeof window[name] === 'function') {
                      ComponentFunction = window[name];
                      console.log('Found component function:', name);
                      break;
                    } else {
                      console.log('Checking', name, ':', typeof window[name]);
                    }
                  }
                  
                  // If still not found, try all uppercase functions
                  if (!ComponentFunction) {
                    const allFunctions = Object.keys(window).filter(key => 
                      typeof window[key] === 'function' && 
                      key.charAt(0) === key.charAt(0).toUpperCase() &&
                      !['React', 'ReactDOM', 'Babel', 'Component', 'PureComponent', 'Fragment'].includes(key)
                    );
                    
                    console.log('All potential component functions:', allFunctions);
                    
                    if (allFunctions.length > 0) {
                      ComponentFunction = window[allFunctions[allFunctions.length - 1]];
                      console.log('Using fallback component:', allFunctions[allFunctions.length - 1]);
                    }
                  }
                  
                  // If still not found, try a wrapper function approach
                  if (!ComponentFunction && detectedNames.length > 0) {
                    console.log('Trying wrapper function approach');
                    try {
                      const wrapperCode = \`
                        (function() {
                          \${transformedCode}
                          return \${detectedNames[0]};
                        })()
                      \`;
                      ComponentFunction = eval(wrapperCode);
                      console.log('Wrapper function result:', typeof ComponentFunction);
                    } catch (wrapperError) {
                      console.error('Wrapper function failed:', wrapperError);
                    }
                  }
                  
                } catch (evalError) {
                  console.error('Eval error:', evalError);
                  throw evalError;
                }
                
                if (ComponentFunction && typeof ComponentFunction === 'function') {
                  console.log('Rendering component...');
                  const root = ReactDOM.createRoot(document.getElementById('root'));
                  root.render(React.createElement(ComponentFunction));
                } else {
                  console.error('No component function found');
                  
                  // Enhanced error message with function detection context
                  const detectionInfo = detectedFunctionName ? 
                    \`Early detection found: \${detectedFunctionName}\` : 
                    'No function detected in early analysis';
                  
                  document.getElementById('root').innerHTML = \`
                    <div class="error">
                      <strong>Component function not found</strong><br/>
                      <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; margin: 10px 0; border-radius: 4px;">
                        <strong>🔍 Function Detection Analysis:</strong><br/>
                        \${detectionInfo}<br/>
                        Runtime patterns found: \${detectedNames.join(', ') || 'None'}<br/>
                        Has function wrapper: \${hasFunctionWrapper ? 'Yes' : 'No'}<br/>
                        Has return statement: \${hasReturnInCode ? 'Yes' : 'No'}<br/>
                        <strong>Common causes:</strong><br/>
                        • Component function was stripped during processing<br/>
                        • Function name doesn't match expected patterns<br/>
                        • Code contains syntax errors preventing execution<br/>
                        • Export/import statements weren't handled correctly
                      </div>
                      <details style="margin-top: 10px;">
                        <summary>Debug Info</summary>
                        <pre style="font-size: 12px; overflow: auto; max-height: 300px;">
Original code: \${componentCode.substring(0, 800)}...

Processed code: \${processedCode.substring(0, 800)}...

Transformed code: \${transformedCode.substring(0, 800)}...

Component patterns found: \${detectedNames.join(', ')}
                        </pre>
                      </details>
                    </div>
                  \`;
                }
              } catch (error) {
                console.error('Render error:', error);
                
                // Enhanced error reporting with more context
                const errorType = error.name || 'Unknown Error';
                const errorMessage = error.message || 'An unknown error occurred';
                
                // Check if it's a syntax error and provide more helpful info
                let helpfulMessage = '';
                if (errorMessage.includes('return') && errorMessage.includes('outside') && errorMessage.includes('function')) {
                  helpfulMessage = \`
                    <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 10px; margin: 10px 0; border-radius: 4px;">
                      <strong>🔧 Return Outside Function Error:</strong><br/>
                      This error occurs when the component function wrapper was incorrectly removed during processing.<br/>
                      <strong>Solution Applied:</strong><br/>
                      • Enhanced function detection to preserve component wrappers<br/>
                      • Automatic wrapping of bare return statements<br/>
                      • Better pattern matching for different AI provider formats<br/>
                      <strong>If this error persists:</strong><br/>
                      • The component code may have complex syntax that needs manual adjustment<br/>
                      • Try regenerating the component with the AI provider
                    </div>
                  \`;
                } else if (errorMessage.includes('Unexpected token') || errorMessage.includes('SyntaxError')) {
                  helpfulMessage = \`
                    <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; margin: 10px 0; border-radius: 4px;">
                      <strong>💡 Syntax Error Help:</strong><br/>
                      This usually happens when the generated code contains TypeScript syntax or complex JavaScript that needs more processing.<br/>
                      <strong>Common causes:</strong><br/>
                      • Style objects with semicolons instead of commas<br/>
                      • TypeScript interfaces not properly removed<br/>
                      • Complex inline styles with formatting issues<br/>
                      • Unbalanced brackets or parentheses
                    </div>
                  \`;
                }
                
                document.getElementById('root').innerHTML = \`
                  <div class="error">
                    <strong>\${errorType}:</strong> \${errorMessage}<br/>
                    \${helpfulMessage}
                    <details style="margin-top: 10px;">
                      <summary>Error Details & Debug Info</summary>
                      <pre style="font-size: 12px; overflow: auto; max-height: 200px;">\${error.stack}</pre>
                      <hr style="margin: 10px 0;">
                      <strong>Original Code (first 1000 chars):</strong><br/>
                      <pre style="font-size: 11px; overflow: auto; max-height: 150px;">\${componentCode.substring(0, 1000)}...</pre>
                      <hr style="margin: 10px 0;">
                      <strong>Processed Code (first 1000 chars):</strong><br/>
                      <pre style="font-size: 11px; overflow: auto; max-height: 150px;">\${processedCode.substring(0, 1000)}...</pre>
                    </details>
                  </div>
                \`;
              }
            }
            
            // Wait for libraries to load
            setTimeout(() => {
              if (typeof React !== 'undefined' && typeof ReactDOM !== 'undefined' && typeof Babel !== 'undefined') {
                renderComponent();
              } else {
                document.getElementById('root').innerHTML = 
                  '<div class="error">Failed to load required libraries (React, ReactDOM, or Babel)</div>';
              }
            }, 1000);
          </script>
        </body>
        </html>
      `;
      
      setRenderedContent(htmlContent);
    } catch (error) {
      onError('Failed to prepare component for rendering: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }, [code, componentName, files, onError]);

  return (
    <iframe
      srcDoc={renderedContent}
      className="w-full h-[800px] border-none"
      sandbox="allow-scripts allow-same-origin"
      title={`Component Preview - ${componentName}`}
    />
  );
}