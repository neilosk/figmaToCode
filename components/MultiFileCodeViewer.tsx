'use client';

import { useState } from 'react';
import CodeViewer from './CodeViewer';
import { FileText, Code, Palette, Globe } from 'lucide-react';

interface CodeFile {
  name: string;
  content: string;
  type: string;
}

interface MultiFileCodeViewerProps {
  files: CodeFile[];
  title?: string;
}

export default function MultiFileCodeViewer({ files, title }: MultiFileCodeViewerProps) {
  const [activeFile, setActiveFile] = useState(0);

  if (files.length === 0) {
    return (
      <div className="border border-slate-200 rounded-lg p-8 text-center text-slate-500">
        <FileText className="h-12 w-12 mx-auto mb-4 text-slate-300" />
        <p>No files to display</p>
      </div>
    );
  }

  if (files.length === 1) {
    return (
      <CodeViewer
        code={files[0].content}
        language={files[0].type}
        title={files[0].name}
      />
    );
  }

  const getFileIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'tsx':
      case 'ts':
      case 'typescript':
      case 'jsx':
      case 'js':
        return <Code className="h-4 w-4" />;
      case 'html':
        return <Globe className="h-4 w-4" />;
      case 'css':
      case 'scss':
      case 'sass':
        return <Palette className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getLanguageForFile = (type: string) => {
    switch (type.toLowerCase()) {
      case 'tsx':
      case 'jsx':
        return 'typescript';
      case 'ts':
      case 'typescript':
        return 'typescript';
      case 'js':
        return 'javascript';
      case 'html':
        return 'html';
      case 'css':
        return 'css';
      case 'scss':
      case 'sass':
        return 'scss';
      default:
        return 'text';
    }
  };

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
      {/* Header with title */}
      {title && (
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-3">
          <h3 className="font-medium text-slate-700">{title}</h3>
        </div>
      )}
      
      {/* File tabs */}
      <div className="border-b border-slate-200">
        <div className="flex overflow-x-auto">
          {files.map((file, index) => (
            <button
              key={index}
              onClick={() => setActiveFile(index)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                activeFile === index
                  ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              {getFileIcon(file.type)}
              {file.name}
            </button>
          ))}
        </div>
      </div>

      {/* Active file content */}
      <div className="bg-white">
        <CodeViewer
          code={files[activeFile].content}
          language={getLanguageForFile(files[activeFile].type)}
          title={files[activeFile].name}
        />
      </div>
    </div>
  );
}