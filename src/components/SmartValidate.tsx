import React, { useState, useEffect } from 'react';
import {
    FiFile, FiChevronLeft, FiChevronRight, FiLoader,
    FiUpload, FiCheckCircle, FiDownload, FiAlertCircle, FiX
} from 'react-icons/fi';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Document, Page } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
// Update your import to use the new worker path
import { GlobalWorkerOptions } from 'pdfjs-dist'

GlobalWorkerOptions.workerSrc =
    `${import.meta.env.BASE_URL}pdfjs-dist/build/pdf.worker.min.js`;

import { logFrontendAudit } from '../hooks/auditlog';

// Configure PDF.js worker
// pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

interface FileItem {
    file: File;
    name: string;
    size: string;
    status: 'ready' | 'processing' | 'done' | 'error';
    error?: string;
    url: string;
}

interface Product {
    id: string;
    name: string;
    specifications: (string | { key: string; value: string })[];
    manufacturers: string[];
    reference?: string;
}

interface SmartValidateProps {
    defaultFile: File;
    product?: Product | null;
    productSpecs?: Array<string | { key: string, value: string }>;
}




const SmartValidate: React.FC<SmartValidateProps> = ({ defaultFile, product }) => {
    const [files, setFiles] = useState<FileItem[]>([]);
    const [processing, setProcessing] = useState(false);
    const [previewIndex, setPreviewIndex] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [referenceFile] = useState<File>(defaultFile);
    const [globalError, setGlobalError] = useState<string | null>(null);
    const [numPages, setNumPages] = useState<number | null>(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [showProductModal, setShowProductModal] = useState(false);
    const [fileLimitError, setFileLimitError] = useState<string | null>(null);
    const API_URL = import.meta.env.VITE_API_BASE_URL;

    function getAuthToken() {
        try {
            const stored = localStorage.getItem('submittalFactory_auth');
            if (stored) {
                const parsed = JSON.parse(stored);
                return parsed.token || null;
            }
        } catch { }
        return null;
    }






    // Helper function to create FileItem from File
    const createFileItem = (file: File): FileItem => ({
        file,
        name: file.name,
        size: `${(file.size / 1024).toFixed(2)} KB`,
        status: 'ready',
        url: URL.createObjectURL(file),
    });

    const checkProductSelected = () => {
        if (!product) {
            setShowProductModal(true);
            return false;
        }
        return true;
    };

    // Handle file selection
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setGlobalError(null);
        setFileLimitError(null);

        // First check if product is selected
        if (!checkProductSelected()) return;

        const fileList = e.target.files;
        if (!fileList) return;

        // Check if adding these files would exceed the limit
        const currentCount = files.length;
        const newCount = fileList.length;
        const totalCount = currentCount + newCount;

        if (totalCount > 5) {
            setFileLimitError(`You can upload a maximum of 5 files. You currently have ${currentCount} files and tried to add ${newCount} more.`);
            return;
        }

        const newFiles = Array.from(fileList)
            .filter(file => file.type === 'application/pdf')
            .map(createFileItem);

        if (newFiles.length === 0) {
            setGlobalError('Please upload PDF files only');
            return;
        }

        setFiles(prev => [...prev, ...newFiles].slice(0, 5));
        setPreviewIndex(0);
    };

    // Drag & drop handlers
    const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => setIsDragging(false);

    const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        setIsDragging(false);
        setGlobalError(null);
        setFileLimitError(null);

        // First check if product is selected
        if (!checkProductSelected()) return;

        const dt = e.dataTransfer;
        if (dt.files.length) {
            // Check if adding these files would exceed the limit
            const currentCount = files.length;
            const newCount = dt.files.length;
            const totalCount = currentCount + newCount;

            if (totalCount > 5) {
                setFileLimitError(`You can upload a maximum of 5 files. You currently have ${currentCount} files.`);
                return;
            }

            handleFileChange({ target: { files: dt.files } } as any);
        }
    };

    // File processing
    const processAllFiles = async () => {
        setGlobalError(null);
        setProcessing(true);

        try {
            for (let i = 0; i < files.length; i++) {
                try {
                    // Update status to processing
                    setFiles(prev => prev.map((f, idx) =>
                        idx === i ? { ...f, status: 'processing', error: undefined } : f
                    ));

                    // Step 1: Validate specs
                    const validationResult = await validateSpecs(files[i].file);

                    // Step 2: Generate validation report
                    const validatedPdf = await generateValidationReport(
                        files[i].file,
                        validationResult,
                        referenceFile
                    );

                    // Update with validated file
                    setFiles(prev => prev.map((f, idx) => {
                        if (idx === i) {
                            // Revoke the old object URL before replacing
                            if (f.url) URL.revokeObjectURL(f.url);
                            return {
                                ...f,
                                file: validatedPdf,
                                url: URL.createObjectURL(validatedPdf),
                                status: 'done',
                                error: undefined
                            };
                        }
                        return f;
                    }));

                } catch (error) {
                    console.error(`Error processing ${files[i].name}:`, error);
                    setFiles(prev => prev.map((f, idx) =>
                        idx === i ? {
                            ...f,
                            status: 'error',
                            error: error instanceof Error ? error.message : 'Validation failed'
                        } : f
                    ));
                }
            }
        } catch (error) {
            console.error('Unexpected error:', error);
            setGlobalError('An unexpected error occurred during processing');
        } finally {
            setProcessing(false);
        }
    };

    // API: Validate specs
    const validateSpecs = async (pdfFile: File): Promise<any> => {
        if (!product) {
            throw new Error('No product data available for validation');
        }

        const token = getAuthToken(); // Get the token

        const formData = new FormData();
        formData.append('pdf_file', pdfFile);
        formData.append('product_data_json', JSON.stringify({
            id: product.id,
            name: product.name,
            specifications: product.specifications,
            manufacturers: product.manufacturers,
            reference: product.reference
        }));
        console.log("body",formData)

        const response = await fetch(`${API_URL}/api/smart-validate-specs`, {
            method: 'POST',
            body: formData,
            headers: token ? { 'Authorization': `Bearer ${token}` } : undefined,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Validation failed');
        }

        return await response.json();
    };


    // API: Generate validation report
    const generateValidationReport = async (
        originalPdf: File,
        validationData: any,
        referencePdf?: File
    ): Promise<File> => {
        try {
            const token = getAuthToken();

            // Convert files to base64
            const [originalBase64, referenceBase64] = await Promise.all([
                fileToBase64(originalPdf),
                referencePdf ? fileToBase64(referencePdf) : Promise.resolve(null)
            ]);

            const payload = {
                validation_data: validationData,
                product_name: validationData.product_name || product?.name || "Product",
                original_pdf_bytes: originalBase64,
            };

            const response = await fetch(`${API_URL}/api/generate-smart-validation-report`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Report generation failed');
            }

            const pdfBytes = await response.arrayBuffer();
            return new File(
                [pdfBytes],
                `validated_${originalPdf.name}`,
                { type: 'application/pdf' }
            );
        } catch (error) {
            console.error('Report generation error:', error);
            throw new Error('Failed to generate validation report');
        }
    };


    // File download handlers
    const handleDownloadFile = (file: FileItem) => {
        try {
            saveAs(file.file, file.name);

            // --- AUDIT LOG ---
            logFrontendAudit({
                action: "SmartValidateSingleDownload",
                entityType: "PDF",
                entityId: file.name,
                metadata: {
                    fileName: file.name,
                    fileSize: file.size,
                    status: file.status
                }
            });
        } catch (error) {
            console.error('Download failed:', error);
            setGlobalError('Failed to download file');
        }
    };


    const handleDownloadZip = async () => {
        try {
            const zip = new JSZip();
            const validatedFiles = files.filter(f => f.status === 'done');

            if (validatedFiles.length === 0) {
                throw new Error('No validated files to download');
            }

            for (const file of validatedFiles) {
                zip.file(file.name, file.file);
            }

            const content = await zip.generateAsync({ type: 'blob' });
            saveAs(content, 'validated_files.zip');

            // --- AUDIT LOG ---
            const totalSize = validatedFiles.reduce((sum, f) => {
                // File.size is a string like "123.45 KB"
                const num = Number(f.size.split(' ')[0]);
                return sum + (isNaN(num) ? 0 : num);
            }, 0);

            logFrontendAudit({
                action: "SmartValidateZipDownload",
                entityType: "PDFBatch",
                entityId: null,
                metadata: {
                    count: validatedFiles.length,
                    fileNames: validatedFiles.map(f => f.name),
                    totalSizeKB: totalSize,
                }
            });
        } catch (error) {
            console.error('ZIP creation failed:', error);
            setGlobalError('Failed to create ZIP archive');
        }
    };


    // PDF document load success handler
    const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
        setNumPages(numPages);
        setPageNumber(1); // Reset to first page when new document loads
    };

    // Clean up object URLs ONLY on unmount (not on every file change!)
    useEffect(() => {
        return () => {
            files.forEach(file => file.url && URL.revokeObjectURL(file.url));
        };
    }, []);

    // Status counters
    const doneCount = files.filter(f => f.status === 'done').length;
    const errorCount = files.filter(f => f.status === 'error').length;
    const allDone = files.length > 0 && doneCount + errorCount === files.length;

    const handleRemoveFile = (index: number) => {
        setFiles(prev => {
            const newFiles = [...prev];
            // Revoke the object URL before removing
            if (newFiles[index].url) {
                URL.revokeObjectURL(newFiles[index].url);
            }
            newFiles.splice(index, 1);
            return newFiles;
        });
        // Adjust preview index if needed
        if (previewIndex >= files.length - 1) {
            setPreviewIndex(Math.max(0, files.length - 2));
        }
    };

    // Add this function to handle removing all files
    const handleRemoveAllFiles = () => {
        // Revoke all object URLs
        files.forEach(file => {
            if (file.url) URL.revokeObjectURL(file.url);
        });
        setFiles([]);
        setPreviewIndex(0);
    };

    return (
        <div className="bg-white rounded-xl shadow-xl w-full max-w-[90rem] mx-auto overflow-hidden border border-gray-100 my-8">
            {/* Product Selection Modal */}
            {showProductModal && (
                <div className="fixed inset-0 backdrop-blur-sm bg-white/30 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 border border-gray-200">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-gray-800">Product Required</h3>
                            <button
                                onClick={() => setShowProductModal(false)}
                                className="text-gray-400 hover:text-gray-500"
                            >
                                <FiX className="w-5 h-5" />
                            </button>
                        </div>
                        <p className="text-gray-600 mb-6">
                            Please select a product first before uploading files. The validation process requires product specifications to compare against.
                        </p>
                        <div className="flex justify-end">
                            <button
                                onClick={() => setShowProductModal(false)}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
                            >
                                OK
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-700">
                <h3 className="text-xl font-semibold text-white">Validation Tool</h3>
                {globalError && (
                    <div className="flex items-center bg-red-100 text-red-700 px-3 py-1 rounded text-sm">
                        <FiAlertCircle className="mr-2" />
                        {globalError}
                    </div>
                )}
            </div>

            <div className="flex flex-col md:flex-row h-[750px]">
                {/* Left panel - file list */}
                <div className="w-full md:w-1/2 p-5 flex flex-col border-r border-gray-100">
                    {files.length > 0 && (
                        <div className="flex justify-between items-center mb-2">
                            <div className="text-sm font-medium text-gray-700">
                                {files.length} file{files.length !== 1 ? 's' : ''} selected
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleRemoveAllFiles}
                                    className="flex items-center gap-2 px-3 py-1 rounded bg-red-600 text-white text-xs font-medium hover:bg-red-700 transition"
                                >
                                    <FiX />
                                    Remove All
                                </button>
                                <button
                                    onClick={handleDownloadZip}
                                    disabled={!allDone}
                                    className="flex items-center gap-2 px-3 py-1 rounded bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition disabled:opacity-50"
                                >
                                    <FiDownload />
                                    Download All as ZIP
                                </button>
                            </div>
                        </div>
                    )}
                    {fileLimitError && (
                        <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-md border border-red-100">
                            <FiAlertCircle className="inline mr-2" />
                            {fileLimitError}
                        </div>
                    )}

                    <label
                        htmlFor="smart-validate-files"
                        className={`flex flex-col items-center justify-center rounded-lg p-6 h-32 cursor-pointer transition-all duration-200 ${isDragging
                            ? 'border-2 border-blue-500 bg-blue-50'
                            : 'border-2 border-dashed border-gray-300 hover:border-blue-400'
                            }`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                    >
                        <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-3">
                            <FiUpload className="w-5 h-5 text-blue-600" />
                        </div>
                        <p className="text-sm text-gray-600 font-medium">
                            {isDragging ? 'Drop files here' : 'Drag & drop files or click to browse'}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">PDF files only (max 5)</p>
                    </label>
                    <input
                        id="smart-validate-files"
                        type="file"
                        multiple
                        accept="application/pdf"
                        onChange={handleFileChange}
                        className="hidden"
                    />

                    {files.length > 0 ? (
                        <div className="mt-2 flex-1 overflow-y-auto">
                            <ul className="space-y-2">
                                {files.map((file, index) => (
                                    <li
                                        key={index}
                                        className={`flex items-center justify-between p-3 rounded-lg transition-all cursor-pointer ${previewIndex === index
                                            ? 'bg-blue-50 border border-blue-200'
                                            : 'bg-gray-50 hover:bg-gray-100'
                                            }`}
                                        onClick={() => setPreviewIndex(index)}
                                    >
                                        <div className="flex items-center min-w-0">
                                            <div className="flex items-center justify-center w-8 h-8 bg-white rounded mr-3">
                                                <FiFile className="w-4 h-4 text-gray-500" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-gray-800 truncate">
                                                    {file.name}
                                                </p>
                                                <p className="text-xs text-gray-500">{file.size}</p>
                                                {file.error && (
                                                    <p className="text-xs text-red-500 truncate">{file.error}</p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span
                                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${file.status === 'done'
                                                    ? 'bg-green-100 text-green-800'
                                                    : file.status === 'processing'
                                                        ? 'bg-blue-100 text-blue-800 animate-pulse'
                                                        : file.status === 'error'
                                                            ? 'bg-red-100 text-red-800'
                                                            : 'bg-gray-100 text-gray-800'
                                                    }`}
                                            >
                                                {file.status === 'done' && <FiCheckCircle className="mr-1 w-3 h-3" />}
                                                {file.status === 'error' && <FiAlertCircle className="mr-1 w-3 h-3" />}
                                                {file.status.charAt(0).toUpperCase() + file.status.slice(1)}
                                            </span>
                                            <button
                                                type="button"
                                                className="ml-2 px-2 py-1 rounded bg-red-600 hover:bg-red-700 text-white text-xs flex items-center gap-1 transition"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleRemoveFile(index);
                                                }}
                                                title="Remove file"
                                            >
                                                <FiX />
                                            </button>
                                            <button
                                                type="button"
                                                className="ml-2 px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs flex items-center gap-1 transition disabled:opacity-60"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDownloadFile(file);
                                                }}
                                                disabled={file.status !== 'done'}
                                                title={file.status === 'done' ? "Download PDF" : "Validate file to enable download"}
                                            >
                                                <FiDownload />
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ) : (
                        <div className="mt-4 flex-1 flex flex-col items-center justify-center text-gray-400">
                            <FiFile className="w-10 h-10 mb-2 opacity-50" />
                            <p className="text-sm">No files uploaded yet</p>
                            <p className="text-xs mt-1">Your PDF files will appear here</p>
                        </div>
                    )}
                </div>

                {/* Right panel - preview */}
                <div className="w-full md:w-1/2 p-5 flex flex-col bg-gray-50">
                    {files.length > 0 ? (
                        <>
                            <div className="flex items-center justify-between mb-4">
                                <button
                                    onClick={() => previewIndex > 0 && setPreviewIndex(previewIndex - 1)}
                                    disabled={previewIndex === 0}
                                    className={`p-2 rounded-lg transition-colors ${previewIndex === 0 ? 'text-gray-300' : 'text-gray-500 hover:bg-gray-200'
                                        }`}
                                    aria-label="Previous file"
                                >
                                    <FiChevronLeft size={18} />
                                </button>
                                <div className="flex-1 mx-3 min-w-0">
                                    <p className="text-sm font-medium text-gray-800 text-center truncate">
                                        {files[previewIndex].name}
                                    </p>
                                    <p className="text-xs text-gray-500 text-center">
                                        {previewIndex + 1} of {files.length}
                                    </p>
                                </div>
                                <button
                                    onClick={() =>
                                        previewIndex < files.length - 1 && setPreviewIndex(previewIndex + 1)
                                    }
                                    disabled={previewIndex === files.length - 1}
                                    className={`p-2 rounded-lg transition-colors ${previewIndex === files.length - 1
                                        ? 'text-gray-300'
                                        : 'text-gray-500 hover:bg-gray-200'
                                        }`}
                                    aria-label="Next file"
                                >
                                    <FiChevronRight size={18} />
                                </button>
                            </div>
                            <div className="flex-1 border border-gray-200 rounded-lg bg-white overflow-hidden shadow-sm flex flex-col">
                                <div className="flex-1 overflow-auto">
                                    <Document
                                        file={files[previewIndex].url}
                                        onLoadSuccess={onDocumentLoadSuccess}
                                        loading={
                                            <div className="flex items-center justify-center h-full">
                                                <FiLoader className="animate-spin text-gray-400" />
                                            </div>
                                        }
                                        error={
                                            <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                                                <FiFile className="w-10 h-10 text-gray-400 mb-3" />
                                                <p className="text-gray-500 font-medium">Failed to load PDF</p>
                                                <p className="text-sm text-gray-400 mt-1">
                                                    The PDF couldn't be loaded
                                                </p>
                                            </div>
                                        }
                                    >
                                        <Page
                                            pageNumber={pageNumber}
                                            width={450}
                                            renderTextLayer={true}
                                            renderAnnotationLayer={true}
                                        />
                                    </Document>
                                </div>
                                {numPages && numPages > 1 && (
                                    <div className="border-t border-gray-200 p-2 bg-gray-50 flex items-center justify-center">
                                        <button
                                            onClick={() => setPageNumber(prev => Math.max(prev - 1, 1))}
                                            disabled={pageNumber <= 1}
                                            className="p-1 text-gray-600 disabled:text-gray-300"
                                        >
                                            <FiChevronLeft />
                                        </button>
                                        <span className="mx-3 text-sm text-gray-600">
                                            Page {pageNumber} of {numPages}
                                        </span>
                                        <button
                                            onClick={() => setPageNumber(prev => Math.min(prev + 1, numPages))}
                                            disabled={pageNumber >= numPages}
                                            className="p-1 text-gray-600 disabled:text-gray-300"
                                        >
                                            <FiChevronRight />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-white rounded-lg border border-gray-200">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                <FiFile className="w-6 h-6 text-gray-400" />
                            </div>
                            <p className="text-sm font-medium">No preview available</p>
                            <p className="text-xs mt-1">Upload files to see previews</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer */}
            {files.length > 0 && (
                <div className="flex justify-between items-center px-6 py-4 border-t border-gray-100 bg-gray-50">
                    <div className="text-sm text-gray-500">
                        {doneCount > 0 && (
                            <span>
                                {doneCount} file{doneCount !== 1 ? 's' : ''} validated
                                {errorCount > 0 && `, ${errorCount} failed`}
                            </span>
                        )}
                    </div>
                    <button
                        onClick={processAllFiles}
                        disabled={processing || files.length === 0}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-lg transition-all ${processing ? 'bg-blue-500' : 'bg-blue-600 hover:bg-blue-700'
                            } text-white font-medium text-sm shadow-sm hover:shadow-md disabled:opacity-80`}
                    >
                        {processing ? (
                            <>
                                <FiLoader className="animate-spin" />
                                <span>Processing...</span>
                            </>
                        ) : (
                            <span>Validate All Files</span>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
};

// Utility functions
async function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]); // Remove data URL prefix
        };
        reader.onerror = error => reject(error);
    });
}

export default SmartValidate;