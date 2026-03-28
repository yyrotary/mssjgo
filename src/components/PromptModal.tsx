import { motion, AnimatePresence } from "framer-motion";
import { X, Copy, Check, Lock } from "lucide-react";
import { useState, useEffect, useTransition } from "react";
import { ratePrompt } from "@/app/actions/promptActions";
import { Star } from "lucide-react";

export default function PromptModal({ prompt, isOpen, onClose }: { prompt: any, isOpen: boolean, onClose: () => void }) {
    const [copied, setCopied] = useState(false);
    const [isRatingPending, startRatingTransition] = useTransition();
    const [optimisticRating, setOptimisticRating] = useState<number | null>(null);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
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
                        {prompt.image_url ? (
                            <img
                                src={prompt.image_url}
                                alt={prompt.name}
                                className="w-full h-full object-contain max-h-[40vh] md:max-h-none rounded-lg"
                            />
                        ) : (
                            <div className="text-neutral-600">No Image</div>
                        )}
                    </div>

                    {/* Details Section */}
                    <div className="w-full md:w-1/2 flex flex-col h-full max-h-[50vh] md:max-h-full overflow-hidden bg-[#0a0a0a]">
                        <div className="p-6 border-b border-white/5 bg-neutral-900/40">
                            <div className="flex justify-between items-start gap-4">
                                <div className="flex-1">
                                    <h2 className="text-2xl font-bold text-white mb-3 leading-tight">{prompt.name}</h2>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-white/10 text-neutral-300 uppercase tracking-widest">
                                            {prompt.type}
                                        </span>
                                        {!isUserCreated && (
                                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-neutral-800 text-neutral-400 border border-white/5" title="Original prompts cannot be edited or deleted.">
                                                <Lock className="w-3 h-3" />
                                                <span>Official</span>
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
                                                        disabled={isRatingPending}
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
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
