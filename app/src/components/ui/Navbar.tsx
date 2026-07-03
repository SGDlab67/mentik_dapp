"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { shortenPubkey } from "@/lib/solana";

const NAV_ITEMS = [
  { href: "/", label: "Portfolio" },
  { href: "/wallet", label: "Wallet" },
  { href: "/yield", label: "Yield" },
  { href: "/history", label: "History" },
];

export function Navbar() {
  const pathname = usePathname();
  const { publicKey } = useWallet();

  return (
    <nav className="sticky top-0 z-50 border-b border-mentik-border bg-mentik-bg/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-mentik-accent flex items-center justify-center text-white font-bold text-sm">
            M
          </div>
          <span className="text-lg font-semibold text-white">Mentik</span>
          <span className="ml-1 rounded bg-mentik-accent/20 px-1.5 py-0.5 text-[10px] font-medium text-mentik-accent">
            DEVNET
          </span>
        </Link>

        {/* Navigation */}
        <div className="flex items-center gap-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                pathname === item.href
                  ? "bg-mentik-accent/10 text-mentik-accent"
                  : "text-mentik-muted hover:text-mentik-text hover:bg-mentik-card"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>

        {/* Wallet */}
        <div className="flex items-center gap-3">
          {publicKey && (
            <span className="hidden sm:inline text-xs text-mentik-muted font-mono">
              {shortenPubkey(publicKey.toBase58())}
            </span>
          )}
          <WalletMultiButton className="!bg-mentik-accent hover:!bg-mentik-accent-hover !rounded-lg !h-9 !text-sm" />
        </div>
      </div>
    </nav>
  );
}
