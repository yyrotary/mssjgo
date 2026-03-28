import { motion, AnimatePresence } from "framer-motion";
import { X, Copy, Check, Edit2, Trash2, Upload, Loader2, Lock } from "lucide-react";
import { useState, useEffect, useTransition } from "react";
import { updatePrompt, deletePrompt, ratePrompt } from "@/app/actions/promptActions";
import { Star } from "lucide-react";

export default function PromptModal({ prompt, isOpen, onClose }: { prompt: any, isOpen: boolean, onClose: () => void }) {
    const [copied, setCopied] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [isRatingPending, startRatingTransition] = useTransition();
    const [optimisticRating, setOptimisticRating] = useState<number | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [audioFileName, setAudioFileName] = useState<string | null>(null);
    const [removeImage, setRemoveImage] = useState(false);
    const [removeAudio, setRemoveAudio] = useState(false);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
            setIsEditing(false); // Reset edit state when closed
            setImagePreview(null);
            setAudioFileName(null);
            setRemoveImage(false);
            setRemoveAudio(false);
            setOptimisticRating(null);
        }
        return () => { document.body.style.overflow = "unset"; };
    }, [isOpen]);

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!prompt) return;
        navigator.clipboard.writeText(prompt.prompt_text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDelete = () => {
        if (!confirm("Are you sure you want to delete this prompt?")) return;
        startTransition(async () => {
            const res = await deletePrompt(prompt.id, prompt.original_id, prompt.image_url);
            if (res.error) alert(res.error);
            else onClose();
        });
    };

    const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        if (removeImage) formData.append("removeImage", "true");
        if (removeAudio) formData.append("removeAudio", "true");

        startTransition(async () => {
            const res = await updatePrompt(prompt.id, prompt.original_id, formData);
            if (res.error) alert(res.error);
            else {
                setIsEditing(false);
                onClose(); // Optional: or just show success and stay open looking at new data
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

    if (!isOpen || !prompt) return null;

    const isUserCreated = prompt.metadata?.source === "user";

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6" onClick={onClose}>
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                />

                <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.95 }}
                    onClick={(e) => e.stopPropagation()}
                    className="relative w-full max-w-5xl max-h-[90vh] bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl flex flex-col md:flex-row overflow-hidden"
                >
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white/70 hover:text-white hover:bg-black/80 transition-all shadow-lg"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    {/* Image Section */}
                    <div className="w-full md:w-1/2 bg-[#050505] flex items-center justify-center relative border-b md:border-b-0 md:border-r border-white/5 p-4 min-h-[40vh]">
                        {isEditing ? (
                            <label className="cursor-pointer w-full h-full flex flex-col items-center justify-center border-2 border-dashed border-white/10 hover:border-white/30 rounded-xl relative transition-colors focus-within:border-white/50">
                                {imagePreview || (!removeImage && prompt.image_url) ? (
                                    <>
                                        <img
                                            src={imagePreview || prompt.image_url}
                                            alt="Preview"
                                            className="absolute inset-0 w-full h-full object-contain p-4 opacity-50 block"
                                        />
                                        <div className="z-10 flex flex-col items-center gap-2">
                                            <Upload className="w-8 h-8 text-white drop-shadow-md" />
                                            <span className="font-bold text-white drop-shadow-md">Change Image</span>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center text-neutral-500">
                                        <Upload className="w-8 h-8 mb-2" />
                                        <span>Upload New Image</span>
                                    </div>
                                )}
                                <input type="file" name="image" form="edit-form" accept="image/*" className="hidden w-0 h-0" onChange={handleImageChange} />
                            </label>
                        ) : prompt.image_url ? (
                            <img
                                src={prompt.image_url}
                                alt={prompt.name}
                                className="w-full h-full object-contain max-h-[40vh] md:max-h-none rounded-lg"
                            />
                        ) : (
                            <div className="text-neutral-600">No Image</div>
                        )}
                        {isEditing && (imagePreview || prompt.image_url) && !removeImage && (
                            <button
                                type="button"
                                onClick={(e) => { e.preventDefault(); setRemoveImage(true); setImagePreview(null); }}
                                className="absolute top-4 left-4 bg-red-500/80 text-white text-xs px-3 py-1 rounded-full z-20 hover:bg-red-500"
                            >
                                Remove
                            </button>
                        )}
                    </div>

                    {/* Details Section */}
                    <div className="w-full md:w-1/2 flex flex-col h-full max-h-[50vh] md:max-h-full overflow-hidden bg-[#0a0a0a]">
                        {!isEditing ? (
                            <>
                                <div className="p-6 border-b border-white/5 bg-neutral-900/40">
                                    <div className="flex justify-between items-start gap-4">
                                        <div className="flex-1">
                                            <h2 className="text-2xl font-bold text-white mb-3 leading-tight">{prompt.name}</h2>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-white/10 text-neutral-300 uppercase tracking-widest">
                                                    {prompt.type}
                                                </span>
                                                {!isUserCreated ? (
                                                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-neutral-800 text-neutral-400 border border-white/5" title="Original prompts cannot be edited or deleted.">
                                                        <Lock className="w-3 h-3" />
                                                        <span>Official</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex gap-1.5">
                                                        <button onClick={() => setIsEditing(true)} className="px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition-colors flex items-center gap-1.5">
                                                            <Edit2 className="w-3 h-3" /> Edit
                                                        </button>
                                                        <button onClick={handleDelete} disabled={isPending} className="px-2.5 py-1 rounded-md text-xs font-semibold bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-colors flex items-center gap-1.5">
                                                            {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />} Delete
                                                        </button>
                                                    </div>
                                                )}

                                                {/* Rating Stars Wrapper */}
                                                <div className="flex items-center gap-1 border-l border-white/10 pl-2 ml-2">
                                                    {[1, 2, 3, 4, 5].map((star) => {
                                                        const currentRating = optimisticRating !== null ? optimisticRating : (prompt.metadata?.rating || 0);
                                                        return (
                                                            <button
                                                                key={star}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setOptimisticRating(star); // Optimistic UI update
                                                                    startRatingTransition(async () => {
                                                                        await ratePrompt(prompt.id, star);
                                                                    });
                                                                }}
                                                                disabled={isRatingPending || isPending}
                                                                className={`p-0.5 transition-all hover:scale-110 active:scale-90 ${star <= currentRating ? "text-yellow-400" : "text-neutral-600 hover:text-yellow-400/50"}`}
                                                            >
                                                                <Star className="w-4 h-4" fill={star <= currentRating ? "currentColor" : "none"} />
                                                            </button>
                                                        )
                                                    })}
                                                </div>

                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex-1 p-6 overflow-y-auto bg-[#0a0a0a] text-neutral-300 font-mono text-sm leading-relaxed whitespace-pre-wrap custom-scrollbar selection:bg-white/20">
                                    {prompt.prompt_text}
                                </div>

                                <div className="p-4 border-t border-white/5 bg-neutral-900/40">
                                    {prompt.metadata?.audio_url && (
                                        <div className="mb-4">
                                            <audio controls src={prompt.metadata.audio_url} className="w-full h-12 rounded-xl" />
                                        </div>
                                    )}
                                    <button
                                        onClick={handleCopy}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-white text-black font-semibold hover:bg-neutral-200 shadow-[0_0_15px_rgba(255,255,255,0.15)] transition-all active:scale-[0.98]"
                                    >
                                        {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                                        {copied ? "Copied to clipboard!" : "Copy Full Prompt"}
                                    </button>
                                </div>
                            </>
                        ) : (
                            <form id="edit-form" onSubmit={handleUpdate} className="flex flex-col h-full bg-[#0a0a0a]">
                                <div className="p-6 border-b border-white/5 bg-neutral-900/40 flex justify-between items-center">
                                    <h2 className="text-xl font-bold text-white">Edit Prompt</h2>
                                    <button type="button" onClick={() => setIsEditing(false)} className="text-neutral-400 hover:text-white text-sm">Cancel</button>
                                </div>
                                <div className="flex-1 p-6 overflow-y-auto space-y-4 custom-scrollbar">
                                    <div>
                                        <label className="block text-xs text-neutral-500 uppercase tracking-widest mb-1">Name</label>
                                        <input required name="name" defaultValue={prompt.name} className="w-full bg-black border border-white/10 rounded-md p-2 text-white" />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-neutral-500 uppercase tracking-widest mb-1">Type</label>
                                        <input required name="type" defaultValue={prompt.type} className="w-full bg-black border border-white/10 rounded-md p-2 text-white" />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-neutral-500 uppercase tracking-widest mb-1">Audio</label>
                                        <div className="flex items-center gap-3">
                                            <label className="cursor-pointer px-4 py-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors text-sm text-neutral-300 flex items-center gap-2">
                                                <Upload className="w-4 h-4" />
                                                <span>Upload Audio</span>
                                                <input type="file" name="audio" accept="audio/*" className="hidden" onChange={handleAudioChange} />
                                            </label>
                                            {(audioFileName || (!removeAudio && prompt.metadata?.audio_url)) && (
                                                <div className="flex bg-neutral-950 border border-white/10 rounded-lg overflow-hidden items-center">
                                                    <span className="px-3 py-2 text-xs text-neutral-400 break-all line-clamp-1 max-w-[200px]">
                                                        {audioFileName || "Current Audio"}
                                                    </span>
                                                    <button type="button" onClick={() => { setRemoveAudio(true); setAudioFileName(null); }} className="px-3 py-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors">
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex-1 flex flex-col min-h-48">
                                        <label className="block text-xs text-neutral-500 uppercase tracking-widest mb-1">Prompt Text</label>
                                        <textarea required name="prompt_text" defaultValue={prompt.prompt_text} className="w-full flex-1 bg-black border border-white/10 rounded-md p-3 text-neutral-300 font-mono text-sm resize-none custom-scrollbar" />
                                    </div>
                                </div>
                                <div className="p-4 border-t border-white/5 bg-neutral-900/40 flex gap-3">
                                    <button type="button" onClick={handleDelete} disabled={isPending} className="px-4 py-2 font-semibold text-red-500 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors flex items-center justify-center">
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                    <button type="submit" disabled={isPending} className="flex-1 bg-white text-black font-bold py-2 rounded-lg hover:bg-neutral-200 transition-colors flex justify-center items-center gap-2">
                                        {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save Changes"}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
