import { createServerClient } from "./server";

const BUCKET_NAME = "artworks";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

// Magic bytes for image validation
const IMAGE_SIGNATURES: Record<string, number[]> = {
  "image/jpeg": [0xff, 0xd8, 0xff],
  "image/png": [0x89, 0x50, 0x4e, 0x47],
  "image/gif": [0x47, 0x49, 0x46],
  "image/webp": [0x52, 0x49, 0x46, 0x46], // RIFF header (WebP starts with RIFF)
};

export async function validateImageFile(
  buffer: ArrayBuffer,
  mimeType: string
): Promise<{ valid: boolean; error?: string }> {
  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return { valid: false, error: `Invalid file type: ${mimeType}` };
  }

  // Check file size
  if (buffer.byteLength > MAX_FILE_SIZE) {
    return { valid: false, error: "File size exceeds 10MB limit" };
  }

  // Validate magic bytes
  const bytes = new Uint8Array(buffer.slice(0, 12));
  const signature = IMAGE_SIGNATURES[mimeType];

  if (signature) {
    const matches = signature.every((byte, i) => bytes[i] === byte);
    if (!matches) {
      return { valid: false, error: "File content does not match declared type" };
    }
  }

  return { valid: true };
}

export async function uploadArtwork(
  file: File,
  userId: string
): Promise<{ url: string } | { error: string }> {
  const supabase = createServerClient();

  // Read file buffer for validation
  const buffer = await file.arrayBuffer();

  // Validate file
  const validation = await validateImageFile(buffer, file.type);
  if (!validation.valid) {
    return { error: validation.error! };
  }

  // Generate unique filename
  const timestamp = Date.now();
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
  const path = `${userId}/${timestamp}-${sanitizedName}`;

  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(path, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    console.error("Storage upload error:", error);
    return { error: "Failed to upload image" };
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(data.path);

  return { url: urlData.publicUrl };
}

export function getStorageUrl(path: string): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return `${supabaseUrl}/storage/v1/object/public/${BUCKET_NAME}/${path}`;
}
