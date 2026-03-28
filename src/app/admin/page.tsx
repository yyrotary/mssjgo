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
        <header className="border-b border-white/10 pb-6 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-red-400 to-orange-400 font-serif">
              심재고 (深齋庫) 관리자
            </h1>
            <p className="text-neutral-500 mt-2">프롬프트 승인 및 삭제를 관리합니다.</p>
          </div>
          <a href="/" className="text-sm text-neutral-400 hover:text-white underline underline-offset-4 transition-colors">
            사용자 화면으로 가기 &rarr;
          </a>
        </header>

        <AdminDashboardClient initialPrompts={prompts || []} />
      </div>
    </main>
  );
}
