"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, Loader2, Music } from "lucide-react";
import { useState, useTransition } from "react";
import { updatePrompt } from "@/app/actions/promptActions";

export default function AdminEditModal({ 
    prompt, 
    isOpen, 
    onClose,
    onSuccess
}: { 
    prompt: any, 
    isOpen: boolean, 
    onClose: () => void,
    onSuccess: (updatedPrompt: any) => void
}) {
    const [isPending, startTransition] = useTransition();
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [audioFileName, setAudioFileName] = useState<string | null>(null);
    const [removeImage, setRemoveImage] = useState(false);
    const [removeAudio, setRemoveAudio] = useState(false);

    if (!isOpen || !prompt) return null;

    const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        if (removeImage) formData.append("removeImage", "true");
        if (removeAudio) formData.append("removeAudio", "true");

        startTransition(async () => {
            const res = await updatePrompt(prompt.id, prompt.original_id, formData);
            if (res.error) alert(res.error);
            else {
                // Synthesize the updated object for optimistic UI
                const updated = { ...prompt };
                updated.name = formData.get("name") as string;
                updated.type = formData.get("type") as string;
                updated.prompt_text = formData.get("prompt_text") as string;
                // If a new image was uploaded we won't have the URL perfectly simulated, 
                // but we can pass the preview url for snappiness
                if (removeImage) updated.image_url = null;
                else if (imagePreview) updated.image_url = imagePreview;
                
                if (removeAudio) {
                    if (!updated.metadata) updated.metadata = {};
                    updated.metadata.audio_url = null;
                }

                onSuccess(updated);
                onClose();
            }
        });
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImagePreview(URL.createObjectURL(file));
            setRemoveImage(false);
        }
    };

    const handleAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setAudioFileName(file.name);
            setRemoveAudio(false);
        }
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-[#0a0a0a] border border-white/10 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden relative flex flex-col max-h-[90vh]"
                >
                    <div className="p-4 border-b border-white/10 flex justify-between items-center bg-neutral-900/50">
                        <h2 className="text-xl font-bold text-white">프롬프트 수정 (관리자)</h2>
                        <button onClick={onClose} className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors">
                            <X className="w-5 h-5 text-neutral-400" />
                        </button>
                    </div>

                    <form id="admin-edit-form" onSubmit={handleUpdate} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-neutral-400 mb-1">제목 (Name)</label>
                                <input required name="name" defaultValue={prompt.name} className="w-full bg-black border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-white/30" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-neutral-400 mb-1">분류/스타일 (Type)</label>
                                <input required name="type" defaultValue={prompt.type} className="w-full bg-black border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-white/30" />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Image Edit */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-neutral-400">대표 이미지</label>
                                <div className="border border-white/10 rounded-lg p-4 bg-black/50 relative min-h-[150px] flex items-center justify-center">
                                    {imagePreview || (!removeImage && prompt.image_url) ? (
                                        <>
                                            <img
                                                src={imagePreview || prompt.image_url}
                                                alt="Preview"
                                                className="absolute inset-0 w-full h-full object-contain p-2 opacity-60"
                                            />
                                            <label className="z-10 cursor-pointer flex flex-col items-center gap-2 px-4 py-2 bg-black/60 backdrop-blur-md rounded-lg hover:bg-black/80 transition-colors border border-white/10">
                                                <Upload className="w-5 h-5 text-white" />
                                                <span className="text-sm font-bold text-white tracking-wide">이미지 변경</span>
                                                <input type="file" name="image" accept="image/*" className="hidden" onChange={handleImageChange} />
                                            </label>
                                        </>
                                    ) : (
                                        <label className="cursor-pointer flex flex-col items-center text-neutral-500 hover:text-white transition-colors">
                                            <Upload className="w-8 h-8 mb-2" />
                                            <span className="text-sm">새 이미지 업로드</span>
                                            <input type="file" name="image" accept="image/*" className="hidden" onChange={handleImageChange} />
                                        </label>
                                    )}
                                    {(imagePreview || prompt.image_url) && !removeImage && (
                                        <button
                                            type="button"
                                            onClick={(e) => { e.preventDefault(); setRemoveImage(true); setImagePreview(null); }}
                                            className="absolute top-2 left-2 bg-red-500/80 text-white text-xs px-2 py-1 rounded-md z-20 hover:bg-red-500 shadow-md"
                                        >
                                            삭제
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Audio Edit */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-neutral-400">오디오 / 음악 파일</label>
                                <div className="border border-white/10 rounded-lg p-4 bg-black/50 relative min-h-[150px] flex flex-col items-center justify-center text-center">
                                    {(audioFileName || (!removeAudio && prompt.metadata?.audio_url)) ? (
                                        <>
                                            <Music className="w-10 h-10 text-neutral-400 mb-2" />
                                            <span className="text-xs text-neutral-300 break-all px-2 max-w-[200px] mb-4">
                                                {audioFileName || "기존 오디오 유지됨"}
                                            </span>
                                            <label className="cursor-pointer px-4 py-2 bg-black/60 backdrop-blur-md rounded-lg hover:bg-black/80 transition-colors border border-white/10">
                                                <span className="text-sm font-bold text-white tracking-wide">오디오 변경</span>
                                                <input type="file" name="audio" accept="audio/*" className="hidden" onChange={handleAudioChange} />
                                            </label>
                                            <button
                                                type="button"
                                                onClick={(e) => { e.preventDefault(); setRemoveAudio(true); setAudioFileName(null); }}
                                                className="absolute top-2 left-2 bg-red-500/80 text-white text-xs px-2 py-1 rounded-md z-20 hover:bg-red-500 shadow-md"
                                            >
                                                삭제
                                            </button>
                                        </>
                                    ) : (
                                        <label className="cursor-pointer flex flex-col items-center text-neutral-500 hover:text-white transition-colors">
                                            <Upload className="w-8 h-8 mb-2" />
                                            <span className="text-sm">새 오디오 업로드</span>
                                            <input type="file" name="audio" accept="audio/*" className="hidden" onChange={handleAudioChange} />
                                        </label>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-neutral-400 mb-1">프롬프트 내용 (Text)</label>
                            <textarea required name="prompt_text" defaultValue={prompt.prompt_text} rows={8} className="w-full bg-black border border-white/10 rounded-lg p-4 text-white font-mono text-sm leading-relaxed focus:outline-none focus:border-white/30 resize-none custom-scrollbar" />
                        </div>
                    </form>

                    <div className="p-4 border-t border-white/10 bg-neutral-900/50 flex gap-3 flex-shrink-0">
                        <button type="button" onClick={onClose} disabled={isPending} className="px-6 py-2.5 font-bold text-neutral-400 bg-white/5 hover:bg-white/10 hover:text-white rounded-xl transition-colors">
                            취소
                        </button>
                        <button type="submit" form="admin-edit-form" disabled={isPending} className="flex-1 bg-blue-600 text-white font-bold py-2.5 rounded-xl hover:bg-blue-500 transition-colors flex justify-center items-center gap-2 shadow-[0_0_20px_rgba(37,99,235,0.3)]">
                            {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "수정 내용 저장"}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
