import React, { useRef } from 'react';
import { Upload, FileText, Sparkles, CloudUpload } from 'lucide-react';

interface UploadOverlayProps {
  onFileSelect: (file: File) => void;
}

export const UploadOverlay: React.FC<UploadOverlayProps> = ({ onFileSelect }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'application/pdf') {
        onFileSelect(file);
      } else {
        alert("Please upload a valid PDF file.");
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-50/90 backdrop-blur-xl z-50 flex items-center justify-center p-6 overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-400/20 rounded-full blur-[100px] animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-400/20 rounded-full blur-[100px] animate-pulse delay-1000"></div>

      <div 
        className="group relative bg-white/60 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_20px_50px_rgba(8,_112,_184,_0.15)] p-12 max-w-xl w-full text-center border border-white/60 hover:border-blue-300/50 transition-all duration-500 cursor-pointer transform hover:scale-[1.01] hover:-translate-y-2 ring-1 ring-white/50"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        {/* Floating elements effect */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/40 to-transparent rounded-[2.5rem] pointer-events-none"></div>

        <div className="relative z-10">
            <div className="w-28 h-28 mx-auto mb-8 relative group-hover:scale-110 transition-transform duration-500 ease-out">
                {/* Icon Background Layers */}
                <div className="absolute inset-0 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-3xl rotate-6 opacity-20 group-hover:rotate-12 transition-transform duration-500"></div>
                <div className="absolute inset-0 bg-white rounded-3xl shadow-xl border border-white/50 flex items-center justify-center -rotate-3 group-hover:rotate-0 transition-transform duration-500">
                    <CloudUpload size={48} className="text-blue-600 drop-shadow-sm" strokeWidth={1.5} />
                </div>
                
                <div className="absolute -top-4 -right-4 bg-white p-2 rounded-2xl shadow-lg border border-slate-100 animate-bounce delay-700">
                    <Sparkles size={18} className="text-amber-400 fill-amber-400" />
                </div>
            </div>
            
            <h1 className="text-4xl font-extrabold text-slate-800 mb-4 tracking-tight drop-shadow-sm">
              Upload PDF
            </h1>
            
            <p className="text-slate-500 mb-10 text-lg font-medium leading-relaxed max-w-sm mx-auto">
              Drag & drop your document here, <br/>
              or click to browse from your device.
            </p>
            
            <button className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-10 py-4 rounded-2xl font-bold text-lg shadow-lg shadow-blue-500/30 group-hover:shadow-blue-500/50 transition-all duration-300 w-full max-w-xs mx-auto flex items-center justify-center gap-3 group-hover:gap-4">
              <span className="relative z-10 flex items-center gap-2">
                 <FileText size={20} />
                 Select Document
              </span>
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
            </button>
            
            <p className="mt-8 text-xs font-semibold text-slate-400 uppercase tracking-widest opacity-60">
                Supports PDF Documents
            </p>
        </div>

        <input 
          type="file" 
          accept="application/pdf" 
          ref={fileInputRef} 
          className="hidden" 
          onChange={(e) => {
            if (e.target.files?.[0]) onFileSelect(e.target.files[0]);
          }}
        />
      </div>
    </div>
  );
};