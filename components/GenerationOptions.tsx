'use client';

interface GenerationOptionsProps {
  generationType: 'component' | 'page' | 'multiple';
  options: {
    framework: 'react' | 'vue' | 'angular';
    styling: 'tailwind' | 'css' | 'styled-components';
    typescript: boolean;
    includeProps: boolean;
    responsive: boolean;
    pageName: string;
    provider: 'claude' | 'openai' | 'gemini';
  };
  onGenerationTypeChange: (type: 'component' | 'page' | 'multiple') => void;
  onOptionsChange: (options: any) => void;
}

export default function GenerationOptions({
  generationType,
  options,
  onGenerationTypeChange,
  onOptionsChange,
}: GenerationOptionsProps) {
  const updateOption = (key: string, value: any) => {
    onOptionsChange({
      ...options,
      [key]: value,
    });
  };

  return (
    <div className="space-y-6">
      {/* Generation Type */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-3">
          Generation Type
        </label>
        <div className="grid grid-cols-1 gap-2">
          <button
            onClick={() => onGenerationTypeChange('component')}
            className={`p-3 text-left border rounded-lg transition-all ${
              generationType === 'component'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="font-medium">Single Component</div>
            <div className="text-sm opacity-75">Generate one component from the first selected frame</div>
            <div className="text-xs mt-1 text-blue-600">→ Output: 1 file</div>
          </button>
          
          <button
            onClick={() => onGenerationTypeChange('multiple')}
            className={`p-3 text-left border rounded-lg transition-all ${
              generationType === 'multiple'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="font-medium">Multiple Components</div>
            <div className="text-sm opacity-75">Extract and generate separate reusable components</div>
            <div className="text-xs mt-1 text-green-600">→ Output: Multiple files (one per component)</div>
          </button>
          
          <button
            onClick={() => onGenerationTypeChange('page')}
            className={`p-3 text-left border rounded-lg transition-all ${
              generationType === 'page'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="font-medium">Complete Page</div>
            <div className="text-sm opacity-75">Generate one complete page with all frames as sections</div>
            <div className="text-xs mt-1 text-purple-600">→ Output: 1 comprehensive page file</div>
          </button>
        </div>
      </div>

      {/* AI Provider Selection */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-3">
          LLM Arena
        </label>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => updateOption('provider', 'claude')}
            className={`p-3 text-left border rounded-lg transition-all ${
              options.provider === 'claude'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="font-medium">Claude AI</div>
            <div className="text-xs opacity-75">Anthropic's Claude Sonnet 4</div>
          </button>
          
          <button
            onClick={() => updateOption('provider', 'openai')}
            className={`p-3 text-left border rounded-lg transition-all ${
              options.provider === 'openai'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="font-medium">OpenAI</div>
            <div className="text-xs opacity-75">GPT-4.1</div>
          </button>

          <button
            onClick={() => updateOption('provider', 'gemini')}
            className={`p-3 text-left border rounded-lg transition-all ${
              options.provider === 'gemini'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="font-medium">Gemini</div>
            <div className="text-xs opacity-75">Google's Gemini 2.5 Flash</div>
          </button>
        </div>
      </div>

      {/* Framework Selection */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-3">
          Framework
        </label>
        <div className="grid grid-cols-3 gap-2">
          {(['react', 'vue', 'angular'] as const).map((framework) => (
            <button
              key={framework}
              onClick={() => updateOption('framework', framework)}
              className={`p-2 text-center border rounded-lg transition-all capitalize ${
                options.framework === framework
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              {framework}
            </button>
          ))}
        </div>
      </div>

      {/* Styling Method */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-3">
          Styling Method
        </label>
        <div className="grid grid-cols-1 gap-2">
          {([
            { value: 'tailwind', label: 'Tailwind CSS', desc: 'Utility-first CSS framework' },
            { value: 'css', label: 'CSS Modules', desc: 'Scoped CSS with modules' },
            { value: 'styled-components', label: 'Styled Components', desc: 'CSS-in-JS with styled-components' },
          ] as const).map((styling) => (
            <button
              key={styling.value}
              onClick={() => updateOption('styling', styling.value)}
              className={`p-3 text-left border rounded-lg transition-all ${
                options.styling === styling.value
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="font-medium">{styling.label}</div>
              <div className="text-sm opacity-75">{styling.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Boolean Options */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-slate-700">
          Code Options
        </label>
        
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={options.typescript}
              onChange={(e) => updateOption('typescript', e.target.checked)}
              className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
            />
            <div>
              <div className="font-medium text-slate-700">TypeScript</div>
              <div className="text-sm text-slate-500">Generate TypeScript code with type definitions</div>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={options.includeProps}
              onChange={(e) => updateOption('includeProps', e.target.checked)}
              className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
            />
            <div>
              <div className="font-medium text-slate-700">Include Props Interface</div>
              <div className="text-sm text-slate-500">Add props interface for component reusability</div>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={options.responsive}
              onChange={(e) => updateOption('responsive', e.target.checked)}
              className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
            />
            <div>
              <div className="font-medium text-slate-700">Responsive Design</div>
              <div className="text-sm text-slate-500">Include mobile-first responsive styles</div>
            </div>
          </label>
        </div>
      </div>

      {/* Page Name Input (only for page generation) */}
      {generationType === 'page' && (
        <div>
          <label htmlFor="page-name" className="block text-sm font-medium text-slate-700 mb-2">
            Page Component Name
          </label>
          <input
            id="page-name"
            type="text"
            value={options.pageName}
            onChange={(e) => updateOption('pageName', e.target.value)}
            placeholder="HomePage"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-sm text-slate-500 mt-1">
            Name for the main page component (PascalCase recommended)
          </p>
        </div>
      )}

      {/* Preview Settings */}
      <div className="bg-slate-50 rounded-lg p-4 text-sm">
        <h4 className="font-medium text-slate-700 mb-2">Generation Preview:</h4>
        <ul className="space-y-1 text-slate-600">
          <li>• AI Provider: <span className="font-medium">{options.provider === 'claude' ? 'Claude AI' : options.provider === 'openai' ? 'OpenAI' : 'Gemini'}</span></li>
          <li>• Framework: <span className="font-medium capitalize">{options.framework}</span></li>
          <li>• Styling: <span className="font-medium">{options.styling === 'tailwind' ? 'Tailwind CSS' : options.styling === 'css' ? 'CSS Modules' : 'Styled Components'}</span></li>
          <li>• Language: <span className="font-medium">{options.typescript ? 'TypeScript' : 'JavaScript'}</span></li>
          <li>• Type: <span className="font-medium capitalize">{generationType}</span></li>
          {generationType === 'page' && (
            <li>• Page Name: <span className="font-medium">{options.pageName}</span></li>
          )}
        </ul>
      </div>
    </div>
  );
}