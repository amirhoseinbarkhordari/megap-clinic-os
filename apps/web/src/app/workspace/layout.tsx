import type { Metadata } from "next";

export const metadata: Metadata = { title: "مراجعان | MEGAP" };

export default function WorkspaceLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
