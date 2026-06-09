import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { Sprout, Mail, Lock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  ssr: false,
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Welcome! Let's set up your forest.");
        navigate({ to: "/onboarding" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/" });
      }
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong");
    } finally { setLoading(false); }
  };

  const onGoogle = async () => {
    const res = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (res.error) toast.error("Google sign-in failed");
  };

  return (
    <div className="min-h-screen flex flex-col safe-top safe-bottom px-6 pt-14 pb-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2">
        <div className="size-10 rounded-2xl bg-primary text-primary-foreground grid place-items-center"><Sprout className="size-5" /></div>
        <div>
          <div className="font-display text-lg leading-none">TreeRise</div>
          <div className="text-xs text-muted-foreground">grow your focus, grow your forest</div>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mt-12">
        <h1 className="font-display text-4xl leading-tight">{mode === "signin" ? "Welcome back" : "Plant your first tree"}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {mode === "signin" ? "Your forest is waiting." : "Build a forest that mirrors your focus."}
        </p>
      </motion.div>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <div>
          <Label htmlFor="email" className="text-xs font-semibold text-muted-foreground">Email</Label>
          <div className="relative mt-1">
            <Mail className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9 h-12 rounded-xl" placeholder="you@treerise.app" />
          </div>
        </div>
        <div>
          <Label htmlFor="password" className="text-xs font-semibold text-muted-foreground">Password</Label>
          <div className="relative mt-1">
            <Lock className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="pl-9 h-12 rounded-xl" placeholder="••••••••" />
          </div>
        </div>
        <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl text-base font-semibold">
          {loading ? "Please wait..." : mode === "signin" ? "Sign in" : "Create account"}
        </Button>
      </form>

      <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
        <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
      </div>

      <Button variant="outline" onClick={onGoogle} className="w-full h-12 rounded-xl font-semibold">
        <GoogleG /> Continue with Google
      </Button>

      <div className="mt-6 text-center text-sm text-muted-foreground">
        {mode === "signin" ? "New here?" : "Already have an account?"}{" "}
        <button onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="text-primary font-semibold">
          {mode === "signin" ? "Create one" : "Sign in"}
        </button>
      </div>
    </div>
  );
}

function GoogleG() {
  return (
    <svg viewBox="0 0 24 24" className="size-5">
      <path fill="#EA4335" d="M12 11v3.2h5.34a4.6 4.6 0 0 1-2 3.01l3.24 2.51C20.46 17.93 21.5 15.2 21.5 12.27c0-.62-.06-1.22-.17-1.79H12z"/>
      <path fill="#34A853" d="M5.84 14.27 5.1 14.84 2.6 16.77A9.5 9.5 0 0 0 12 22c2.55 0 4.69-.84 6.25-2.28l-3.24-2.51c-.89.6-2.04.96-3.01.96-2.32 0-4.28-1.56-4.98-3.66l-1.18.86z"/>
      <path fill="#4A90E2" d="M2.6 7.23A9.5 9.5 0 0 0 2.5 12c0 1.55.37 3 .1 4.77l3.24-2.51A5.66 5.66 0 0 1 5.6 12c0-.94.17-1.84.46-2.69L2.6 7.23z"/>
      <path fill="#FBBC05" d="M12 6.5c1.39 0 2.63.48 3.6 1.42l2.7-2.7C16.69 3.75 14.55 2.9 12 2.9 8.13 2.9 4.78 5.1 2.6 7.23l3.46 2.69C6.76 7.81 9.16 6.5 12 6.5z"/>
    </svg>
  );
}
