import { motion } from "framer-motion";
import { Maximize2, Music, Star } from "lucide-react";

export default function PromptCard({ prompt, onClick }: { prompt: any, onClick: () => void }) {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            whileHover={{ y: -6 }}
            className="group relative rounded-2xl overflow-hidden bg-neutral-900 border border-white/10 cursor-pointer shadow-xl shadow-black/40 hover:shadow-2xl hover:shadow-white/5 transition-all duration-300"
            onClick={onClick}
        >
            <div className="aspect-[4/3] overflow-hidden bg-neutral-950 relative">
                {prompt.image_url ? (
                    <img
                        src={prompt.image_url}
                        alt={prompt.name}
                        className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                        loading="lazy"
                    />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-neutral-600 bg-neutral-950">
                        {prompt.metadata?.audio_url ? (
                            <Music className="w-12 h-12 mb-2 opacity-30" />
                        ) : (
                            <span className="text-xs uppercase tracking-widest opacity-50">No Image</span>
                        )}
                    </div>
                )}
                {prompt.metadata?.audio_url && (
                    <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-2 py-1.5 rounded-md flex items-center gap-1.5 shadow-lg border border-white/10">
                        <Music className="w-3.5 h-3.5 text-white" />
                        <span className="text-[10px] font-bold text-white uppercase tracking-wider">Audio</span>
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-5">
                    <div className="flex justify-between items-end">
                        <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 ease-out pr-2">
                            <h3 className="text-white font-semibold truncate text-lg tracking-tight drop-shadow-md">{prompt.name}</h3>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] text-neutral-300 font-medium uppercase tracking-widest bg-white/10 px-2 py-0.5 rounded backdrop-blur-sm">{prompt.type}</span>
                                {prompt.metadata?.rating > 0 && (
                                    <div className="flex items-center gap-0.5 bg-black/40 px-1.5 py-0.5 rounded backdrop-blur-sm">
                                        <Star className="w-3 h-3 text-yellow-400" fill="currentColor" />
                                        <span className="text-[10px] font-bold text-yellow-400">{prompt.metadata.rating}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="w-8 h-8 shrink-0 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center hover:bg-white/30 transition-colors shadow-lg">
                            <Maximize2 className="text-white w-4 h-4" />
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
