import type { Metadata } from "next";
import type { ReactNode } from "react";
import IdentityBar from "./_components/identity-bar";

export const metadata: Metadata = {
  title: "Amber Global Energy | Premium International Brokerage",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <IdentityBar />
      {children}
    </>
  );
}
