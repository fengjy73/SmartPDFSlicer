import React, { useRef } from 'react';
import { Upload, FileText, Sparkles } from 'lucide-react';

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
    <div className="fixed inset-0 bg-slate-50/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div 
        className="group bg-white rounded-3xl shadow-2xl p-12 max-w-xl w-full text-center border-2 border-dashed border-slate-200 hover:border-blue-400 transition-all duration-300 cursor-pointer relative overflow-hidden"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-500"></div>
        
        <div className="bg-blue-50 group-hover:bg-blue-100 transition-colors w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8 relative">
          <div className="absolute inset-0 bg-blue-400 rounded-full blur-xl opacity-0 group-hover:opacity-30 transition-opacity duration-500"></div>
          <FileText size={48} className="text-blue-600 relative z-10" />
          <Sparkles size={20} className="text-yellow-400 absolute top-2 right-2 animate-bounce" />
        </div>
        
        <h1 className="text-3xl font-bold text-slate-800 mb-3 tracking-tight">Upload your PDF</h1>
        <p className="text-slate-500 mb-10 text-lg">
          Drag and drop your file here, or click to browse.<br/>
          <span className="text-sm text-slate-400 mt-2 block">We'll auto-detect chapters for you.</span>
        </p>
        
        <button className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-10 py-4 rounded-full font-semibold hover:shadow-lg hover:shadow-blue-500/30 hover:-translate-y-1 transition-all duration-300 flex items-center gap-3 mx-auto text-lg">
          <Upload size={22} />
          Select PDF File
        </button>

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