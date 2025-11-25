import React from 'react';
import { OutlineNode } from '../types';
import { ChevronRight, ChevronDown, CheckSquare, Square, Trash2, BookOpen } from 'lucide-react';

interface OutlinePanelProps {
  outline: OutlineNode[];
  selectedPages: Set<number>;
  onToggleRange: (start: number, end: number, select: boolean) => void;
  onJumpToPage: (page: number) => void;
  onClearSelection: () => void;
  currentPage: number;
}

const OutlineItem: React.FC<{
  node: OutlineNode;
  selectedPages: Set<number>;
  onToggleRange: (start: number, end: number, select: boolean) => void;
  onJumpToPage: (page: number) => void;
  level?: number;
}> = ({ node, selectedPages, onToggleRange, onJumpToPage, level = 0 }) => {
  // Items are collapsed by default
  const [expanded, setExpanded] = React.useState(false);
  
  const start = node.pageNumber;
  const end = node.endPageNumber || start;
  
  let isChecked = true;
  for (let i = start; i <= end; i++) {
    if (!selectedPages.has(i)) {
      isChecked = false;
      break;
    }
  }

  const handleCheckClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleRange(start, end, !isChecked);
  };

  const handleTitleClick = () => {
    onJumpToPage(start);
  };

  return (
    <div className="select-none text-slate-700">
      <div 
        className={`group flex items-center py-2 px-2 my-0.5 rounded-lg cursor-pointer transition-all duration-200 ${level > 0 ? 'ml-4' : ''} hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-100 ${isChecked ? 'bg-blue-50/50 border-blue-50' : ''}`}
        onClick={handleTitleClick}
      >
        <button 
          onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
          className={`p-1 mr-1.5 rounded-md text-slate-400 hover:bg-blue-100 hover:text-blue-600 transition-colors ${!node.items || node.items.length === 0 ? 'invisible' : ''}`}
        >
          {expanded ? <ChevronDown size={14} strokeWidth={2.5} /> : <ChevronRight size={14} strokeWidth={2.5} />}
        </button>

        <button onClick={handleCheckClick} className={`mr-2.5 transition-all duration-200 ${isChecked ? 'text-blue-600 scale-105' : 'text-slate-300 hover:text-blue-400 hover:scale-110'}`}>
          {isChecked ? <CheckSquare size={18} strokeWidth={2.5} /> : <Square size={18} strokeWidth={2} />}
        </button>

        <span className={`text-sm truncate flex-1 font-medium transition-colors ${isChecked ? 'text-blue-700' : 'text-slate-600 group-hover:text-blue-600'}`} title={node.title}>
          {node.title} <span className="text-[10px] text-slate-400 ml-1 font-normal opacity-0 group-hover:opacity-100 transition-opacity">(Pg {node.pageNumber})</span>
        </span>
      </div>

      {expanded && node.items && node.items.length > 0 && (
        <div className="border-l border-slate-200 ml-4 pl-1 my-1">
          {node.items.map((child, idx) => (
            <OutlineItem 
              key={`${child.title}-${idx}`} 
              node={child} 
              selectedPages={selectedPages}
              onToggleRange={onToggleRange}
              onJumpToPage={onJumpToPage}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const OutlinePanel: React.FC<OutlinePanelProps> = ({ 
  outline, 
  selectedPages, 
  onToggleRange,
  onJumpToPage,
  onClearSelection,
  currentPage 
}) => {
  return (
    <div className="h-full flex flex-col">
      <div className="p-5 border-b border-slate-100 bg-white/50 backdrop-blur-md flex justify-between items-start shrink-0">
        <div>
          <h2 className="font-bold text-slate-800 flex items-center gap-2">
            <BookOpen size={18} className="text-blue-500"/>
            Outline
          </h2>
          <p className="text-xs text-slate-400 mt-1 font-medium">Select chapters to extract</p>
        </div>
        {selectedPages.size > 0 && (
          <button 
            onClick={onClearSelection}
            className="text-slate-400 hover:text-red-500 p-1.5 rounded-md hover:bg-red-50 transition-all duration-200"
            title="Clear selection"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
      
      <div className="flex-1 overflow-y-auto p-3 scrollbar-thin">
        {outline.length === 0 ? (
          <div className="flex flex-col items-center justify-center mt-20 text-slate-300 text-sm p-4 text-center">
            <BookOpen size={48} className="mb-4 opacity-20" />
            <p className="font-medium text-slate-400">No outline found</p>
            <p className="text-xs mt-2">Use the selection tool or manual select pages.</p>
          </div>
        ) : (
          outline.map((node, idx) => (
            <OutlineItem 
              key={`${node.title}-${idx}`} 
              node={node} 
              selectedPages={selectedPages} 
              onToggleRange={onToggleRange}
              onJumpToPage={onJumpToPage}
            />
          ))
        )}
      </div>
    </div>
  );
};