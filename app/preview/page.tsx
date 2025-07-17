'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Trash2, Code, Clock, FileText, Eye, Copy, CheckCircle2, Monitor } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import LivePreview from '../../components/LivePreview';

interface ComponentData {
  componentName: string;
  code: string;
  timestamp: number;
  lineCount: number;
  frameName?: string;
}

interface PreviewResponse {
  components: ComponentData[];
  total: number;
  lastUpdated: number | null;
}

export default function PreviewPage() {
  const [components, setComponents] = useState<ComponentData[]>([]);
  const [selectedComponent, setSelectedComponent] = useState<ComponentData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'code' | 'preview'>('code');

  const fetchComponents = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/preview');
      const data: PreviewResponse = await response.json();
      
      if (response.ok) {
        setComponents(data.components);
        setLastUpdated(data.lastUpdated);
        
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

  const clearComponents = async () => {
    try {
      const response = await fetch('/api/preview', { method: 'DELETE' });
      if (response.ok) {
        setComponents([]);
        setSelectedComponent(null);
        setLastUpdated(null);
      }
    } catch (err) {
      setError('Failed to clear components');
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
    fetchComponents();
    
    // Auto-refresh every 3 seconds
    const interval = setInterval(fetchComponents, 3000);
    return () => clearInterval(interval);
  }, []);

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold mb-2">Component Preview</h1>
                <p className="text-blue-100">
                  Generated components from Figma designs
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
                <button
                  onClick={clearComponents}
                  className="flex items-center space-x-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Clear</span>
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
                  <span>{components.length} components</span>
                </span>
                {lastUpdated && (
                  <span className="flex items-center space-x-2">
                    <Clock className="w-4 h-4" />
                    <span>Last updated: {formatTimestamp(lastUpdated)}</span>
                  </span>
                )}
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
            {/* Component List */}
            <div className="w-1/3 border-r border-gray-200 overflow-y-auto">
              <div className="p-4">
                <h2 className="text-lg font-semibold mb-3">Components</h2>
                {components.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Code className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No components generated yet</p>
                    <p className="text-sm mt-1">Generate code from the main app to see previews</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {components.map((component, index) => (
                      <div
                        key={index}
                        onClick={() => setSelectedComponent(component)}
                        className={`p-3 rounded-lg cursor-pointer transition-colors ${
                          selectedComponent === component
                            ? 'bg-blue-50 border-2 border-blue-200'
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
                        {component.frameName && (
                          <div className="text-xs text-blue-600 mb-1">
                            Frame: {component.frameName}
                          </div>
                        )}
                        <div className="text-xs text-gray-500">
                          {formatTimestamp(component.timestamp)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
                            <span>Preview</span>
                          </button>
                        </div>
                        <button
                          onClick={copyCode}
                          className="flex items-center space-x-2 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
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
                    ) : (
                      <div className="p-4 bg-gray-50 h-full">
                        <LivePreview 
                          code={selectedComponent.code}
                          componentName={selectedComponent.componentName}
                        />
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <Eye className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>Select a component to view its code</p>
                    <p className="text-sm text-gray-400 mt-2">Components available: {components.length}</p>
                    {components.length > 0 && (
                      <p className="text-xs text-blue-500 mt-1">👈 Click on a component in the left sidebar</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}