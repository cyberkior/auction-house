import type { Metadata } from "next";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { WalletProvider } from "@/components/wallet/WalletProvider";
import { NotificationToast } from "@/components/notifications/NotificationToast";
import "./globals.css";

export const metadata: Metadata = {
  title: "Art Auction | Digital Art on Solana",
  description:
    "A curated auction platform for digital art on Solana. Discover, bid, and collect.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col antialiased">
        <WalletProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
          <NotificationToast />
        </WalletProvider>
      </body>
    </html>
  );
}
