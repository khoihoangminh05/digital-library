'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Loader2, AlertCircle } from 'lucide-react';

// Configure the pdf.js worker globally using unpkg CDN matching the current installed pdf.js version
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// Import standard react-pdf css structures to enable text selection overlays aligning correctly
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';

interface PDFViewerProps {
  url: string;
  currentPage: number;
  onLoadSuccess?: (numPages: number) => void;
}

export default function PDFViewer({ url, currentPage, onLoadSuccess }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(800);
  const containerRef = useRef<HTMLDivElement>(null);

  // ResizeObserver to calculate and set the exact width to fit container
  useEffect(() => {
    if (!containerRef.current) return;

    // Calculate initial width
    const initialWidth = containerRef.current.clientWidth;
    // Set width leaving some padding space
    setContainerWidth(Math.max(initialWidth - 48, 300));

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        // Adjust page width on resize, keeping room for margins
        setContainerWidth(Math.max(entry.contentRect.width - 48, 300));
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  function handleDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    if (onLoadSuccess) {
      onLoadSuccess(numPages);
    }
  }

  function handleDocumentLoadError(err: Error) {
    console.error('Failed to load PDF document:', err);
    setError(err.message);
  }

  return (
    <div
      ref={containerRef}
      className="flex flex-col items-center justify-start w-full h-full overflow-y-auto bg-neutral-900 p-6 scrollbar-thin scrollbar-thumb-neutral-800"
    >
      {error ? (
        <div className="flex flex-col items-center justify-center space-y-4 p-8 bg-neutral-950/60 border border-neutral-800 rounded-2xl max-w-md text-center mt-12">
          <AlertCircle className="w-12 h-12 text-rose-500/80 animate-pulse" />
          <h4 className="text-sm font-bold text-white">Renderer Execution Failure</h4>
          <p className="text-xs text-neutral-400 leading-relaxed">
            {error}. The PDF streaming URL might have failed, or CORS could be blocking the request.
          </p>
        </div>
      ) : (
        <div className="shadow-2xl border border-neutral-800 rounded-xl bg-white max-w-full overflow-x-auto">
          <Document
            file={url}
            onLoadSuccess={handleDocumentLoadSuccess}
            onLoadError={handleDocumentLoadError}
            loading={
              <div className="flex flex-col items-center justify-center p-20 space-y-4 bg-neutral-950 text-white min-h-[400px]">
                <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
                <span className="text-xs text-neutral-500 uppercase tracking-widest font-semibold animate-pulse">
                  Decoding PDF Pages and layout...
                </span>
              </div>
            }
          >
            <Page
              pageNumber={currentPage}
              width={Math.min(containerWidth, 900)}
              renderTextLayer={true}
              renderAnnotationLayer={true}
              loading={
                <div className="flex flex-col items-center justify-center p-20 space-y-4 bg-neutral-950 text-white min-h-[400px]">
                  <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
                  <span className="text-xs text-neutral-500 uppercase tracking-widest font-semibold animate-pulse">
                    Rendering page layout...
                  </span>
                </div>
              }
              className="max-w-full"
            />
          </Document>
        </div>
      )}
    </div>
  );
}
