"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(false);
    
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        // Refresh the router to bypass the middleware loop, then go home
        router.refresh();
        router.push("/");
      } else {
        setError(true);
      }
    } catch (err) {
      setError(true);
    }
  };

  return (
    <main className="min-h-[100dvh] flex items-center justify-center p-6 bg-gradient-to-b from-[#09090b] to-[#000000]">
      <div className="w-full max-w-md p-8 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.5)] flex flex-col items-center">
        <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-6 border border-white/10 shadow-[0_0_20px_rgba(59,130,246,0.15)]">
          <Lock className="w-8 h-8 text-blue-400" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white via-neutral-200 to-neutral-600 mb-2 font-serif">
          심재고 <span className="text-xl text-neutral-500 tracking-normal ml-1">(深齋庫)</span>
        </h1>
        <p className="text-neutral-400 text-sm mb-8 text-center leading-relaxed">
          이 공간은 승인된 사용자만 접근할 수 있습니다.<br />
          비밀번호를 입력해 주세요.
        </p>
        
        <form onSubmit={handleSubmit} className="w-full space-y-5">
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호"
              className="w-full bg-black/50 border border-white/10 rounded-xl px-5 py-3.5 text-white placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-medium tracking-widest text-center"
              autoFocus
            />
          </div>
          {error && (
            <p className="text-red-400 text-sm text-center font-medium animate-pulse">
              비밀번호가 올바르지 않습니다.
            </p>
          )}
          <button
            type="submit"
            className="w-full bg-white text-black font-bold py-3.5 rounded-xl hover:bg-neutral-200 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.1)] active:scale-[0.98]"
          >
            입장하기
          </button>
        </form>
      </div>
    </main>
  );
}
