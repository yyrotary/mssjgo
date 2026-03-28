"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, ShieldAlert } from "lucide-react";

export default function AdminLoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(false);
    
    try {
      const res = await fetch("/api/auth/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        router.refresh();
        router.push("/admin");
      } else {
        setError(true);
      }
    } catch (err) {
      setError(true);
    }
  };

  return (
    <main className="min-h-[100dvh] flex items-center justify-center p-6 bg-gradient-to-b from-[#09090b] to-[#000000]">
      <div className="w-full max-w-md p-8 bg-black/40 border border-red-500/20 rounded-3xl backdrop-blur-md shadow-[0_8px_32px_rgba(255,0,0,0.15)] flex flex-col items-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 to-orange-500"></div>
        <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mb-6 border border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
          <ShieldAlert className="w-8 h-8 text-red-500" />
        </div>
        <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-white to-red-300 mb-2 font-serif text-center">
          심재고 관리자
        </h1>
        <p className="text-red-300/60 text-sm mb-8 text-center leading-relaxed">
          관리자 권한이 필요합니다.<br />
          비밀번호를 입력해 주세요.
        </p>
        
        <form onSubmit={handleSubmit} className="w-full space-y-5">
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Admin Password"
              className="w-full bg-black/80 border border-red-500/20 rounded-xl px-5 py-3.5 text-white placeholder-red-900/50 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition-all font-medium tracking-widest text-center"
              autoFocus
            />
          </div>
          {error && (
            <p className="text-red-500 text-sm text-center font-bold animate-pulse">
              비밀번호가 올바르지 않습니다.
            </p>
          )}
          <button
            type="submit"
            className="w-full bg-red-600 text-white font-bold py-3.5 rounded-xl hover:bg-red-500 transition-colors shadow-[0_0_20px_rgba(239,68,68,0.3)] active:scale-[0.98]"
          >
            관리자 접속
          </button>
        </form>
      </div>
    </main>
  );
}
