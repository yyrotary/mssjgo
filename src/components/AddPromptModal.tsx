"use client";

import { useState } from "react";
import { addPrompt } from "@/app/actions/promptActions";
import { X, Upload, Loader2 } from "lucide-react";

export default function AddPromptModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
    const [loading, setLoading] = useState(false);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [audioFileName, setAudioFileName] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImagePreview(URL.createObjectURL(file));
        } else {
            setImagePreview(null);
        }
    };

    const handleAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setAudioFileName(file.name);
        } else {
            setAudioFileName(null);
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);

        const formData = new FormData(e.currentTarget);
        const result = await addPrompt(formData);

        setLoading(false);

        if (result.error) {
            alert(result.error);
        } else {
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-neutral-900 border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden relative">
                <div className="p-4 border-b border-white/10 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white">Add New Prompt</h2>
                    <button onClick={onClose} className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors">
                        <X className="w-5 h-5 text-neutral-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-neutral-400 mb-1">Name</label>
                        <input required name="name" type="text" className="w-full bg-black border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-white/30" placeholder="e.g. Vintage Poster Design" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-neutral-400 mb-1">Image (Optional)</label>
                            <label className="cursor-pointer flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-lg p-4 hover:border-white/30 transition-colors relative h-32 bg-black">
                                {imagePreview ? (
                                    <img src={imagePreview} className="absolute inset-0 w-full h-full object-contain p-2" />
                                ) : (
                                    <>
                                        <Upload className="w-5 h-5 text-neutral-500 mb-1" />
                                        <span className="text-xs text-neutral-500 text-center">Upload Image</span>
                                    </>
                                )}
                                <input type="file" name="image" accept="image/*" className="hidden" onChange={handleImageChange} />
                            </label>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-neutral-400 mb-1">Audio (Optional)</label>
                            <label className="cursor-pointer flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-lg p-4 hover:border-white/30 transition-colors relative h-32 bg-black text-center h-[128px]">
                                {audioFileName ? (
                                    <>
                                        <div className="text-white text-3xl mb-2">🎵</div>
                                        <span className="text-xs font-semibold text-white break-all px-2 line-clamp-2">{audioFileName}</span>
                                    </>
                                ) : (
                                    <>
                                        <Upload className="w-5 h-5 text-neutral-500 mb-1" />
                                        <span className="text-xs text-neutral-500 text-center">Upload Audio</span>
                                    </>
                                )}
                                <input type="file" name="audio" accept="audio/*" className="hidden" onChange={handleAudioChange} />
                            </label>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-neutral-400 mb-1">Type/Style</label>
                            <input required name="type" type="text" className="w-full bg-black border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-white/30" placeholder="e.g. Minimalist" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-neutral-400 mb-1">Prompt Details</label>
                        <textarea required name="prompt_text" rows={5} className="w-full bg-black border border-white/10 rounded-lg p-3 text-white font-mono text-sm focus:outline-none focus:border-white/30" placeholder="Enter prompt text here..." />
                    </div>

                    <button disabled={loading} type="submit" className="w-full bg-white text-black font-bold py-3 rounded-lg hover:bg-neutral-200 transition-colors flex justify-center items-center gap-2">
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save Prompt"}
                    </button>
                </form>
            </div>
        </div>
    );
}
