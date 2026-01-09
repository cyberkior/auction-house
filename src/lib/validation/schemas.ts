import { z } from "zod";

// Base reusable schemas
const walletAddressSchema = z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/);
const uuidSchema = z.string().uuid();
const lamportsSchema = z.number().int().positive();
const titleSchema = z
  .string()
  .min(3)
  .max(100)
  .transform((str) => str.trim());
const tagsSchema = z.array(z.string().toLowerCase()).max(10);

// Route-specific schemas
export const createAuctionSchema = z
  .object({
    walletAddress: walletAddressSchema,
    title: titleSchema,
    description: z
      .string()
      .min(10)
      .max(5000)
      .transform((str) => str.trim()),
    imageUrl: z.string().url(),
    tags: tagsSchema.optional().default([]),
    reservePrice: lamportsSchema,
    minBidIncrement: lamportsSchema,
    startTime: z.string().datetime(),
    endTime: z.string().datetime(),
  })
  .refine((data) => new Date(data.startTime) > new Date(), {
    message: "Start time must be in the future",
    path: ["startTime"],
  })
  .refine((data) => new Date(data.endTime) > new Date(data.startTime), {
    message: "End time must be after start time",
    path: ["endTime"],
  })
  .refine(
    (data) => {
      const duration =
        new Date(data.endTime).getTime() - new Date(data.startTime).getTime();
      return duration >= 3600000; // 1 hour in ms
    },
    {
      message: "Auction must be at least 1 hour",
      path: ["endTime"],
    }
  );

export const placeBidSchema = z.object({
  walletAddress: walletAddressSchema,
  amount: lamportsSchema,
});

export const deleteAuctionSchema = z.object({
  walletAddress: walletAddressSchema,
});

export const deleteBidSchema = z.object({
  walletAddress: walletAddressSchema,
});

export const authSchema = z.object({
  walletAddress: walletAddressSchema,
  signature: z.string().min(1),
  message: z.string().min(1),
});

export const updateUserSchema = z.object({
  requesterWallet: walletAddressSchema,
  username: z.string().min(1).max(50).optional(),
  avatarUrl: z.string().url().optional(),
});

export const reportSchema = z.object({
  walletAddress: walletAddressSchema,
  auctionId: uuidSchema,
  category: z.enum(["nsfw", "scam", "stolen", "harassment"]),
  description: z
    .string()
    .max(1000)
    .transform((str) => str.trim())
    .optional(),
});

export const verifySettlementSchema = z.object({
  txSignature: z.string().min(1),
  walletAddress: walletAddressSchema,
});

export const markNotificationsSchema = z.object({
  walletAddress: walletAddressSchema,
  notificationIds: z.array(uuidSchema).optional(),
  markAllRead: z.boolean().optional(),
});

// Export inferred types
export type CreateAuctionInput = z.infer<typeof createAuctionSchema>;
export type PlaceBidInput = z.infer<typeof placeBidSchema>;
export type DeleteAuctionInput = z.infer<typeof deleteAuctionSchema>;
export type DeleteBidInput = z.infer<typeof deleteBidSchema>;
export type AuthInput = z.infer<typeof authSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ReportInput = z.infer<typeof reportSchema>;
export type VerifySettlementInput = z.infer<typeof verifySettlementSchema>;
export type MarkNotificationsInput = z.infer<typeof markNotificationsSchema>;
