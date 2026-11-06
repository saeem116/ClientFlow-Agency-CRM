"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, Shield, Users, AlertCircle } from "lucide-react";
import { useNavigationLoader } from "@/components/ui/navigation-loader-context";

export function DemoLoginButtons() {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { begin } = useNavigationLoader();

  const handleDemoLogin = async (persona: "admin" | "member") => {
    setLoading(persona);
    setError(null);
    try {
      const response = await fetch("/api/auth/demo-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ persona }),
        credentials: "include",
      });

      const data = await response.json();

      if (response.ok && data.user) {
        // Refresh the auth context and redirect to dashboard
        begin();
        router.push("/dashboard");
      } else {
        setError(data.error || "Demo login failed. Please try again.");
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-3">
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        className="w-full min-h-11 h-auto py-2 justify-start gap-3 whitespace-normal border-2 border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50 text-foreground font-medium transition-colors"
        disabled={loading !== null}
        onClick={() => handleDemoLogin("admin")}
      >
        {loading === "admin" ? (
          <Loader2 className="h-4 w-4 animate-spin shrink-0" />
        ) : (
          <Shield className="h-4 w-4 text-primary shrink-0" />
        )}

        <span className="flex flex-1 min-w-0 flex-col items-start text-left">
          <span className="text-sm font-semibold whitespace-normal">
            Login as Admin
          </span>
          <span className="block w-full text-xs text-muted-foreground font-normal whitespace-normal break-words leading-4">
            Explore agency-wide dashboards, clients, projects and business
            operations
          </span>
        </span>
      </Button>

      <Button
        type="button"
        variant="outline"
        className="w-full min-h-11 h-auto py-2 justify-start gap-3 whitespace-normal border-2 border-muted-foreground/30 bg-muted/30 hover:bg-muted/50 hover:border-muted-foreground/50 text-foreground font-medium transition-colors"
        disabled={loading !== null}
        onClick={() => handleDemoLogin("member")}
      >
        {loading === "member" ? (
          <Loader2 className="h-4 w-4 animate-spin shrink-0" />
        ) : (
          <Users className="h-4 w-4 text-muted-foreground shrink-0" />
        )}

        <div className="flex flex-1 min-w-0 flex-col items-start text-left">
          <span className="text-sm font-semibold whitespace-normal">
            Login as Team Member
          </span>
          <span className="block w-full text-xs text-muted-foreground font-normal whitespace-normal break-words leading-4">
            Explore assigned work, tasks, projects and everyday team workflows
          </span>
        </div>
      </Button>
    </div>
  );
}
