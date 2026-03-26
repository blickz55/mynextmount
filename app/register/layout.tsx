import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Register",
  description: "Create a MyNextMount account to save your mount export.",
};

export default function RegisterLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
