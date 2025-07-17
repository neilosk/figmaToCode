'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Copy, CheckCircle2, ArrowLeft, Code, Clock, FileText, Monitor } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import MultiFileCodeViewer from '../../../components/MultiFileCodeViewer';

interface ComponentData {
  componentName: string;
  code: string;
  timestamp: number;
  lineCount: number;
  frameName?: string;
  files?: Array<{ name: string; content: string; type: string }>;
}

interface PreviewResponse {
  components: ComponentData[];
}

export default function FramePreviewPage() {
  const params = useParams();
  const frameName = params.frameName as string;
  
  const [components, setComponents] = useState<ComponentData[]>([]);
  const [selectedComponent, setSelectedComponent] = useState<ComponentData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'code' | 'preview'>('code');

  const fetchComponents = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/preview?frame=${encodeURIComponent(frameName)}`);
      const data: PreviewResponse = await response.json();
      
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

  const copyCode = async () => {
    if (selectedComponent) {
      try {
        await navigator.clipboard.writeText(selectedComponent.code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy code:', err);
      }
    }
  };

  useEffect(() => {
    if (frameName) {
      fetchComponents();
      
      // Auto-refresh every 3 seconds
      const interval = setInterval(fetchComponents, 3000);
      return () => clearInterval(interval);
    }
  }, [frameName]);

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const displayFrameName = frameName ? decodeURIComponent(frameName).replace(/[-_]/g, ' ') : 'Unknown';

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-3 mb-2">
                  <Link 
                    href="/preview"
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </Link>
                  <h1 className="text-2xl font-bold">
                    {displayFrameName} Frame Preview
                  </h1>
                </div>
                <p className="text-indigo-100">
                  Components generated from the "{displayFrameName}" frame
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={fetchComponents}
                  disabled={loading}
                  className="flex items-center space-x-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="border-b border-gray-200 p-4 bg-gray-50">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div className="flex items-center space-x-4">
                <span className="flex items-center space-x-2">
                  <FileText className="w-4 h-4" />
                  <span>{components.length} components for "{displayFrameName}"</span>
                </span>
              </div>
              {error && (
                <span className="text-red-600 flex items-center space-x-2">
                  <span>⚠️ {error}</span>
                </span>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="flex h-[calc(100vh-300px)]">
            {components.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <Code className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <h2 className="text-xl font-semibold mb-2">No components found</h2>
                  <p className="text-gray-600 mb-4">
                    No components have been generated for the "{displayFrameName}" frame yet.
                  </p>
                  <Link 
                    href="/"
                    className="inline-flex items-center space-x-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors"
                  >
                    <span>Generate Components</span>
                  </Link>
                </div>
              </div>
            ) : (
              <>
                {/* Component List */}
                <div className="w-1/3 border-r border-gray-200 overflow-y-auto">
                  <div className="p-4">
                    <h2 className="text-lg font-semibold mb-3">Components</h2>
                    <div className="space-y-2">
                      {components.map((component, index) => (
                        <div
                          key={index}
                          onClick={() => setSelectedComponent(component)}
                          className={`p-3 rounded-lg cursor-pointer transition-colors ${
                            selectedComponent === component
                              ? 'bg-indigo-50 border-2 border-indigo-200'
                              : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="font-medium text-gray-900 truncate">
                              {component.componentName}
                            </h3>
                            <span className="text-xs text-gray-500">
                              {component.lineCount} lines
                            </span>
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatTimestamp(component.timestamp)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Code Viewer */}
                <div className="flex-1 flex flex-col">
                  {selectedComponent ? (
                    <>
                      <div className="border-b border-gray-200 p-4 bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              {selectedComponent.componentName}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {selectedComponent.lineCount} lines • {formatTimestamp(selectedComponent.timestamp)}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="flex items-center bg-gray-100 rounded-lg p-1">
                              <button
                                onClick={() => setViewMode('code')}
                                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm transition-colors ${
                                  viewMode === 'code'
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900'
                                }`}
                              >
                                <Code className="w-4 h-4" />
                                <span>Code</span>
                              </button>
                              <button
                                onClick={() => setViewMode('preview')}
                                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm transition-colors ${
                                  viewMode === 'preview'
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900'
                                }`}
                              >
                                <Monitor className="w-4 h-4" />
                                <span>Info</span>
                              </button>
                            </div>
                            <Link
                              href={`/preview/${encodeURIComponent(frameName)}/render`}
                              className="flex items-center space-x-2 px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                            >
                              <Monitor className="w-4 h-4" />
                              <span>Visual Preview</span>
                            </Link>
                            <button
                              onClick={copyCode}
                              className="flex items-center space-x-2 px-3 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors"
                            >
                              {copied ? (
                                <>
                                  <CheckCircle2 className="w-4 h-4" />
                                  <span>Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-4 h-4" />
                                  <span>Copy Code</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="flex-1 overflow-auto">
                        {viewMode === 'code' ? (
                          <div>
                            {selectedComponent.files && selectedComponent.files.length > 0 ? (
                              <MultiFileCodeViewer
                                files={selectedComponent.files}
                                title={selectedComponent.componentName}
                              />
                            ) : (
                              <SyntaxHighlighter
                                language="typescript"
                                style={vscDarkPlus}
                                customStyle={{
                                  margin: 0,
                                  borderRadius: 0,
                                  background: '#1e1e1e',
                                }}
                                codeTagProps={{
                                  style: {
                                    fontSize: '14px',
                                    fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
                                  },
                                }}
                              >
                                {selectedComponent.code}
                              </SyntaxHighlighter>
                            )}
                          </div>
                        ) : (
                          <div className="p-4 bg-gray-50 h-full">
                            <div className="bg-white rounded-lg border border-gray-200 p-6">
                              <div className="text-center">
                                <Monitor className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                                  Component Preview
                                </h3>
                                <p className="text-gray-600 mb-4">
                                  {selectedComponent.componentName}
                                </p>
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                                  <p className="text-sm text-blue-800">
                                    ✅ Component code ready for use<br/>
                                    ✅ {selectedComponent.lineCount} lines of code<br/>
                                    ✅ Generated at {new Date(selectedComponent.timestamp).toLocaleString()}
                                  </p>
                                </div>
                                <p className="text-sm text-gray-500">
                                  Switch to "Code" view to see the generated component code.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-500">
                      <div className="text-center">
                        <Code className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p>Select a component to view its code</p>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}