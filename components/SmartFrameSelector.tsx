'use client';

import { useState, useEffect } from 'react';
import { ProcessedNode } from '../types/figma';
import { ComponentAnalyzer, ComponentCategory, AnalyzedComponent } from '../utils/component-analyzer';
import { countAllChildren } from '../utils/figma';
import { 
  Frame, 
  Layers, 
  Check, 
  Star,
  AlertTriangle,
  Code2,
  Navigation,
  Square,
  Zap,
  Database,
  Layout,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Target
} from 'lucide-react';

interface SmartFrameSelectorProps {
  frames: ProcessedNode[];
  selectedFrames: ProcessedNode[];
  onSelectionChange: (frames: ProcessedNode[]) => void;
  showOnlyRecommended?: boolean;
}

export default function SmartFrameSelector({ 
  frames, 
  selectedFrames, 
  onSelectionChange,
  showOnlyRecommended = false 
}: SmartFrameSelectorProps) {
  const [analyzedComponents, setAnalyzedComponents] = useState<AnalyzedComponent[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<ComponentCategory>>(new Set());
  const [viewMode, setViewMode] = useState<'frames' | 'recommended' | 'all' | 'categories'>('frames');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Analyze components when frames change
  useEffect(() => {
    if (frames.length > 0) {
      setIsAnalyzing(true);
      try {
        const analyzed = ComponentAnalyzer.analyzeComponents(frames);
        setAnalyzedComponents(analyzed);
        
        // Auto-expand categories with recommended components
        const categoriesWithRecommended = new Set<ComponentCategory>();
        analyzed.forEach(comp => {
          if (comp.recommendedForGeneration) {
            categoriesWithRecommended.add(comp.category);
          }
        });
        setExpandedCategories(categoriesWithRecommended);
      } catch (error) {
        console.error('Error analyzing components:', error);
      } finally {
        setIsAnalyzing(false);
      }
    }
  }, [frames]);

  const getCategoryIcon = (category: ComponentCategory) => {
    const iconProps = { className: "h-4 w-4" };
    switch (category) {
      case ComponentCategory.BUSINESS_LOGIC: return <Sparkles {...iconProps} />;
      case ComponentCategory.FORM: return <Square {...iconProps} />;
      case ComponentCategory.BUTTON: return <Target {...iconProps} />;
      case ComponentCategory.NAVIGATION: return <Navigation {...iconProps} />;
      case ComponentCategory.DATA_DISPLAY: return <Database {...iconProps} />;
      case ComponentCategory.LAYOUT: return <Layout {...iconProps} />;
      case ComponentCategory.ICON: return <Zap {...iconProps} />;
      default: return <Code2 {...iconProps} />;
    }
  };

  const getCategoryLabel = (category: ComponentCategory) => {
    const labels = {
      [ComponentCategory.BUSINESS_LOGIC]: 'Business Components',
      [ComponentCategory.FORM]: 'Form Elements', 
      [ComponentCategory.BUTTON]: 'Buttons & CTAs',
      [ComponentCategory.NAVIGATION]: 'Navigation',
      [ComponentCategory.DATA_DISPLAY]: 'Data Display',
      [ComponentCategory.LAYOUT]: 'Layout Components',
      [ComponentCategory.ICON]: 'Icons & Graphics',
      [ComponentCategory.UI_COMPONENT]: 'UI Components'
    };
    return labels[category] || 'Other Components';
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'low': return 'text-green-600 bg-green-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'high': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const handleComponentToggle = (component: AnalyzedComponent) => {
    const isSelected = selectedFrames.some(f => f.id === component.node.id);
    let newSelection: ProcessedNode[];

    if (isSelected) {
      newSelection = selectedFrames.filter(f => f.id !== component.node.id);
    } else {
      newSelection = [...selectedFrames, component.node];
    }

    onSelectionChange(newSelection);
  };

  const toggleCategory = (category: ComponentCategory) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const selectRecommended = () => {
    const recommended = analyzedComponents
      .filter(comp => comp.recommendedForGeneration)
      .map(comp => comp.node);
    onSelectionChange(recommended);
  };

  const getFilteredComponents = () => {
    switch (viewMode) {
      case 'frames':
        return frames.map(frame => ({
          node: frame,
          category: ComponentCategory.LAYOUT,
          cleanName: frame.componentName || frame.name,
          meaningfulName: frame.framePath || frame.name,
          description: `${frame.frameDepth ? '└'.repeat(frame.frameDepth) + ' ' : ''}Frame with ${countAllChildren(frame)} total elements`,
          complexity: 'medium' as const,
          recommendedForGeneration: true,
          childCount: countAllChildren(frame),
          hasInteractivity: false
        }));
      case 'recommended':
        return analyzedComponents.filter(comp => comp.recommendedForGeneration);
      case 'all':
        return analyzedComponents;
      case 'categories':
        return analyzedComponents;
      default:
        return frames.map(frame => ({
          node: frame,
          category: ComponentCategory.LAYOUT,
          cleanName: frame.componentName || frame.name,
          meaningfulName: frame.name,
          description: `Frame component with ${countAllChildren(frame)} total elements`,
          complexity: 'medium' as const,
          recommendedForGeneration: true,
          childCount: countAllChildren(frame),
          hasInteractivity: false
        }));
    }
  };

  if (isAnalyzing) {
    return (
      <div className="text-center py-8 text-slate-500">
        <div className="animate-spin h-8 w-8 mx-auto mb-3">
          <Layers className="h-8 w-8 opacity-50" />
        </div>
        <p>Analyzing components...</p>
      </div>
    );
  }

  if (frames.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        <Layers className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>No frames found in this Figma file.</p>
        <p className="text-sm">Make sure your file contains frames with content.</p>
      </div>
    );
  }

  const filteredComponents = getFilteredComponents();
  const recommendedCount = analyzedComponents.filter(c => c.recommendedForGeneration).length;
  
  // Banner component based on view mode
  const renderBanner = () => {
    if (viewMode === 'frames') {
      return (
        <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="bg-green-500 text-white rounded-full p-1">
              <Frame className="h-4 w-4" />
            </div>
            <div>
              <div className="font-medium text-green-800 mb-1">📄 Figma Frame View</div>
              <div className="text-sm text-green-700 mb-2">
                Showing direct frames from your Figma file. Each frame represents a complete component or screen.
                <br />Choose <strong>one frame at a time</strong> for Angular generation.
              </div>
              <div className="text-xs bg-white rounded px-2 py-1 font-mono text-green-800">
                Select Frame → Single Component → Gemini → Angular 8
              </div>
            </div>
          </div>
        </div>
      );
    } else if (viewMode === 'categories') {
      return (
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="bg-purple-500 text-white rounded-full p-1">
              <Target className="h-4 w-4" />
            </div>
            <div>
              <div className="font-medium text-purple-800 mb-1">📁 Category View</div>
              <div className="text-sm text-purple-700 mb-2">
                Components organized by functionality. Select <strong>one meaningful component at a time</strong> for Angular generation.
              </div>
              <div className="text-xs bg-white rounded px-2 py-1 font-mono text-purple-800">
                Single Component → Gemini → Angular 8 → Styled Components
              </div>
            </div>
          </div>
        </div>
      );
    } else {
      return (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="bg-blue-500 text-white rounded-full p-1">
              <Target className="h-4 w-4" />
            </div>
            <div>
              <div className="font-medium text-blue-800 mb-1">🅰️ Angular Generation Strategy</div>
              <div className="text-sm text-blue-700 mb-2">
                For best results, select <strong>one meaningful component at a time</strong> and use:
              </div>
              <div className="text-xs bg-white rounded px-2 py-1 font-mono text-blue-800">
                Single Component → Gemini → Angular 8 → Styled Components
              </div>
            </div>
          </div>
        </div>
      );
    }
  };
  
  if (viewMode === 'categories') {
    const groupedComponents = ComponentAnalyzer.groupByCategory(filteredComponents);
    
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            <span className="font-medium text-slate-700">
              Smart Component Analysis
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <select 
              value={viewMode} 
              onChange={(e) => setViewMode(e.target.value as any)}
              className="text-sm border border-slate-300 rounded px-2 py-1"
            >
              <option value="frames">📄 Figma Frames ({frames.length})</option>
              <option value="recommended">⭐ Recommended ({recommendedCount})</option>
              <option value="all">🔍 All Components ({analyzedComponents.length})</option>
              <option value="categories">📁 By Category</option>
            </select>
            
            {recommendedCount > 0 && (
              <button
                onClick={selectRecommended}
                className="text-sm bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700 transition-colors"
              >
                Select Recommended
              </button>
            )}
          </div>
        </div>

        {renderBanner()}

        {/* Categories */}
        <div className="space-y-3">
          {Object.entries(groupedComponents).map(([category, components]) => {
            if (components.length === 0) return null;
            
            const categoryEnum = category as ComponentCategory;
            const isExpanded = expandedCategories.has(categoryEnum);
            const recommendedInCategory = components.filter(c => c.recommendedForGeneration).length;
            
            return (
              <div key={category} className="border border-slate-200 rounded-lg">
                <button
                  onClick={() => toggleCategory(categoryEnum)}
                  className="w-full flex items-center justify-between p-3 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {getCategoryIcon(categoryEnum)}
                    <span className="font-medium text-slate-700">
                      {getCategoryLabel(categoryEnum)}
                    </span>
                    <span className="text-sm text-slate-500">
                      ({components.length})
                    </span>
                    {recommendedInCategory > 0 && (
                      <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded">
                        {recommendedInCategory} recommended
                      </span>
                    )}
                  </div>
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
                
                {isExpanded && (
                  <div className="border-t border-slate-200 p-3 space-y-2">
                    {components.map((component) => {
                      const isSelected = selectedFrames.some(f => f.id === component.node.id);
                      
                      return (
                        <div
                          key={component.node.id}
                          onClick={() => handleComponentToggle(component)}
                          className={`border rounded-lg p-3 cursor-pointer transition-all ${
                            isSelected
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-5 h-5 border-2 rounded flex items-center justify-center transition-all ${
                              isSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-300'
                            }`}>
                              {isSelected && <Check className="h-3 w-3 text-white" />}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium text-slate-800">
                                  {component.cleanName}
                                </h4>
                                {component.recommendedForGeneration && (
                                  <Star className="h-4 w-4 text-yellow-500 fill-current" />
                                )}
                                <span className={`text-xs px-2 py-1 rounded ${getComplexityColor(component.complexity)}`}>
                                  {component.complexity}
                                </span>
                              </div>
                              
                              <p className="text-sm text-slate-600 mb-2">
                                {component.description}
                              </p>
                              
                              <div className="flex items-center gap-4 text-xs text-slate-500">
                                <span>Original: "{component.meaningfulName}"</span>
                                <span>{component.childCount} elements</span>
                                {component.hasInteractivity && (
                                  <span className="text-blue-600">Interactive</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Selection Summary */}
        {selectedFrames.length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-sm text-green-700">
              <strong>{selectedFrames.length}</strong> component{selectedFrames.length !== 1 ? 's' : ''} selected
              {selectedFrames.length === 1 && (
                <span> - Ready for Angular generation!</span>
              )}
            </p>
          </div>
        )}
      </div>
    );
  }

  // Simple list view for recommended/all
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-600" />
          <span className="font-medium text-slate-700">
            {viewMode === 'frames' ? 'Figma Frames' : 
             viewMode === 'recommended' ? 'Recommended Components' : 'All Components'}
          </span>
          <span className="text-sm text-slate-500">({filteredComponents.length})</span>
        </div>
        
        <div className="flex items-center gap-2">
          <select 
            value={viewMode} 
            onChange={(e) => setViewMode(e.target.value as any)}
            className="text-sm border border-slate-300 rounded px-2 py-1"
          >
            <option value="frames">📄 Figma Frames ({frames.length})</option>
            <option value="recommended">⭐ Recommended ({recommendedCount})</option>
            <option value="all">🔍 All Components ({analyzedComponents.length})</option>
            <option value="categories">📁 By Category</option>
          </select>
        </div>
      </div>

      {renderBanner()}

      {/* Component List */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {filteredComponents.map((component) => {
          const isSelected = selectedFrames.some(f => f.id === component.node.id);
          
          return (
            <div
              key={component.node.id}
              onClick={() => handleComponentToggle(component)}
              className={`border rounded-lg p-4 cursor-pointer transition-all ${
                isSelected
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-5 h-5 border-2 rounded flex items-center justify-center transition-all ${
                  isSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-300'
                }`}>
                  {isSelected && <Check className="h-3 w-3 text-white" />}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {getCategoryIcon(component.category)}
                    <h4 className="font-medium text-slate-800">
                      {component.cleanName}
                    </h4>
                    {component.recommendedForGeneration && (
                      <Star className="h-4 w-4 text-yellow-500 fill-current" />
                    )}
                    <span className={`text-xs px-2 py-1 rounded ${getComplexityColor(component.complexity)}`}>
                      {component.complexity}
                    </span>
                  </div>
                  
                  <p className="text-sm text-slate-600 mb-2">
                    {component.description}
                  </p>
                  
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="bg-slate-100 px-2 py-1 rounded">
                      {getCategoryLabel(component.category)}
                    </span>
                    <span>"{component.meaningfulName}"</span>
                    <span>{component.childCount} elements</span>
                    {component.hasInteractivity && (
                      <span className="text-blue-600">Interactive</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredComponents.length === 0 && (
        <div className="text-center py-8 text-slate-500">
          <AlertTriangle className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No {viewMode} components found.</p>
          <p className="text-sm">Try switching to "All Components" view.</p>
        </div>
      )}
    </div>
  );
}