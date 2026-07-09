import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Amber Global Energy | Premium International Brokerage",
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return children;
}
