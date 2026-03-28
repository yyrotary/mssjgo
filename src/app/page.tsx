import { supabase } from "@/lib/supabase";
import PromptGallery from "@/components/PromptGallery";

export const revalidate = 60; // Revalidate every 60 seconds

export default async function Home() {
  const { data: prompts } = await supabase
    .from("prompts")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen p-6 md:p-12 lg:p-20 bg-gradient-to-b from-[#09090b] to-[#000000]">
      <div className="max-w-7xl mx-auto space-y-12">
        <header className="space-y-8 text-center py-12 md:py-20 relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-blue-500/10 blur-[120px] pointer-events-none rounded-full" />

          <div className="space-y-4 relative z-10">
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white via-neutral-200 to-neutral-600 pb-2">
              심재고 <span className="text-3xl md:text-5xl text-neutral-600 font-serif tracking-normal ml-2 font-medium">(心齋庫)</span>
            </h1>
            <p className="text-xl md:text-2xl text-blue-400 font-medium italic tracking-wide drop-shadow-sm">
              "비워냄으로써 더 큰 지혜를 채우는 우리만의 은밀한 AI 공작소"
            </p>
          </div>

          <div className="max-w-3xl mx-auto space-y-6 text-neutral-400 text-lg md:text-xl leading-relaxed relative z-10 text-left md:text-center mt-8">
            <p>
              '심재고'는 단순히 데이터를 쌓아두는 평범한 저장 공간이 아닙니다. AI 교육 과정을 기획하거나 웰니스 프로그램처럼 깊이 있는 통찰이 필요한 작업을 할 때, 복잡한 생각은 잠시 비워두고 오직 본질에만 집중할 수 있도록 돕는 <strong className="text-neutral-200">실무 최적화 공간</strong>입니다.
            </p>
            <p>
              외부에는 그 실체가 드러나지 않지만, 이 고요한 창고 안에서는 양질의 내부 자료와 가장 진보된 AI 툴들이 차곡차곡 축적됩니다. 아이디어가 막히거나 검증된 자료가 필요할 때 언제든 문을 열고 들어가, 문제를 해결할 강력한 <strong className="text-neutral-200">'무기(Tool)'</strong>와 <strong className="text-neutral-200">'식량(Data)'</strong>을 꺼내 올 수 있는 핵심 베이스캠프 역할을 수행합니다.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto mt-12 relative z-10 text-left pt-6 border-t border-white/5">
            <div className="bg-neutral-900/50 backdrop-blur-sm border border-white/10 p-6 rounded-2xl hover:bg-white/5 transition-colors group">
              <h3 className="text-xl font-bold text-white mb-2 font-serif tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400 group-hover:scale-[1.02] transition-transform origin-left">심재 (心齋)</h3>
              <p className="text-sm text-neutral-400 leading-relaxed">
                장자(莊子)의 철학에서 유래한 말로, <span className="text-neutral-300 font-semibold">'마음을 비우고 고요하게 하여 사물의 참모습을 꿰뚫어 보는 상태'</span>를 뜻합니다.
              </p>
            </div>
            <div className="bg-neutral-900/50 backdrop-blur-sm border border-white/10 p-6 rounded-2xl hover:bg-white/5 transition-colors group">
              <h3 className="text-xl font-bold text-white mb-2 font-serif tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400 group-hover:scale-[1.02] transition-transform origin-left">고 (庫)</h3>
              <p className="text-sm text-neutral-400 leading-relaxed">
                귀중한 자산이나 유용한 도구를 안전하게 보관하고, 필요할 때 언제든 꺼내 쓸 수 있는 든든한 <span className="text-neutral-300 font-semibold">'창고'이자 '무기고'</span>를 뜻합니다.
              </p>
            </div>
          </div>
        </header>

        <PromptGallery initialPrompts={prompts || []} />
      </div>
    </main>
  );
}
