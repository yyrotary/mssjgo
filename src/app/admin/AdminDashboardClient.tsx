"use client";

import { useState, useTransition } from "react";
import { approvePrompt, deletePrompt } from "@/app/actions/promptActions";
import { CheckCircle, Trash2, Loader2, Link as LinkIcon, Lock } from "lucide-react";

export default function AdminDashboardClient({ initialPrompts }: { initialPrompts: any[] }) {
    const [prompts, setPrompts] = useState(initialPrompts);
    const [isPending, startTransition] = useTransition();

    const handleApprove = (id: string) => {
        startTransition(async () => {
            // Optimistic UI update
            setPrompts(prev => prev.map(p => p.id === id ? { ...p, is_approved: true } : p));
            const res = await approvePrompt(id);
            if (res.error) {
                alert(res.error);
                // Revert on error
                setPrompts(prev => prev.map(p => p.id === id ? { ...p, is_approved: false } : p));
            }
        });
    };

    const handleDelete = (id: string, original_id: string, image_url: string | null) => {
        if (!confirm("정말 이 프롬프트를 완전 삭제하시겠습니까?")) return;
        
        startTransition(async () => {
            // Optimistic UI update
            setPrompts(prev => prev.filter(p => p.id !== id));
            const res = await deletePrompt(id, original_id, image_url);
            if (res.error) {
                alert(res.error);
                // Full refresh might be needed here, or we simply rely on a page reload if it fails to delete.
                window.location.reload();
            }
        });
    };

    const pendingPrompts = prompts.filter(p => !p.is_approved);
    const approvedPrompts = prompts.filter(p => p.is_approved);

    const renderList = (list: any[], showApprove: boolean) => {
        if (list.length === 0) {
            return <div className="p-8 text-center text-neutral-600 bg-white/5 rounded-xl border border-white/5">목록이 없습니다.</div>;
        }

        return (
            <div className="space-y-4">
                {list.map(prompt => {
                    const isOfficial = prompt.metadata?.source !== "user";
                    
                    return (
                        <div key={prompt.id} className="flex flex-col md:flex-row gap-4 p-5 bg-neutral-900/50 border border-white/10 rounded-xl hover:bg-neutral-900 transition-colors">
                            <div className="w-24 h-24 shrink-0 bg-black rounded-lg overflow-hidden border border-white/5 flex items-center justify-center">
                                {prompt.image_url ? (
                                    <img src={prompt.image_url} alt={prompt.name} className="w-full h-full object-cover opacity-80" />
                                ) : (
                                    <span className="text-xs text-neutral-600">No Img</span>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="text-lg font-bold text-white truncate">{prompt.name}</h3>
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest bg-white/10 text-neutral-300">
                                        {prompt.type}
                                    </span>
                                    {isOfficial && (
                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest bg-blue-500/20 text-blue-400 flex items-center gap-1">
                                            <Lock className="w-3 h-3" /> Official
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-neutral-400 line-clamp-2 font-mono mt-2 bg-black/50 p-2 rounded border border-white/5">
                                    {prompt.prompt_text}
                                </p>
                            </div>
                            <div className="flex md:flex-col justify-end gap-2 shrink-0 md:w-32">
                                {showApprove && !isOfficial && (
                                    <button 
                                        onClick={() => handleApprove(prompt.id)}
                                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white rounded-lg font-bold text-sm transition-colors"
                                    >
                                        <CheckCircle className="w-4 h-4" /> 승인
                                    </button>
                                )}
                                {!isOfficial && (
                                    <button 
                                        onClick={() => handleDelete(prompt.id, prompt.original_id, prompt.image_url)}
                                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg font-bold text-sm transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" /> 삭제
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="space-y-12">
            <section>
                <div className="flex items-center gap-3 mb-6">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-orange-500 animate-pulse"></span>
                        승인 대기 중 ({pendingPrompts.length})
                    </h2>
                </div>
                {renderList(pendingPrompts, true)}
            </section>

            <section>
                <div className="flex items-center gap-3 mb-6 border-t border-white/10 pt-12">
                    <h2 className="text-xl font-bold text-neutral-400 flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-green-500"></span>
                        승인 완료됨 ({approvedPrompts.length})
                    </h2>
                </div>
                {renderList(approvedPrompts, false)}
            </section>
        </div>
    );
}
