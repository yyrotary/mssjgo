"use client";

import { useState, useRef, useEffect } from "react";
import * as pdfjsLib from "pdfjs-dist";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { Upload, FileImage, Loader2, Download, CheckCircle, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function PdfSplitterClient() {
    const [file, setFile] = useState<File | null>(null);
    const [status, setStatus] = useState<"IDLE" | "PROCESSING" | "SUCCESS" | "ERROR">("IDLE");
    const [progress, setProgress] = useState(0);
    const [totalFrames, setTotalFrames] = useState(0);
    const [errorMsg, setErrorMsg] = useState("");
    const [removeWatermark, setRemoveWatermark] = useState(false);

    // Use latest unpkg CDN matching the installed version to avoid Webpack worker config issues in Next.js
    useEffect(() => {
        pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
    }, []);

    const processFile = async (selectedFile: File) => {
        if (!selectedFile || selectedFile.type !== "application/pdf") {
            setErrorMsg("Please upload a valid PDF file.");
            setStatus("ERROR");
            return;
        }

        setFile(selectedFile);
        setStatus("PROCESSING");
        setProgress(0);
        setErrorMsg("");

        try {
            const arrayBuffer = await selectedFile.arrayBuffer();
            const pdfDocument = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

            setTotalFrames(pdfDocument.numPages);

            const zip = new JSZip();
            const folder = zip.folder("slides");

            for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
                const page = await pdfDocument.getPage(pageNum);

                // Increase scale for better quality JPGs
                const scale = 2;
                const viewport = page.getViewport({ scale });

                const canvas = document.createElement("canvas");
                const context = canvas.getContext("2d");

                if (!context) throw new Error("Could not create canvas context");

                canvas.height = viewport.height;
                canvas.width = viewport.width;

                await page.render({
                    canvasContext: context,
                    viewport: viewport,
                    // @ts-ignore - newer pdfjs-dist versions require different TS interfaces
                    canvasFactory: undefined,
                }).promise;

                if (removeWatermark) {
                    // NotebookLM watermark is usually at the bottom-right corner.
                    // We sample the background color from the bottom-left corner and paint over the right corner.
                    const sampleX = 10;
                    const sampleY = canvas.height - 10;
                    const pixelData = context.getImageData(sampleX, sampleY, 1, 1).data;
                    const bgColor = `rgba(${pixelData[0]}, ${pixelData[1]}, ${pixelData[2]}, ${pixelData[3] / 255})`;

                    context.fillStyle = bgColor;

                    // Approximate dimensions of the watermark (scaled up based on viewport scale)
                    const wmWidth = 350 * scale;
                    const wmHeight = 100 * scale;

                    context.fillRect(
                        canvas.width - wmWidth,
                        canvas.height - wmHeight,
                        wmWidth,
                        wmHeight
                    );
                }

                // Extract JPEG
                const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));

                if (blob && folder) {
                    const padNum = pageNum.toString().padStart(3, '0');
                    folder.file(`slide_${padNum}.jpg`, blob);
                }

                setProgress(pageNum);
            }

            // Generate ZIP
            const zipBlob = await zip.generateAsync({ type: "blob" });
            const baseFileName = selectedFile.name.replace(".pdf", "");
            saveAs(zipBlob, `${baseFileName}_slides.zip`);

            setStatus("SUCCESS");
        } catch (err: any) {
            console.error("PDF Processing Error: ", err);
            setErrorMsg(err.message || "An error occurred while processing the PDF.");
            setStatus("ERROR");
        }
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile) await processFile(droppedFile);
    };

    return (
        <main className="min-h-[calc(100vh-4rem)] p-6 md:p-12 lg:p-20 bg-gradient-to-b from-[#09090b] to-[#000000] flex flex-col items-center justify-center">
            <div className="max-w-3xl w-full flex flex-col items-center space-y-8">
                <header className="text-center space-y-4">
                    <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(255,255,255,0.05)] border border-white/10">
                        <FileImage className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-neutral-200 to-neutral-500 pb-2">
                        PDF to JPG Converter
                    </h1>
                    <p className="text-neutral-400 max-w-xl mx-auto text-base">
                        Upload a PDF generated by NotebookLM (or any PDF). We will instantly slice it into individual high-quality JPG images and pack them into a ZIP file for you to download. Everything happens locally in your browser!
                    </p>
                </header>

                <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-6 py-3 rounded-2xl w-full max-w-xl">
                    <input
                        type="checkbox"
                        id="remove-watermark"
                        checked={removeWatermark}
                        onChange={(e) => setRemoveWatermark(e.target.checked)}
                        className="w-5 h-5 rounded bg-black border-white/20 text-blue-500 focus:ring-blue-500/50 cursor-pointer"
                    />
                    <label htmlFor="remove-watermark" className="text-sm font-medium text-neutral-300 cursor-pointer select-none">
                        Remove NotebookLM Watermark (Auto-fill bottom right corner)
                    </label>
                </div>

                <div
                    className={`w-full max-w-xl p-10 border-2 border-dashed rounded-3xl transition-all duration-300 flex flex-col items-center justify-center min-h-[300px] text-center
                        ${status === 'PROCESSING' ? 'border-blue-500/50 bg-blue-500/5' :
                            status === 'SUCCESS' ? 'border-green-500/50 bg-green-500/5' :
                                status === 'ERROR' ? 'border-red-500/50 bg-red-500/5' :
                                    'border-white/20 bg-white/5 hover:border-white/40 hover:bg-white/10 cursor-pointer'}`}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    onClick={() => {
                        if (status !== 'PROCESSING') {
                            document.getElementById('pdf-upload')?.click();
                        }
                    }}
                >
                    <input
                        type="file"
                        id="pdf-upload"
                        accept="application/pdf"
                        className="hidden"
                        onChange={(e) => {
                            const selected = e.target.files?.[0];
                            if (selected) processFile(selected);
                            // reset input so the same file can be selected again
                            e.target.value = '';
                        }}
                    />

                    <AnimatePresence mode="wait">
                        {status === "IDLE" && (
                            <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center">
                                <Upload className="w-12 h-12 text-neutral-400 mb-4" />
                                <h3 className="text-xl font-semibold text-white mb-2">Drag & Drop your PDF here</h3>
                                <p className="text-sm text-neutral-500">or click to browse your files</p>
                            </motion.div>
                        )}

                        {status === "PROCESSING" && (
                            <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center w-full max-w-sm">
                                <Loader2 className="w-12 h-12 text-blue-400 mb-4 animate-spin" />
                                <h3 className="text-xl font-semibold text-white mb-2">Processing "{file?.name}"</h3>
                                <p className="text-sm text-neutral-400 mb-6">Converting page {progress} of {totalFrames}...</p>

                                <div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-blue-500 transition-all duration-300"
                                        style={{ width: `${totalFrames > 0 ? (progress / totalFrames) * 100 : 0}%` }}
                                    />
                                </div>
                            </motion.div>
                        )}

                        {status === "SUCCESS" && (
                            <motion.div key="success" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center">
                                <CheckCircle className="w-12 h-12 text-green-400 mb-4" />
                                <h3 className="text-xl font-semibold text-white mb-2">Success!</h3>
                                <p className="text-sm text-neutral-400 mb-6">Your ZIP file has been initiated for download.</p>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setStatus("IDLE"); setFile(null); }}
                                    className="px-6 py-2.5 bg-white text-black font-semibold rounded-full hover:bg-neutral-200 transition-colors shadow-lg flex items-center gap-2"
                                >
                                    <Upload className="w-4 h-4" /> Convert Another PDF
                                </button>
                            </motion.div>
                        )}

                        {status === "ERROR" && (
                            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center">
                                <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                                <h3 className="text-xl font-semibold text-red-400 mb-2">Conversion Failed</h3>
                                <p className="text-sm text-neutral-400 mb-6 max-w-sm">{errorMsg}</p>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setStatus("IDLE"); setFile(null); }}
                                    className="px-6 py-2.5 bg-white/10 text-white font-semibold rounded-full hover:bg-white/20 transition-colors"
                                >
                                    Try Again
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </main>
    );
}
