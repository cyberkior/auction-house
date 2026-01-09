"use client";

import { useState, useEffect, useCallback } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { formatSol, formatWalletAddress } from "@/lib/utils/format";
import { formatDate } from "@/lib/utils/time";

interface PreviousWinner {
  id: string;
  winner_id: string;
  status: string;
  cascade_position: number;
  cascade_reason: string | null;
  winner: {
    wallet_address: string;
    username: string | null;
  };
}

interface Settlement {
  id: string;
  auction_id: string;
  winner_id: string;
  payment_deadline: string;
  payment_tx_signature: string | null;
  status: "pending" | "paid" | "failed";
  cascade_position: number;
  cascade_info: {
    position: number;
    previous_winners: PreviousWinner[];
  } | null;
  auction: {
    id: string;
    title: string;
    winning_bid: number;
    creator: {
      wallet_address: string;
      username: string | null;
    };
  };
  winner: {
    wallet_address: string;
    username: string | null;
  };
}

interface PageProps {
  params: { id: string };
}

export default function SettlePage({ params }: PageProps) {
  const { publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();
  const { user, isAuthenticated, signIn, isAuthenticating } = useAuth();

  const [settlement, setSettlement] = useState<Settlement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPaying, setIsPaying] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // Fetch settlement from auction ID
  const fetchSettlement = useCallback(async () => {
    try {
      // First get auction to find settlement
      const auctionRes = await fetch(`/api/auctions/${params.id}`);
      if (!auctionRes.ok) throw new Error("Auction not found");

      const { auction } = await auctionRes.json();

      if (auction.status !== "settling" && auction.status !== "completed") {
        throw new Error("This auction is not in settlement");
      }

      // Get settlement by auction ID
      const response = await fetch(`/api/settlements/auction/${params.id}`);
      if (!response.ok) {
        // Settlement might not exist yet, create a placeholder
        setSettlement({
          id: "pending",
          auction_id: params.id,
          winner_id: auction.winner_id,
          payment_deadline: new Date(
            Date.now() + 30 * 60 * 1000
          ).toISOString(),
          payment_tx_signature: null,
          status: "pending",
          cascade_position: 1,
          cascade_info: null,
          auction: {
            id: auction.id,
            title: auction.title,
            winning_bid: auction.winning_bid,
            creator: auction.creator,
          },
          winner: {
            wallet_address:
              auction.bids?.find(
                (b: { bidder_id: string }) => b.bidder_id === auction.winner_id
              )?.bidder?.wallet_address || "",
            username: null,
          },
        });
        return;
      }

      const data = await response.json();
      setSettlement(data.settlement);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load settlement");
    } finally {
      setIsLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchSettlement();
  }, [fetchSettlement]);

  // Handle payment
  const handlePay = async () => {
    if (!publicKey || !signTransaction || !settlement || !user) return;

    setIsPaying(true);
    setPaymentError(null);

    try {
      const sellerPubkey = new PublicKey(
        settlement.auction.creator.wallet_address
      );
      const amount = settlement.auction.winning_bid;

      // Create transaction
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: sellerPubkey,
          lamports: amount,
        })
      );

      // Get recent blockhash
      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      // Sign transaction
      const signedTx = await signTransaction(transaction);

      // Send transaction
      const signature = await connection.sendRawTransaction(
        signedTx.serialize()
      );

      // Wait for confirmation
      await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      });

      // Verify with backend
      const verifyRes = await fetch(
        `/api/settlements/${settlement.id}/verify`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            txSignature: signature,
            walletAddress: publicKey.toBase58(),
          }),
        }
      );

      if (!verifyRes.ok) {
        const data = await verifyRes.json();
        throw new Error(data.error || "Verification failed");
      }

      setPaymentSuccess(true);
      fetchSettlement();
    } catch (err) {
      console.error("Payment error:", err);
      setPaymentError(
        err instanceof Error ? err.message : "Payment failed"
      );
    } finally {
      setIsPaying(false);
    }
  };

  // Calculate time remaining
  const getTimeRemaining = () => {
    if (!settlement) return null;
    const deadline = new Date(settlement.payment_deadline);
    const now = new Date();
    const diff = deadline.getTime() - now.getTime();

    if (diff <= 0) return "Expired";

    const minutes = Math.floor(diff / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  const [timeRemaining, setTimeRemaining] = useState<string | null>(null);

  useEffect(() => {
    if (!settlement) return;

    const updateTime = () => setTimeRemaining(getTimeRemaining());
    updateTime();

    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [settlement]);

  if (isLoading) {
    return (
      <div className="max-w-xl mx-auto px-6 py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/2" />
          <div className="h-64 bg-gray-200 rounded-card" />
        </div>
      </div>
    );
  }

  if (error || !settlement) {
    return (
      <div className="max-w-xl mx-auto px-6 py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">Settlement Not Found</h1>
        <p className="text-gray-600 mb-8">{error}</p>
        <Link
          href={`/auction/${params.id}`}
          className="inline-block px-6 py-3 bg-accent text-white rounded-button font-medium hover:bg-accent-hover transition-colors"
        >
          Back to Auction
        </Link>
      </div>
    );
  }

  const isWinner =
    publicKey?.toBase58() === settlement.winner.wallet_address;
  const isPaid = settlement.status === "paid";
  const isExpired = timeRemaining === "Expired";

  return (
    <div className="max-w-xl mx-auto px-6 py-12">
      {/* Back link */}
      <Link
        href={`/auction/${params.id}`}
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-8 transition-colors"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Back to auction
      </Link>

      <h1 className="text-3xl font-bold mb-2">Complete Payment</h1>
      <p className="text-gray-600 mb-8">
        Send payment to finalize your winning bid.
      </p>

      {/* Cascade Notice */}
      {settlement.cascade_info && (
        <div className="bg-amber-50 border border-amber-200 rounded-card p-4 mb-6">
          <div className="flex items-start gap-3">
            <span className="text-amber-600 text-xl">⚡</span>
            <div>
              <p className="font-medium text-amber-800">
                You&apos;re the #{settlement.cascade_info.position} choice winner
              </p>
              <p className="text-sm text-amber-700 mt-1">
                {settlement.cascade_info.position === 2
                  ? "The original winner didn't complete payment in time."
                  : "Previous winners didn't complete payment in time."}
              </p>
              <p className="text-sm text-amber-700 mt-1">
                You have 30 minutes to complete your payment.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Status Card */}
      <div className="bg-white rounded-card border border-gray-200 p-6 mb-6">
        {/* Status Badge */}
        <div className="mb-6">
          {isPaid ? (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">
              Payment Complete
            </span>
          ) : isExpired ? (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-700">
              Deadline Expired
            </span>
          ) : (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-700">
              Awaiting Payment
            </span>
          )}
        </div>

        {/* Auction Info */}
        <div className="mb-6">
          <h2 className="font-semibold text-lg mb-2">
            {settlement.auction.title}
          </h2>
          <p className="text-gray-500">
            Won by{" "}
            {settlement.winner.username ||
              formatWalletAddress(settlement.winner.wallet_address)}
          </p>
        </div>

        {/* Payment Details */}
        <dl className="space-y-4 mb-6">
          <div className="flex justify-between">
            <dt className="text-gray-500">Winning Bid</dt>
            <dd className="font-semibold text-xl">
              {formatSol(settlement.auction.winning_bid)}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Send To</dt>
            <dd className="font-mono text-sm">
              {settlement.auction.creator.username ||
                formatWalletAddress(
                  settlement.auction.creator.wallet_address
                )}
            </dd>
          </div>
          {!isPaid && !isExpired && (
            <div className="flex justify-between">
              <dt className="text-gray-500">Time Remaining</dt>
              <dd
                className={`font-mono font-semibold ${
                  timeRemaining && parseInt(timeRemaining) < 5
                    ? "text-red-600"
                    : ""
                }`}
              >
                {timeRemaining}
              </dd>
            </div>
          )}
        </dl>

        {/* Action */}
        {!isPaid && !isExpired && (
          <>
            {!publicKey ? (
              <p className="text-center text-gray-500 py-4">
                Connect your wallet to pay
              </p>
            ) : !isWinner ? (
              <p className="text-center text-gray-500 py-4">
                Only the winner can pay
              </p>
            ) : !isAuthenticated ? (
              <button
                onClick={signIn}
                disabled={isAuthenticating}
                className="w-full py-3 bg-accent text-white rounded-button font-medium hover:bg-accent-hover transition-colors disabled:opacity-50"
              >
                {isAuthenticating ? "Signing..." : "Sign In to Pay"}
              </button>
            ) : (
              <>
                {paymentError && (
                  <p className="text-sm text-red-600 mb-4">{paymentError}</p>
                )}
                <button
                  onClick={handlePay}
                  disabled={isPaying}
                  className="w-full py-3 bg-accent text-white rounded-button font-medium hover:bg-accent-hover transition-colors disabled:opacity-50"
                >
                  {isPaying ? "Processing..." : "Pay Now"}
                </button>
              </>
            )}
          </>
        )}

        {/* Success State */}
        {(isPaid || paymentSuccess) && (
          <div className="text-center py-4">
            <div className="text-4xl mb-2">🎉</div>
            <p className="text-green-600 font-medium">
              Payment successful! The artwork is yours.
            </p>
            {settlement.payment_tx_signature && (
              <a
                href={`https://explorer.solana.com/tx/${settlement.payment_tx_signature}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-accent hover:underline mt-2 inline-block"
              >
                View transaction
              </a>
            )}
          </div>
        )}

        {/* Expired State */}
        {isExpired && !isPaid && (
          <div className="text-center py-4">
            <p className="text-red-600">
              The payment deadline has passed. This auction may be offered to
              the next highest bidder.
            </p>
          </div>
        )}
      </div>

      {/* Warning */}
      {!isPaid && !isExpired && isWinner && (
        <p className="text-xs text-gray-400 text-center">
          Failure to pay within the deadline will result in a strike on your
          account and loss of credits.
        </p>
      )}
    </div>
  );
}
