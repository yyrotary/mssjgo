import { supabase } from "@/lib/supabase";
import AdminDashboardClient from "./AdminDashboardClient";

export const revalidate = 0; // Always fetch fresh data for admin

export default async function AdminPage() {
  const { data: prompts } = await supabase
    .from("prompts")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen p-6 md:p-12 lg:p-20 bg-[#050505] text-white">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="border-b border-white/10 pb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-red-400 to-orange-400 font-serif">
              심재고 (深齋庫) 관리자
            </h1>
            <p className="text-neutral-500 mt-2">프롬프트 승인 및 삭제, 관리 기능을 제공합니다.</p>
          </div>
          <div className="flex items-center gap-4">
            <a href="/scraper" className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white text-sm font-bold rounded-lg transition-colors border border-blue-500/20">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M2 12h20"/><path d="M5 2v20"/><path d="M19 2v20"/><path d="M2.5 7h19"/><path d="M2.5 17h19"/></svg>
              웹 스크래퍼 열기
            </a>
            <a href="/" className="text-sm text-neutral-400 hover:text-white underline underline-offset-4 transition-colors">
              사용자 화면으로 가기 &rarr;
            </a>
          </div>
        </header>

        <AdminDashboardClient initialPrompts={prompts || []} />
      </div>
    </main>
  );
}
