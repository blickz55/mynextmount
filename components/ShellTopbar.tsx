"use client";

import { AuthNav } from "@/components/AuthNav";
import { ThemeToggle } from "@/components/ThemeToggle";

export function ShellTopbar() {
  return (
    <div className="shell-topbar shell-topbar--split">
      <AuthNav />
      <ThemeToggle />
    </div>
  );
}
