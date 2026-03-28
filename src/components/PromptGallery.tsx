"use client";

import { useState, useEffect } from "react";
import PromptCard from "./PromptCard";
import PromptModal from "./PromptModal";
import AddPromptModal from "./AddPromptModal";
import { motion, AnimatePresence } from "framer-motion";
import { Plus } from "lucide-react";

export default function PromptGallery({ initialPrompts }: { initialPrompts: any[] }) {
    const [selectedPrompt, setSelectedPrompt] = useState<any | null>(null);
    const [filter, setFilter] = useState<string>("All");
    const [sortBy, setSortBy] = useState<string>("newest");
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    useEffect(() => {
        if (selectedPrompt) {
            const freshPrompt = initialPrompts.find(p => p.id === selectedPrompt.id);
            // Deep check to avoid infinite loops if references change but data is the same
            if (freshPrompt && JSON.stringify(freshPrompt) !== JSON.stringify(selectedPrompt)) {
                setSelectedPrompt(freshPrompt);
            }
        }
    }, [initialPrompts, selectedPrompt]);

    const categories = ["All", ...Array.from(new Set(initialPrompts.map(p => p.type))).sort()];

    let filteredPrompts = filter === "All" ? [...initialPrompts] : initialPrompts.filter(p => p.type === filter);

    filteredPrompts.sort((a, b) => {
        if (sortBy === "highest_rated") {
            const ratingA = a.metadata?.rating || 0;
            const ratingB = b.metadata?.rating || 0;
            return ratingB - ratingA;
        } else if (sortBy === "lowest_rated") {
            const ratingA = a.metadata?.rating || 0;
            const ratingB = b.metadata?.rating || 0;
            return ratingA - ratingB;
        } else if (sortBy === "oldest") {
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        } else {
            // "newest" (default)
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
    });

    return (
        <div className="space-y-12">
            <div className="flex flex-wrap gap-4 justify-center">
                {categories.map(cat => {
                    const label = cat === "business" ? "Business" : cat === "evaluation" ? "Evaluation" : cat === "evaluation_lite" ? "Eval Lite" : cat;
                    return (
                        <button
                            key={cat}
                            onClick={() => setFilter(cat as string)}
                            className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${filter === cat
                                ? "bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.25)] scale-105"
                                : "bg-white/5 text-neutral-400 border border-white/5 hover:bg-white/10 hover:text-white"
                                }`}
                        >
                            {label}
                        </button>
                    )
                })}
            </div>

            <div className="flex justify-end px-4">
                <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="bg-neutral-900 border border-white/10 text-white text-sm rounded-lg focus:ring-white/30 focus:border-white/30 block p-2.5 outline-none cursor-pointer"
                >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="highest_rated">Highest Rated</option>
                    <option value="lowest_rated">Lowest Rated</option>
                </select>
            </div>

            <motion.div
                layout
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            >
                <AnimatePresence>
                    {filteredPrompts.map(prompt => (
                        <PromptCard
                            key={prompt.id}
                            prompt={prompt}
                            onClick={() => setSelectedPrompt(prompt)}
                        />
                    ))}
                </AnimatePresence>
            </motion.div>

            <PromptModal
                prompt={selectedPrompt}
                isOpen={!!selectedPrompt}
                onClose={() => setSelectedPrompt(null)}
            />

            <AddPromptModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
            />

            <button
                onClick={() => setIsAddModalOpen(true)}
                className="fixed bottom-8 right-8 w-14 h-14 bg-white text-black rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.3)] hover:scale-110 hover:shadow-[0_0_40px_rgba(255,255,255,0.5)] transition-all z-40"
            >
                <Plus className="w-6 h-6" />
            </button>
        </div>
    );
}
