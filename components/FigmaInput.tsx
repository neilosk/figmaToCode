'use client';

import { useState, useEffect } from 'react';
import { Link, Key, Loader2 } from 'lucide-react';

interface FigmaInputProps {
  onSubmit: (figmaUrl: string, accessToken: string) => void;
  isLoading: boolean;
}

export default function FigmaInput({ onSubmit, isLoading }: FigmaInputProps) {
  const [figmaUrl, setFigmaUrl] = useState('');
  const [accessToken, setAccessToken] = useState('');

  // Check if form is valid - both fields have content
  const isFormValid = figmaUrl.length > 0 && accessToken.length > 0;
  
  // Debug logging
  useEffect(() => {
    console.log('Form state:', { 
      figmaUrlLength: figmaUrl.length, 
      accessTokenLength: accessToken.length, 
      isFormValid, 
      isLoading 
    });
  }, [figmaUrl, accessToken, isFormValid, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUrl = figmaUrl.trim();
    const trimmedToken = accessToken.trim();
    
    if (trimmedUrl && trimmedToken) {
      onSubmit(trimmedUrl, trimmedToken);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Figma URL Input */}
      <div>
        <label htmlFor="figma-url" className="block text-sm font-medium text-slate-700 mb-2">
          Figma API URL
        </label>
        <div className="relative">
          <Link className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            id="figma-url"
            type="text"
            value={figmaUrl}
            onChange={(e) => setFigmaUrl(e.target.value)}
            placeholder="https://api.figma.com/v1/files/XxxxXXxxxXXX"
            className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            required
            disabled={isLoading}
          />
        </div>
        <p className="text-sm text-slate-500 mt-1">
          Use format: https://api.figma.com/v1/files/YOUR_FILE_KEY or paste any Figma file URL
        </p>
      </div>

      {/* Access Token Input */}
      <div>
        <label htmlFor="access-token" className="block text-sm font-medium text-slate-700 mb-2">
          Figma Access Token
        </label>
        <div className="relative">
          <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            id="access-token"
            type="password"
            value={accessToken}
            onChange={(e) => setAccessToken(e.target.value)}
            placeholder="figd_..."
            className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            required
            disabled={isLoading}
          />
        </div>
        <p className="text-sm text-slate-500 mt-1">
          Get your token from{' '}
          <a
            href="https://www.figma.com/settings"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-700 underline"
          >
            Figma Settings → Personal Access Tokens
          </a>
        </p>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={!isFormValid || isLoading}
        className={`w-full py-3 px-4 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center gap-2 ${
          isFormValid && !isLoading
            ? 'bg-blue-600 text-white hover:bg-blue-700'
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
        }`}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading File...
          </>
        ) : (
          'Load Figma File'
        )}
      </button>

      {/* Help Text */}
      <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-600">
        <h4 className="font-medium text-slate-700 mb-2">Need help?</h4>
        <ul className="space-y-1">
          <li>• Make sure your Figma file is shared publicly or with your token</li>
          <li>• Your access token needs read access to the file</li>
          <li>• You can use direct API URLs like: https://api.figma.com/v1/files/YOUR_FILE_KEY</li>
          <li>• Or paste regular Figma URLs like: https://www.figma.com/file/...</li>
        </ul>
      </div>
    </form>
  );
}