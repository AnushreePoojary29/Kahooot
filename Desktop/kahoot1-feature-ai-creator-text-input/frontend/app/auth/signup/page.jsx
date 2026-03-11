"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Brain, CircleHelp } from "lucide-react";

const buttonBase =
  "inline-flex items-center justify-center rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:pointer-events-none disabled:opacity-60 h-11 px-4 py-2";
const buttonDefault =
  `${buttonBase} bg-gradient-to-r from-violet-600 via-indigo-500 to-cyan-500 text-white shadow-lg shadow-indigo-500/25 hover:scale-[1.02] hover:shadow-cyan-400/30 active:scale-[0.99]`;
const inputClass =
  "flex h-11 w-full rounded-xl border border-white/30 bg-white/85 px-3 py-2 text-sm text-slate-800 shadow-sm transition-all duration-200 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:shadow-[0_0_0_4px_rgba(34,211,238,0.2)]";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignup(e) {
    e.preventDefault();
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }

      router.push("/dashboard");
    } catch {
      setError("Failed to create account");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen flex items-center justify-center overflow-hidden p-4">

      <div className="relative z-10 w-full max-w-md rounded-3xl border border-white/30 bg-white/15 p-1 shadow-2xl backdrop-blur-xl">
        <div className="rounded-[22px] bg-white/90 px-6 py-7 text-card-foreground">
          <div className="flex flex-col space-y-1.5 text-center">
            <Link href="/" className="mb-4 flex items-center justify-center gap-2">
              <div className="size-10 overflow-hidden rounded-full bg-white shadow-lg shadow-slate-300/40">
                <img src="/sahyadri.png" alt="Sahyadri logo" className="h-full w-full object-cover" />
              </div>
              <span className="text-2xl font-black tracking-tight text-slate-800">QuizBlitz</span>
            </Link>

            <div className="mb-2 flex justify-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-1 text-[11px] font-semibold text-violet-700">
                <Brain className="size-3" /> Smart Mode
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-cyan-100 px-2.5 py-1 text-[11px] font-semibold text-cyan-700">
                <CircleHelp className="size-3" /> Quiz Ready
              </span>
            </div>

            <h3 className="text-2xl font-bold tracking-tight text-slate-900">Create Account</h3>
            <p className="text-sm text-slate-500">Let the quiz begin!</p>
          </div>

          <form onSubmit={handleSignup}>
            <div className="flex flex-col gap-4 pt-3">
              <div className="flex flex-col gap-2">
                <label htmlFor="name" className="text-sm font-medium text-slate-700">
                  Full Name
                </label>
                <input
                  id="name"
                  placeholder="Prof. John Smith"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className={inputClass}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="email" className="text-sm font-medium text-slate-700">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="professor@university.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className={inputClass}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="password" className="text-sm font-medium text-slate-700">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className={inputClass}
                />
              </div>

              {error && <p className="text-sm text-destructive text-center">{error}</p>}

              <button type="submit" className={`${buttonDefault} w-full`} disabled={loading}>
                {loading ? "Creating account..." : "Sign Up"}
              </button>
            </div>
          </form>

          <div className="pt-5 flex justify-center">
            <p className="text-sm text-slate-500">
              Already have an account?{" "}
              <Link
                href="/auth/login"
                className="font-semibold text-indigo-600 transition-colors hover:text-cyan-600 hover:underline"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
