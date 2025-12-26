import { useState, useCallback } from 'react';

// PDF to slides conversion utility
// This must be loaded client-side only due to pdfjs-dist browser requirements

export async function convertPDFToSlides(file, onProgress) {
    if (typeof window === 'undefined') {
        throw new Error('PDF processing can only run in browser');
    }

    const pdfjsLib = await import('pdfjs-dist/build/pdf.mjs');
    
    // Set worker source
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
    
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    const slides = [];
    
    for (let i = 1; i <= pdf.numPages; i++) {
        if (onProgress) {
            onProgress(`Processing slide ${i} of ${pdf.numPages}...`);
        }
        
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        await page.render({ canvasContext: context, viewport: viewport }).promise;
        
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.8));
        slides.push({
            blob,
            name: `slide-${i}.jpg`
        });
    }
    
    return slides;
}

// Hook for PDF processing
export function usePDFProcessor() {
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState('');
    const [error, setError] = useState(null);

    const processPDF = useCallback(async (file) => {
        setIsProcessing(true);
        setError(null);
        setProgress('Loading PDF...');
        
        try {
            const slides = await convertPDFToSlides(file, setProgress);
            setProgress('');
            setIsProcessing(false);
            return slides;
        } catch (err) {
            console.error('PDF Processing Error:', err);
            setError(err.message || 'Failed to process PDF');
            setIsProcessing(false);
            return null;
        }
    }, []);

    return { processPDF, isProcessing, progress, error };
}

export default usePDFProcessor;
