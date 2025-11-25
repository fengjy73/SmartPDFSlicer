import React, { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize, Minimize } from 'lucide-react';

// Configure worker locally
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PreviewPanelProps {
  file: File | null;
  currentPage: number;
  onPageChange: (page: number) => void;
  onDocumentLoadSuccess: (data: { numPages: number, outline: any[] }) => void;
  setCanvasRef: (canvas: HTMLCanvasElement | null) => void;
}

export const PreviewPanel: React.FC<PreviewPanelProps> = ({ 
  file, 
  currentPage, 
  onPageChange, 
  onDocumentLoadSuccess,
  setCanvasRef
}) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [scale, setScale] = useState<number>(1.0);
  const [pageDimensions, setPageDimensions] = useState<{ width: number, height: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const onDocumentLoad = async (pdf: any) => {
    setNumPages(pdf.numPages);
    
    let resolvedOutline: any[] = [];
    try {
      const rawOutline = await pdf.getOutline();
      
      if (rawOutline) {
         const resolveItems = async (items: any[]): Promise<any[]> => {
            const results = [];
            for (const item of items) {
               let pageNumber = 1; 
               try {
                  let dest = item.dest;
                  if (typeof dest === 'string') {
                     dest = await pdf.getDestination(dest);
                  }
                  if (Array.isArray(dest) && dest.length > 0) {
                     const ref = dest[0]; 
                     const pageIndex = await pdf.getPageIndex(ref);
                     pageNumber = pageIndex + 1; 
                  }
               } catch (err) {
                  console.warn(`Could not resolve page for outline item: ${item.title}`, err);
               }

               results.push({
                  title: item.title,
                  pageNumber: pageNumber,
                  items: await resolveItems(item.items || [])
               });
            }
            return results;
         };
         resolvedOutline = await resolveItems(rawOutline);
      }
    } catch (e) {
      console.warn("Failed to retrieve outline", e);
    }

    onDocumentLoadSuccess({ numPages: pdf.numPages, outline: resolvedOutline });
  };

  const handlePageChange = (delta: number) => {
    const newPage = currentPage + delta;
    if (newPage >= 1 && newPage <= numPages) {
      onPageChange(newPage);
    }
  };

  const fitToPage = () => {
    if (containerRef.current && pageDimensions) {
        const padding = 48; // Vertical padding
        const availableHeight = containerRef.current.clientHeight - padding;
        const newScale = availableHeight / pageDimensions.height;
        // Set scale to fit height, ensuring it's not 0 or negative
        setScale(Math.max(0.1, newScale));
    }
  };

  // Callback when the individual Page component loads its dimensions
  const onPageLoad = (page: any) => {
      // page.originalHeight and page.originalWidth are the PDF point dimensions
      setPageDimensions({ width: page.originalWidth, height: page.originalHeight });
      
      // If this is the very first render or load of the doc, force Fit Page
      if (isInitialLoad && containerRef.current) {
          const padding = 48;
          const availableHeight = containerRef.current.clientHeight - padding;
          const newScale = availableHeight / page.originalHeight;
          setScale(Math.max(0.1, newScale));
          setIsInitialLoad(false);
      }
  };

  return (
    <div className="h-full flex flex-col relative">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:20px_20px] opacity-30 pointer-events-none"></div>

      {/* Floating Toolbar */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-20 flex items-center space-x-2 bg-white/90 backdrop-blur-md shadow-2xl shadow-blue-900/10 rounded-full px-4 py-2.5 border border-white/50 transition-all hover:scale-105">
         <button 
           onClick={() => handlePageChange(-1)} 
           disabled={currentPage <= 1}
           className="p-1.5 rounded-full hover:bg-slate-100 disabled:opacity-30 text-slate-700 transition-colors"
         >
           <ChevronLeft size={20} />
         </button>
         
         <span className="text-sm font-semibold w-24 text-center text-slate-700 select-none font-mono">
            {currentPage} / {numPages || '--'}
         </span>

         <button 
           onClick={() => handlePageChange(1)} 
           disabled={currentPage >= numPages}
           className="p-1.5 rounded-full hover:bg-slate-100 disabled:opacity-30 text-slate-700 transition-colors"
         >
           <ChevronRight size={20} />
         </button>

         <div className="w-px h-5 bg-slate-300 mx-2"></div>

         <button onClick={() => setScale(s => Math.max(0.2, s - 0.1))} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-700 transition-colors">
           <ZoomOut size={18} />
         </button>
         <span className="text-xs w-14 text-center text-slate-500 select-none font-mono font-medium">{Math.round(scale * 100)}%</span>
         <button onClick={() => setScale(s => Math.min(5.0, s + 0.1))} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-700 transition-colors">
           <ZoomIn size={18} />
         </button>
         
         <div className="w-px h-5 bg-slate-300 mx-2"></div>

         <button 
            onClick={fitToPage}
            className="p-1.5 rounded-full hover:bg-blue-50 text-slate-600 hover:text-blue-600 transition-colors"
            title="Fit Page (Height)"
         >
            <Maximize size={16} />
         </button>
      </div>

      {/* PDF Canvas */}
      <div 
        className="flex-1 overflow-auto p-8 scrollbar-thin relative flex justify-center"
        ref={containerRef}
      >
        {file ? (
          <Document
            file={file}
            onLoadSuccess={onDocumentLoad}
            className="transition-opacity duration-500 ease-in-out"
            loading={
              <div className="flex flex-col items-center justify-center h-full text-slate-400 min-h-[50vh]">
                <div className="relative mb-4">
                    <div className="absolute inset-0 bg-blue-500 rounded-full blur-xl opacity-20 animate-pulse"></div>
                    <svg className="animate-spin h-10 w-10 text-blue-500 relative z-10" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                </div>
                <span className="font-medium animate-pulse">Rendering Document...</span>
              </div>
            }
          >
            <Page 
              pageNumber={currentPage} 
              scale={scale} 
              canvasRef={(ref) => setCanvasRef(ref)}
              renderTextLayer={false}
              renderAnnotationLayer={false}
              onLoadSuccess={onPageLoad}
              className="bg-white"
            />
          </Document>
        ) : (
           <div className="flex items-center justify-center h-full text-slate-300 font-medium">
             No Document Loaded
           </div>
        )}
      </div>
    </div>
  );
};