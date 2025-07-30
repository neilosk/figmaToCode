'use client';

import { useState } from 'react';
import { FileText, Download, Copy, Eye, Settings, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { ProcessedNode } from '../types/figma';
import CodeViewer from '../components/CodeViewer';
import MultiFileCodeViewer from '../components/MultiFileCodeViewer';
import FigmaInput from '../components/FigmaInput';
import FrameSelector from '../components/FrameSelector';
import SmartFrameSelector from '../components/SmartFrameSelector';
import GenerationOptions from '../components/GenerationOptions';

interface FigmaData {
  fileName: string;
  fileKey: string;
  frames: ProcessedNode[];
  processedDocument: ProcessedNode;
}

interface GeneratedCode {
  type: 'component' | 'page' | 'multiple';
  componentName?: string;
  pageName?: string;
  code?: string;
  files?: Array<{ name: string; content: string; type: string }>;
  components?: Array<{ componentName: string; code: string; files?: Array<{ name: string; content: string; type: string }> }>;
}

export default function HomePage() {
  const [figmaData, setFigmaData] = useState<FigmaData | null>(null);
  const [selectedFrames, setSelectedFrames] = useState<ProcessedNode[]>([]);
  const [generatedCode, setGeneratedCode] = useState<GeneratedCode | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [useSmartSelector, setUseSmartSelector] = useState(true);
  
  // Generation options
  const [generationType, setGenerationType] = useState<'component' | 'page' | 'multiple'>('component');
  const [options, setOptions] = useState({
    framework: 'react' as const,
    styling: 'tailwind' as const,
    typescript: true,
    includeProps: true,
    responsive: true,
    pageName: 'HomePage',
    provider: 'gemini' as const,
  });

  const handleFigmaSubmit = async (figmaUrl: string, accessToken: string) => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    setGeneratedCode(null);

    try {
      console.log('Making request to /api/figma with:', { figmaUrl: figmaUrl.substring(0, 50) + '...', tokenLength: accessToken.length });
      
      const response = await fetch('/api/figma', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          figmaUrl,
          accessToken,
        }),
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      const contentType = response.headers.get('content-type');
      console.log('Content-Type:', contentType);

      if (!contentType || !contentType.includes('application/json')) {
        const textResponse = await response.text();
        console.error('Non-JSON response received:', textResponse.substring(0, 500));
        throw new Error('Server returned non-JSON response. Check server logs.');
      }

      const result = await response.json();
      console.log('Parsed JSON result:', result);

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch Figma file');
      }

      setFigmaData(result.data);
      setSuccess(`Successfully loaded "${result.data.fileName}" with ${result.data.frames.length} frames`);
    } catch (err) {
      console.error('Full error object:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateCode = async () => {
    if (!selectedFrames.length) {
      setError('Please select at least one frame to generate code');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nodes: selectedFrames,
          generationType,
          options,
          provider: options.provider,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate code');
      }

      setGeneratedCode(result.data);
      setSuccess('Code generated successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Code generation failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFrameSelection = (frames: ProcessedNode[]) => {
    setSelectedFrames(frames);
    setGeneratedCode(null); // Clear previous code when selection changes
  };

  const handleDownloadCode = (code: string, filename: string) => {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.tsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };


  const handleCopyPastePreview = async (code: string, frameName?: string, files?: Array<{ name: string; content: string; type: string }>) => {
    try {
      console.log('📁 Generating HTML preview file...');
      
      // Determine component name from code or use default
      const componentMatch = code.match(/(?:function|const)\s+([A-Za-z][A-Za-z0-9]*)/)
      const componentName = componentMatch?.[1] || 'GeneratedComponent';
      
      console.log('📁 Component name:', componentName);
      
      // Use the automated HTML file generation API
      const response = await fetch('/api/copy-paste-preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: code,
          componentName: componentName,
          styling: options.styling,
          files: files || []
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTML file generation failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        // Show success message with file information
        const instructions = result.instructions.join('\n');
        const userMessage = `🎉 HTML Preview File Created!

${instructions}

File Location: ${result.filename}

The HTML file has been automatically created in your project root. Just double-click it to open in your browser!`;

        alert(userMessage);
        setSuccess(`HTML preview file created: ${result.filename}`);
        
        console.log('📁 File created successfully:', result.filename);
        console.log('📁 File path:', result.filepath);
        console.log('📁 Instructions:', instructions);
      } else {
        throw new Error(result.error || 'Failed to generate HTML preview file');
      }
      
    } catch (error) {
      console.error('📁 HTML file generation failed:', error);
      setError('Failed to create HTML preview file: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleOpenFullPreview = async (code: string, frameName?: string, files?: Array<{ name: string; content: string; type: string }>) => {
    try {
      console.log('🚀 Opening full preview in dedicated page...');
      
      // For Angular components, handle file structure differently
      const isAngularComponent = files?.some(f => f.type === 'typescript' || f.type === 'html' || f.type === 'scss');
      
      if (isAngularComponent) {
        // For Angular, create a preview of the main component file
        const tsFile = files?.find(f => f.type === 'typescript');
        const htmlFile = files?.find(f => f.type === 'html');
        
        if (tsFile && htmlFile) {
          // Create a simplified preview that shows the component structure
          const previewCode = `<!-- Angular Component Preview -->
<div class="angular-preview">
  <h2>Angular Component: ${frameName || 'Component'}</h2>
  <div class="file-structure">
    ${files?.map(f => `<div class="file">${f.name} (${f.type})</div>`).join('')}
  </div>
  <div class="component-preview">
    ${htmlFile.content}
  </div>
</div>`;
          
          const blob = new Blob([previewCode], { type: 'text/html' });
          const url = URL.createObjectURL(blob);
          window.open(url, '_blank');
          setSuccess('Angular component preview opened in new tab');
          return;
        }
      }
      
      // Fallback for non-Angular components
      const cleanCode = code.replace(/<span[^>]*>/g, '').replace(/<\/span>/g, '').replace(/style="[^"]*"/g, '').trim();
      const blob = new Blob([cleanCode], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setSuccess('Preview opened in new tab');
      
    } catch (error) {
      console.error('🚀 Preview failed:', error);
      setError('Failed to open preview: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setSuccess('Code copied to clipboard!');
    } catch (err) {
      setError('Failed to copy code to clipboard');
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-slate-800 mb-4">
          Turn Figma Designs into Angular Code
        </h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          Paste your Figma URL, select frames, and let AI generate production-ready Angular components instantly.
        </p>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
          <p className="text-green-700">{success}</p>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Input and Configuration */}
        <div className="space-y-6">
          {/* Figma Input */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Step 1: Import from Figma
            </h2>
            <FigmaInput onSubmit={handleFigmaSubmit} isLoading={isLoading} />
          </div>

          {/* Frame Selection */}
          {figmaData && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Step 2: Select Components
                </h2>
                <button
                  onClick={() => setUseSmartSelector(!useSmartSelector)}
                  className="text-sm px-3 py-1 rounded border border-slate-300 hover:bg-slate-50 transition-colors"
                >
                  {useSmartSelector ? 'Smart View' : 'Basic View'}
                </button>
              </div>
              
              {useSmartSelector ? (
                <SmartFrameSelector
                  frames={figmaData.frames}
                  onSelectionChange={handleFrameSelection}
                  selectedFrames={selectedFrames}
                />
              ) : (
                <FrameSelector
                  frames={figmaData.frames}
                  onSelectionChange={handleFrameSelection}
                  selectedFrames={selectedFrames}
                />
              )}
            </div>
          )}

          {/* Generation Options */}
          {selectedFrames.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Step 3: Configure Generation
              </h2>
              <GenerationOptions
                generationType={generationType}
                options={options}
                onGenerationTypeChange={setGenerationType}
                onOptionsChange={setOptions}
              />
              
              <button
                onClick={handleGenerateCode}
                disabled={isLoading || selectedFrames.length === 0}
                className="mt-6 w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-6 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  'Generate Code'
                )}
              </button>
            </div>
          )}
        </div>

        {/* Right Column - Generated Code */}
        <div className="space-y-6">
          {/* Always show test button when we have generated code */}
          {generatedCode && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-yellow-800">Preview System Test</h3>
                  <p className="text-sm text-yellow-700">Test if the preview app is working correctly</p>
                </div>
                <button
                  onClick={() => {
                    console.log('🧪 Test button clicked!');
                    
                    try {
                      console.log('🧪 Testing internal preview system...');
                      
                      const testCode = `import React from 'react';

export default function TestComponent() {
  return (
    <div className="p-8 bg-blue-50 rounded-lg border-2 border-blue-200">
      <h1 className="text-2xl font-bold text-blue-800 mb-4">
        🎉 Preview System Working!
      </h1>
      <p className="text-blue-600 mb-2">
        ✅ Internal preview: Working
      </p>
      <p className="text-blue-600 mb-2">
        ✅ Same port (3013): Active
      </p>
      <p className="text-blue-600">
        ✅ Component display: Functional
      </p>
      <p className="text-sm text-blue-500 mt-4">
        Generated at: {new Date().toLocaleString()}
      </p>
    </div>
  );
}`;
                      
                      console.log('🧪 Test code prepared, length:', testCode.length);
                      
                      // Use full preview
                      handleOpenFullPreview(testCode, 'test');
                      
                    } catch (error) {
                      console.error('🧪 Test failed:', error);
                      setError('Test failed: ' + error);
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors"
                >
                  🧪 Test Preview System
                </button>
              </div>
            </div>
          )}

          {generatedCode && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Generated Code
                </h2>
                <div className="flex items-center gap-2">
                  {generatedCode.type === 'component' && generatedCode.code && (
                    <>
                      <button
                        onClick={() => handleCopyCode(generatedCode.code!)}
                        className="p-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Copy code"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDownloadCode(
                          generatedCode.code!,
                          generatedCode.componentName || 'Component'
                        )}
                        className="p-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Download code"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {generatedCode.type === 'component' && (generatedCode.code || generatedCode.files) && (
                <div className="space-y-4">
                  {generatedCode.files && generatedCode.files.length > 0 ? (
                    <MultiFileCodeViewer
                      files={generatedCode.files}
                      title={generatedCode.componentName}
                    />
                  ) : generatedCode.code && (
                    <CodeViewer
                      code={generatedCode.code}
                      language="typescript"
                      title={generatedCode.componentName}
                    />
                  )}
                  <div className="flex items-center gap-2 pt-4 border-t">
                    <button
                      onClick={() => handleCopyCode(generatedCode.code!)}
                      className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      <Copy className="h-4 w-4" />
                      Copy Code
                    </button>
                    <button
                      onClick={() => handleDownloadCode(
                        generatedCode.code!,
                        generatedCode.componentName || 'Component'
                      )}
                      className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </button>
                    <button
                      onClick={() => handleCopyPastePreview(generatedCode.code!, selectedFrames[0]?.name, generatedCode.files)}
                      className="flex items-center gap-2 px-4 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                      title="Generate HTML preview file automatically in project root"
                    >
                      <FileText className="h-4 w-4" />
                      Generate HTML File
                    </button>
                    <button
                      onClick={async () => {
                        await handleOpenFullPreview(generatedCode.code!, selectedFrames[0]?.name, generatedCode.files);
                        const frameName = selectedFrames[0]?.name || 'default';
                        const normalizedFrameName = frameName.toLowerCase().replace(/\s+/g, '-');
                        setTimeout(() => {
                          window.open(`/preview/${encodeURIComponent(normalizedFrameName)}/render`, '_blank');
                        }, 500);
                      }}
                      className="flex items-center gap-2 px-4 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                      title="Open visual preview of component"
                    >
                      <Eye className="h-4 w-4" />
                      Visual Preview
                    </button>
                  </div>
                </div>
              )}

              {generatedCode.type === 'page' && (generatedCode.code || generatedCode.files) && (
                <div className="space-y-4">
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-2 text-purple-800 font-medium mb-2">
                      <FileText className="h-4 w-4" />
                      Complete Page Generated
                    </div>
                    <div className="text-sm text-purple-700">
                      ✅ All {selectedFrames.length} selected frames have been combined into one comprehensive page component<br/>
                      ✅ Each frame is converted to a semantic section (header, hero, features, etc.)<br/>
                      ✅ Responsive design with mobile-first approach<br/>
                      ✅ Ready to use as a complete landing page
                    </div>
                  </div>
                  
                  {generatedCode.files && generatedCode.files.length > 0 ? (
                    <MultiFileCodeViewer
                      files={generatedCode.files}
                      title={generatedCode.pageName}
                    />
                  ) : generatedCode.code && (
                    <CodeViewer
                      code={generatedCode.code}
                      language="typescript"
                      title={generatedCode.pageName}
                    />
                  )}
                  <div className="flex items-center gap-2 pt-4 border-t">
                    <button
                      onClick={() => handleCopyCode(generatedCode.code!)}
                      className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      <Copy className="h-4 w-4" />
                      Copy Code
                    </button>
                    <button
                      onClick={() => handleDownloadCode(
                        generatedCode.code!,
                        generatedCode.pageName || 'Page'
                      )}
                      className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </button>
                    <button
                      onClick={() => handleCopyPastePreview(generatedCode.code!, selectedFrames[0]?.name, generatedCode.files)}
                      className="flex items-center gap-2 px-4 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                      title="Generate HTML preview file automatically in project root"
                    >
                      <FileText className="h-4 w-4" />
                      Generate HTML File
                    </button>
                    <button
                      onClick={async () => {
                        await handleOpenFullPreview(generatedCode.code!, selectedFrames[0]?.name, generatedCode.files);
                        const frameName = selectedFrames[0]?.name || 'default';
                        const normalizedFrameName = frameName.toLowerCase().replace(/\s+/g, '-');
                        setTimeout(() => {
                          window.open(`/preview/${encodeURIComponent(normalizedFrameName)}/render`, '_blank');
                        }, 500);
                      }}
                      className="flex items-center gap-2 px-4 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                      title="Open visual preview of page"
                    >
                      <Eye className="h-4 w-4" />
                      Visual Preview
                    </button>
                  </div>
                </div>
              )}

              {generatedCode.type === 'multiple' && generatedCode.components && (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-2 text-green-800 font-medium mb-2">
                      <FileText className="h-4 w-4" />
                      Multiple Components Generated
                    </div>
                    <div className="text-sm text-green-700">
                      ✅ Generated {generatedCode.components.length} separate component files<br/>
                      ✅ Each component is reusable and self-contained<br/>
                      ✅ Components can be imported and used in any React project
                    </div>
                  </div>

                  {generatedCode.components.map((component, index) => (
                    <div key={index} className="border border-slate-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-medium text-slate-700">📄 {component.componentName}</h3>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleCopyCode(component.code)}
                            className="p-1 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors"
                            title="Copy code"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDownloadCode(component.code, component.componentName)}
                            className="p-1 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors"
                            title="Download code"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      {component.files && component.files.length > 0 ? (
                        <MultiFileCodeViewer
                          files={component.files}
                          title={component.componentName}
                        />
                      ) : (
                        <CodeViewer
                          code={component.code}
                          language="typescript"
                          title={component.componentName}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Instructions */}
          {!figmaData && (
            <div className="space-y-4">
              <div className="bg-blue-50 rounded-xl border border-blue-200 p-6">
                <h3 className="text-lg font-semibold text-blue-800 mb-3">How to get started:</h3>
                <ol className="list-decimal list-inside space-y-2 text-blue-700">
                  <li>Get your Figma access token from Figma Settings → Account → Personal Access Tokens</li>
                  <li>Copy the URL of your Figma file OR use format: https://api.figma.com/v1/files/YOUR_FILE_KEY</li>
                  <li>Paste both above and click "Load File"</li>
                  <li>Select the components you want to convert</li>
                  <li>Choose your generation options</li>
                  <li>Click "Generate Code" and get your components!</li>
                </ol>
              </div>
              
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border border-purple-200 p-6">
                <h3 className="text-lg font-semibold text-purple-800 mb-3 flex items-center gap-2">
                  🅰️ Angular 8 + Bootstrap 4.3 + Material 8
                </h3>
                <div className="text-purple-700 space-y-2">
                  <p className="font-medium">For best Angular results:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Use <strong>Smart View</strong> to see meaningful components</li>
                    <li>Select <strong>one component at a time</strong> (Single Component mode)</li>
                    <li>Choose <strong>Gemini → Angular 8 → Styled Components</strong></li>
                    <li>Get 3 clean files: <code>.ts</code>, <code>.html</code>, <code>.scss</code></li>
                    <li>Each component includes Bootstrap grid + Material UI elements</li>
                  </ul>
                  <p className="text-sm bg-white/50 rounded px-3 py-2 mt-3">
                    💡 <strong>Tip:</strong> Generate 5-10 key components individually, then combine them into your Angular app!
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

