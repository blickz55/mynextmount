"use client";

import type { ReactNode } from "react";

import { AuthNav } from "@/components/AuthNav";
import { ThemeToggle } from "@/components/ThemeToggle";

type Props = {
  /** Optional short pitch (e.g. tool landing) — sits between nav and theme toggle. */
  mission?: ReactNode;
};

export function ShellTopbar({ mission }: Props) {
  const hasMission = mission != null && mission !== false;
  return (
    <div
      className={
        hasMission
          ? "shell-topbar shell-topbar--split shell-topbar--with-mission"
          : "shell-topbar shell-topbar--split"
      }
    >
      <AuthNav />
      {hasMission ? (
        <p className="shell-topbar__mission">{mission}</p>
      ) : null}
      <ThemeToggle />
    </div>
  );
}
