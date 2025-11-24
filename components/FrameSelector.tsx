'use client';

import { useState } from 'react';
import { ProcessedNode } from '../types/figma';
import { countAllChildren } from '../utils/figma';
import { Frame, Layers, Check } from 'lucide-react';

interface FrameSelectorProps {
  frames: ProcessedNode[];
  selectedFrames: ProcessedNode[];
  onSelectionChange: (frames: ProcessedNode[]) => void;
}

export default function FrameSelector({ frames, selectedFrames, onSelectionChange }: FrameSelectorProps) {
  const [selectAll, setSelectAll] = useState(false);

  const handleFrameToggle = (frame: ProcessedNode) => {
    const isSelected = selectedFrames.some(f => f.id === frame.id);
    let newSelection: ProcessedNode[];

    if (isSelected) {
      newSelection = selectedFrames.filter(f => f.id !== frame.id);
    } else {
      newSelection = [...selectedFrames, frame];
    }

    onSelectionChange(newSelection);
    setSelectAll(newSelection.length === frames.length);
  };

  const handleSelectAll = () => {
    const newSelectAll = !selectAll;
    setSelectAll(newSelectAll);
    
    if (newSelectAll) {
      onSelectionChange(frames);
    } else {
      onSelectionChange([]);
    }
  };

  const formatDimensions = (frame: ProcessedNode) => {
    if (frame.styles?.width && frame.styles?.height) {
      return `${Math.round(frame.styles.width)}×${Math.round(frame.styles.height)}`;
    }
    // Fallback: try to get dimensions from other properties
    if (frame.absoluteBoundingBox) {
      return `${Math.round(frame.absoluteBoundingBox.width)}×${Math.round(frame.absoluteBoundingBox.height)}`;
    }
    return 'Unknown size';
  };

  const getChildrenCount = (frame: ProcessedNode) => {
    const directChildren = frame.children?.length || 0;
    const totalChildren = countAllChildren(frame);
    return { direct: directChildren, total: totalChildren };
  };

  if (frames.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        <Layers className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>No frames found in this Figma file.</p>
        <p className="text-sm">Make sure your file contains frames with content.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Select All */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Frame className="h-5 w-5 text-slate-600" />
          <span className="font-medium text-slate-700">
            Found {frames.length} frame{frames.length !== 1 ? 's' : ''}
          </span>
        </div>
        
        <button
          onClick={handleSelectAll}
          className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 transition-colors"
        >
          <div className={`w-4 h-4 border-2 rounded flex items-center justify-center transition-all ${
            selectAll ? 'bg-blue-600 border-blue-600' : 'border-slate-300'
          }`}>
            {selectAll && <Check className="h-3 w-3 text-white" />}
          </div>
          Select All
        </button>
      </div>

      {/* Frame List */}
      <div className="grid grid-cols-1 gap-3 max-h-96 overflow-y-auto">
        {frames.map((frame) => {
          const isSelected = selectedFrames.some(f => f.id === frame.id);
          
          return (
            <div
              key={frame.id}
              onClick={() => handleFrameToggle(frame)}
              className={`border-2 rounded-lg p-4 cursor-pointer transition-all duration-200 ${
                isSelected
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3">
                {/* Checkbox */}
                <div className={`w-5 h-5 border-2 rounded flex items-center justify-center transition-all ${
                  isSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-300'
                }`}>
                  {isSelected && <Check className="h-3 w-3 text-white" />}
                </div>

                {/* Frame Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-slate-800 truncate">{frame.name || 'Unnamed Frame'}</h3>
                    <span className="text-sm text-slate-500 flex-shrink-0 ml-2">
                      {formatDimensions(frame)}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                    <span>{getChildrenCount(frame).total} elements total ({getChildrenCount(frame).direct} direct)</span>
                    {frame.styles?.backgroundColor && (
                      <div className="flex items-center gap-1">
                        <div
                          className="w-3 h-3 rounded border border-slate-300"
                          style={{ backgroundColor: frame.styles.backgroundColor }}
                        />
                        <span>Background</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Preview of child elements */}
              {frame.children && frame.children.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-200">
                  <div className="text-xs text-slate-500 mb-2">Contains:</div>
                  <div className="flex flex-wrap gap-1">
                    {frame.children.slice(0, 5).map((child, index) => (
                      <span
                        key={index}
                        className="inline-block px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded"
                      >
                        {child.type === 'TEXT' ? `"${child.content?.slice(0, 20)}..."` : child.type}
                      </span>
                    ))}
                    {frame.children.length > 5 && (
                      <span className="inline-block px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded">
                        +{frame.children.length - 5} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Selection Summary */}
      {selectedFrames.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-700">
            <strong>{selectedFrames.length}</strong> frame{selectedFrames.length !== 1 ? 's' : ''} selected
            {selectedFrames.length === 1 && (
              <span> - "{selectedFrames[0].name}"</span>
            )}
          </p>
        </div>
      )}
    </div>
  );
}