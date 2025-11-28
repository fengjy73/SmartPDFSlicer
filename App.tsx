import React, { useState, useEffect, useCallback, useRef } from 'react';
import { OutlinePanel } from './components/OutlinePanel';
import { PreviewPanel } from './components/PreviewPanel';
import { AssistantPanel } from './components/AssistantPanel';
import { UploadOverlay } from './components/UploadOverlay';
import { OutlineNode } from './types';
import { Download, Scissors, X, Trash2, AlertTriangle, FileText, GripVertical, Sparkles } from 'lucide-react';
import { slicePDF, downloadBlob } from './services/pdfUtils';

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [outline, setOutline] = useState<OutlineNode[]>([]);
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Layout & Resizing State
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [assistantWidth, setAssistantWidth] = useState(400);
  const [activeResizer, setActiveResizer] = useState<'outline' | 'assistant' | null>(null);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);

  // Modals State
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [filenameInput, setFilenameInput] = useState("");
  
  // Reference to current canvas
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Monitor screen size for responsiveness
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Resize Handlers
  const startResizingOutline = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setActiveResizer('outline');
  }, []);

  const startResizingAssistant = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setActiveResizer('assistant');
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!activeResizer) return;
      
      if (activeResizer === 'outline') {
        const newWidth = Math.max(220, Math.min(600, e.clientX));
        setSidebarWidth(newWidth);
      } else if (activeResizer === 'assistant') {
        const newWidth = Math.max(300, Math.min(800, window.innerWidth - e.clientX));
        setAssistantWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setActiveResizer(null);
    };

    if (activeResizer) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [activeResizer]);

  // Robust outline range calculation
  const enhanceOutlineRanges = (nodes: OutlineNode[], totalPages: number): OutlineNode[] => {
    const processNodes = (currentNodes: OutlineNode[], startLimit: number, endLimit: number) => {
        // Ensure nodes are sorted by page number to prevent range errors
        currentNodes.sort((a, b) => a.pageNumber - b.pageNumber);

        for (let i = 0; i < currentNodes.length; i++) {
            const node = currentNodes[i];
            const nextNode = currentNodes[i + 1];
            
            // Tentative end based on next sibling start
            // If there is a next node, the current chapter ends before it starts.
            // If not, it ends at the parent's endLimit.
            const nextStart = nextNode ? nextNode.pageNumber : endLimit + 1;
            
            // Default range for this node is up to the start of the next one
            let calculatedEnd = nextStart - 1;

            // Ensure strict sanity: range can't appear before it starts
            if (calculatedEnd < node.pageNumber) {
                calculatedEnd = node.pageNumber; 
            }

            if (node.items && node.items.length > 0) {
                // Recursively process children using the calculated end as their context limit
                processNodes(node.items, node.pageNumber, calculatedEnd);
                
                // CRITICAL FIX: After processing children, ensure parent's endPageNumber covers them.
                // If a child extends beyond the 'next sibling start' (e.g. child starts on the same page as next chapter),
                // we must extend the parent to include that child.
                const lastChild = node.items[node.items.length - 1];
                if (lastChild.endPageNumber && lastChild.endPageNumber > calculatedEnd) {
                    calculatedEnd = lastChild.endPageNumber;
                }
            }

            node.endPageNumber = calculatedEnd;
        }
    };

    processNodes(nodes, 1, totalPages);
    return nodes;
  };

  const handleDocumentLoad = async ({ numPages, outline: resolvedOutline }: { numPages: number, outline: any[] }) => {
    setNumPages(numPages);
    
    let finalOutline = resolvedOutline;

    // Fallback: If no outline is found, generate a page-based outline
    if (!resolvedOutline || resolvedOutline.length === 0) {
        finalOutline = Array.from({ length: numPages }, (_, i) => ({
            title: `Page ${i + 1}`,
            pageNumber: i + 1,
            items: [],
            endPageNumber: i + 1
        }));
    }

    const enhancedOutline = enhanceOutlineRanges(finalOutline, numPages);
    setOutline(enhancedOutline);
  };

  const handleToggleRange = (start: number, end: number, select: boolean) => {
    setSelectedPages(prev => {
      const next = new Set(prev);
      const safeEnd = Math.min(end, numPages);
      const safeStart = Math.max(1, start);

      for (let i = safeStart; i <= safeEnd; i++) {
        if (select) next.add(i);
        else next.delete(i);
      }
      return next;
    });
  };
  
  const handleClearSelection = () => {
      setSelectedPages(new Set());
  };

  const handleResetClick = () => {
    setShowCloseModal(true);
  };

  const confirmReset = () => {
    setFile(null);
    setNumPages(0);
    setCurrentPage(1);
    setOutline([]);
    setSelectedPages(new Set());
    setIsProcessing(false);
    setShowCloseModal(false);
  };

  const handleDownloadClick = () => {
    if (selectedPages.size === 0 || !file) return;

    let baseName = file.name.replace(/\.pdf$/i, "");
    let suffix = "Selection";

    const sortedPages: number[] = Array.from(selectedPages).sort((a: number, b: number) => a - b);
    const firstPage = sortedPages[0];

    if (firstPage !== undefined) {
      // Recursive search to find the most specific (deepest) node that contains the start page
      const findDeepestNodeCoveringPage = (nodes: OutlineNode[], page: number): OutlineNode | null => {
        for (const node of nodes) {
           const start = node.pageNumber;
           const end = node.endPageNumber || start;
           
           if (page >= start && page <= end) {
             // This node matches. Check if a child provides a more specific match.
             if (node.items && node.items.length > 0) {
                const childMatch = findDeepestNodeCoveringPage(node.items, page);
                if (childMatch) {
                   return childMatch;
                }
             }
             // No child match (or no children), so this node is the deepest match
             return node;
           }
        }
        return null;
      };

      const matchedNode = findDeepestNodeCoveringPage(outline, firstPage);

      if (matchedNode) {
        suffix = matchedNode.title;
      }
    }

    const safeSuffix = suffix.replace(/[<>:"/\\|?*]/g, "_").trim();
    const defaultName = `${baseName}_${safeSuffix}.pdf`;

    setFilenameInput(defaultName);
    setShowDownloadModal(true);
  };

  const executeDownload = async () => {
    if (!file) return;
    let finalName = filenameInput.trim();
    if (!finalName.toLowerCase().endsWith('.pdf')) {
      finalName += '.pdf';
    }

    setShowDownloadModal(false);
    setIsProcessing(true);
    
    try {
      const newPdfBlob = await slicePDF(file, selectedPages);
      downloadBlob(newPdfBlob, finalName);
    } catch (e) {
      alert("Error slicing PDF: " + e);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-50 overflow-hidden text-slate-800 font-sans selection:bg-blue-100 selection:text-blue-900">
      
      {/* Header */}
      <header className="relative h-[72px] bg-white/80 backdrop-blur-xl border-b border-slate-200/60 flex items-center justify-between px-6 z-30 shadow-sm shrink-0 transition-all">
        {/* Animated Brand Logo */}
        <div className="flex items-center gap-3.5 group cursor-pointer select-none" onClick={() => window.location.reload()}>
          <div className="relative">
             <div className="absolute inset-0 bg-blue-600 rounded-xl blur-lg opacity-20 group-hover:opacity-40 transition-opacity duration-500"></div>
             <div className="relative bg-gradient-to-br from-blue-600 to-indigo-600 p-2.5 rounded-xl shadow-lg shadow-blue-500/20 group-hover:scale-105 group-hover:-rotate-3 transition-all duration-300 ring-1 ring-white/20">
                <Scissors className="text-white" size={24} strokeWidth={2.5} />
             </div>
             <div className="absolute -top-1.5 -right-1.5 bg-white rounded-full p-0.5 shadow-sm border border-slate-100 scale-0 group-hover:scale-100 transition-transform duration-300 delay-75">
                <Sparkles size={12} className="text-amber-400 fill-amber-400" />
             </div>
          </div>
          
          <div className="flex flex-col justify-center gap-0.5">
            <h1 className="text-2xl font-black tracking-tight text-slate-900 leading-none">
              PDF<span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-indigo-500 to-violet-600 animate-gradient-x">Slice</span>
            </h1>
            <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
              <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                & Chat AI
              </span>
              <span className="flex h-1.5 w-1.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500"></span>
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
          {file && (
            <>
              <div className="text-sm text-slate-500 hidden md:flex items-center gap-2 bg-slate-100/50 px-4 py-1.5 rounded-full border border-slate-200/50 hover:bg-white transition-colors">
                  <FileText size={14} className="text-blue-500" />
                  <span className="font-bold text-slate-700">{selectedPages.size}</span> 
                  <span className="opacity-70 text-xs uppercase tracking-wide font-medium">pages selected</span>
              </div>
              
              <div className="h-6 w-px bg-slate-200/60 mx-1 hidden md:block"></div>
              
              <button 
                  onClick={handleDownloadClick}
                  disabled={selectedPages.size === 0 || isProcessing}
                  className={`
                    flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-sm tracking-wide transition-all duration-300
                    ${selectedPages.size > 0 
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-0.5 active:translate-y-0 active:scale-95' 
                      : 'bg-slate-100 text-slate-300 cursor-not-allowed border border-slate-200'}
                  `}
              >
                  {isProcessing ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Download size={18} strokeWidth={2.5} />
                  )}
                  <span className="hidden sm:inline">Cut & Download</span>
              </button>

              <button 
                  onClick={handleResetClick}
                  className="group relative text-slate-400 hover:text-red-500 hover:bg-red-50 p-2.5 rounded-full transition-all duration-200 flex items-center justify-center"
                  title="Close PDF"
              >
                  <Trash2 size={20} strokeWidth={2} className="transition-transform group-hover:scale-110" />
              </button>
            </>
          )}
        </div>
      </header>

      {/* Main Layout - Flexbox for Resizable Columns */}
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden relative min-h-0">
        
        {/* Left: Outline - Resizable */}
        <aside 
           className="flex-shrink-0 flex flex-col border-r border-slate-200/60 bg-white/80 backdrop-blur-sm z-10 overflow-hidden transition-[height] duration-300 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.05)]"
           style={{ 
             width: isMobile ? '100%' : sidebarWidth,
             height: isMobile ? '35vh' : '100%' 
           }}
        >
           <OutlinePanel 
             outline={outline} 
             selectedPages={selectedPages}
             onToggleRange={handleToggleRange}
             onJumpToPage={setCurrentPage}
             onClearSelection={handleClearSelection}
             currentPage={currentPage}
           />
        </aside>

        {/* Resizer Handle (Left) */}
        {!isMobile && (
          <div
            className="hidden md:flex w-0 hover:w-0 z-20 cursor-col-resize items-center justify-center relative group"
            onMouseDown={startResizingOutline}
          >
             <div className={`absolute left-[-6px] top-0 bottom-0 w-4 hover:bg-blue-400/0 transition-colors ${activeResizer === 'outline' ? 'bg-blue-500/0' : ''}`}></div>
             <div className={`w-[1px] h-full bg-slate-200 transition-colors duration-300 group-hover:bg-blue-400/50 group-hover:w-[2px] ${activeResizer === 'outline' ? 'bg-blue-500 w-[2px] shadow-[0_0_10px_rgba(59,130,246,0.5)]' : ''}`}></div>
             <div className={`absolute top-1/2 -translate-y-1/2 bg-white border border-slate-200 text-slate-400 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm ${activeResizer === 'outline' ? 'opacity-100 text-blue-500 border-blue-400' : ''}`}>
               <GripVertical size={12} />
             </div>
          </div>
        )}

        {/* Center: Preview - Flexible */}
        <section 
          className="flex-1 flex flex-col min-w-0 bg-slate-100/50 relative z-0"
          style={{ height: isMobile ? '50vh' : '100%' }}
        >
          <PreviewPanel 
            file={file} 
            currentPage={currentPage} 
            onPageChange={setCurrentPage}
            onDocumentLoadSuccess={handleDocumentLoad}
            setCanvasRef={(ref) => canvasRef.current = ref}
          />
          {/* Overlay to catch events during resize */}
          {activeResizer && <div className="absolute inset-0 z-50 bg-transparent" />}
        </section>

        {/* Resizer Handle (Right) */}
        {!isMobile && file && (
          <div
            className="hidden md:flex w-0 hover:w-0 z-20 cursor-col-resize items-center justify-center relative group"
            onMouseDown={startResizingAssistant}
          >
             <div className={`absolute left-[-6px] top-0 bottom-0 w-4 hover:bg-blue-400/0 transition-colors ${activeResizer === 'assistant' ? 'bg-blue-500/0' : ''}`}></div>
             <div className={`w-[1px] h-full bg-slate-200 transition-colors duration-300 group-hover:bg-blue-400/50 group-hover:w-[2px] ${activeResizer === 'assistant' ? 'bg-blue-500 w-[2px] shadow-[0_0_10px_rgba(59,130,246,0.5)]' : ''}`}></div>
             <div className={`absolute top-1/2 -translate-y-1/2 bg-white border border-slate-200 text-slate-400 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm ${activeResizer === 'assistant' ? 'opacity-100 text-blue-500 border-blue-400' : ''}`}>
               <GripVertical size={12} />
             </div>
          </div>
        )}

        {/* Right: AI Assistant - Resizable on Desktop */}
        <aside 
          className="flex-shrink-0 flex flex-col border-l border-slate-200/60 bg-white/90 z-10 shadow-[-4px_0_24px_-12px_rgba(0,0,0,0.05)]"
          style={{ 
            width: isMobile ? '100%' : assistantWidth,
            height: isMobile ? 'flex' : '100%',
            flex: isMobile ? '1 1 0%' : 'none'
          }}
        >
           <AssistantPanel 
              key={file ? file.name : 'empty'}
              file={file}
              selectedPages={selectedPages}
           />
        </aside>

        {/* Overlay if no file */}
        {!file && <UploadOverlay onFileSelect={setFile} />}

        {/* Download Modal */}
        {showDownloadModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full animate-in fade-in zoom-in duration-300 border border-white/50 ring-1 ring-slate-900/5">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <Download size={24} className="text-blue-600" />
                  Download Selection
                </h3>
                <button 
                  onClick={() => setShowDownloadModal(false)}
                  className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-50 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="mb-8 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                    File Name
                  </label>
                  <div className="relative group">
                    <input 
                      type="text" 
                      value={filenameInput}
                      onChange={(e) => setFilenameInput(e.target.value)}
                      className="w-full pl-5 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-medium text-slate-700"
                      autoFocus
                    />
                    <div className="absolute right-4 top-4 text-slate-400 text-xs font-bold pointer-events-none bg-slate-100 px-1.5 py-0.5 rounded">PDF</div>
                  </div>
                </div>
                
                <div className="bg-blue-50/50 rounded-xl p-4 flex items-start gap-3 border border-blue-100">
                   <div className="p-1.5 bg-blue-100 rounded-lg shrink-0">
                      <FileText size={16} className="text-blue-600" />
                   </div>
                   <div>
                      <p className="text-sm font-semibold text-slate-700">Ready to export</p>
                      <p className="text-xs text-slate-500 mt-0.5">Creating a new PDF containing {selectedPages.size} selected pages.</p>
                   </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button 
                  onClick={() => setShowDownloadModal(false)}
                  className="px-6 py-3 text-slate-600 font-semibold hover:bg-slate-50 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={executeDownload}
                  className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-blue-500/30 hover:-translate-y-0.5 transition-all flex items-center gap-2 active:scale-95 active:translate-y-0"
                >
                  Download PDF
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Close Confirmation Modal */}
        {showCloseModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full animate-in fade-in zoom-in duration-300 border border-white/50 ring-1 ring-slate-900/5">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-6 shadow-sm ring-1 ring-red-100">
                  <div className="relative">
                     <AlertTriangle className="text-red-500 relative z-10" size={32} />
                     <div className="absolute inset-0 bg-red-400 blur opacity-20 animate-pulse"></div>
                  </div>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Close Document?</h3>
                <p className="text-sm text-slate-500 mb-8 leading-relaxed px-4">
                  Are you sure you want to close this PDF? Your current selection and chat history will be lost.
                </p>
                
                <div className="flex gap-3 w-full">
                  <button 
                    onClick={() => setShowCloseModal(false)}
                    className="flex-1 px-4 py-3 text-slate-700 font-semibold hover:bg-slate-50 rounded-xl transition-colors border border-slate-200"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={confirmReset}
                    className="flex-1 px-4 py-3 bg-red-500 text-white font-semibold rounded-xl hover:bg-red-600 hover:shadow-lg hover:shadow-red-500/20 transition-all active:scale-95"
                  >
                    Close PDF
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

export default App;