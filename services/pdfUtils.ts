import { PDFDocument } from 'pdf-lib';
import { pdfjs } from 'react-pdf';

// Ensure worker is set for text extraction if not already handled globally
if (!pdfjs.GlobalWorkerOptions.workerSrc) {
  pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
}

/**
 * Slices a PDF based on selected page numbers.
 * @param pdfFile The original PDF file object
 * @param selectedPages Set of page numbers (1-based) to include
 * @returns Blob of the new PDF
 */
export const slicePDF = async (pdfFile: File, selectedPages: Set<number>): Promise<Blob> => {
  const arrayBuffer = await pdfFile.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  const newPdfDoc = await PDFDocument.create();

  // Convert Set to sorted array
  const pagesToKeep = Array.from(selectedPages).sort((a, b) => a - b);

  // Copy pages. Note: pdf-lib uses 0-based index, our UI uses 1-based.
  const copiedPages = await newPdfDoc.copyPages(
    pdfDoc, 
    pagesToKeep.map(p => p - 1)
  );

  copiedPages.forEach((page) => {
    newPdfDoc.addPage(page);
  });

  const pdfBytes = await newPdfDoc.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
};

/**
 * Extracts text from specific pages of a PDF file.
 * @param pdfFile The original PDF file
 * @param pageNumbers Array of page numbers (1-based)
 */
export const extractTextFromPages = async (pdfFile: File, pageNumbers: number[]): Promise<string> => {
  const arrayBuffer = await pdfFile.arrayBuffer();
  const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  
  let fullText = "";
  const sortedPages = [...pageNumbers].sort((a, b) => a - b);
  
  for (const pageNum of sortedPages) {
      if (pageNum > pdf.numPages || pageNum < 1) continue;
      
      try {
          const page = await pdf.getPage(pageNum);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .map((item: any) => item.str)
            .join(' ');
            
          fullText += `--- Page ${pageNum} ---\n${pageText}\n\n`;
      } catch (e) {
          console.warn(`Error extracting text from page ${pageNum}`, e);
          fullText += `--- Page ${pageNum} ---\n(Could not extract text)\n\n`;
      }
  }
  
  return fullText;
};

/**
 * Renders specific PDF pages as base64 JPEG images.
 * @param pdfFile The original PDF file
 * @param pageNumbers Array of page numbers (1-based)
 * @param scale Scale factor for image quality (default 1.5)
 * @returns Array of base64 strings (without data prefix)
 */
export const extractImagesFromPages = async (pdfFile: File, pageNumbers: number[], scale = 1.5): Promise<string[]> => {
  const arrayBuffer = await pdfFile.arrayBuffer();
  const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  
  const images: string[] = [];
  const sortedPages = [...pageNumbers].sort((a, b) => a - b);

  // Limit to avoid browser memory issues if selecting huge ranges, 
  // though Gemini Flash has a large context window, browser rendering is the bottleneck.
  // Let's process them sequentially.
  
  for (const pageNum of sortedPages) {
    if (pageNum > pdf.numPages || pageNum < 1) continue;

    try {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale });
      
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      if (context) {
        await page.render({ canvasContext: context, viewport }).promise;
        // Quality 0.8 for JPEG
        const base64Url = canvas.toDataURL('image/jpeg', 0.8);
        // Remove the data:image/jpeg;base64, prefix
        const base64Data = base64Url.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');
        images.push(base64Data);
      }
    } catch (e) {
      console.warn(`Error rendering page ${pageNum} to image`, e);
    }
  }

  return images;
};

/**
 * Downloads a Blob as a file.
 */
export const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};