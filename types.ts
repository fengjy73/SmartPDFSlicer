export interface OutlineNode {
  title: string;
  pageNumber: number; // 1-based index for UI, convert to 0-based for logic
  items: OutlineNode[];
  // Calculated properties for range selection
  endPageNumber?: number; 
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  isLoading?: boolean;
}

export interface PDFMetadata {
  numPages: number;
  outline: OutlineNode[];
}
