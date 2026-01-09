"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useWallet } from "@solana/wallet-adapter-react";
import Link from "next/link";

interface ToastNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  auction_id: string | null;
}

interface Toast extends ToastNotification {
  visible: boolean;
}

export function NotificationToast() {
  const { publicKey } = useWallet();
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, visible: false } : t))
    );
    // Remove from DOM after animation
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 300);
  }, []);

  const addToast = useCallback((notification: ToastNotification) => {
    setToasts((prev) => [...prev, { ...notification, visible: true }]);

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      removeToast(notification.id);
    }, 5000);
  }, [removeToast]);

  useEffect(() => {
    if (!publicKey) return;

    const supabase = createClient();

    // First, get the user ID for this wallet
    const setupSubscription = async () => {
      const { data: user } = await supabase
        .from("users")
        .select("id")
        .eq("wallet_address", publicKey.toBase58())
        .single();

      if (!user) return;

      // Subscribe to new notifications for this user
      const channel = supabase
        .channel(`notifications:${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const notification = payload.new as ToastNotification;
            addToast(notification);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    const cleanup = setupSubscription();

    return () => {
      cleanup.then((fn) => fn?.());
    };
  }, [publicKey, addToast]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`bg-white rounded-card shadow-lg border border-gray-200 p-4 max-w-sm transition-all duration-300 ${
            toast.visible
              ? "translate-x-0 opacity-100"
              : "translate-x-full opacity-0"
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 text-sm">{toast.title}</p>
              <p className="text-gray-600 text-sm mt-1 truncate">
                {toast.message}
              </p>
              {toast.auction_id && (
                <Link
                  href={`/auction/${toast.auction_id}`}
                  className="text-accent text-sm mt-2 inline-block hover:underline"
                  onClick={() => removeToast(toast.id)}
                >
                  View auction →
                </Link>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-gray-400 hover:text-gray-600 flex-shrink-0"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
