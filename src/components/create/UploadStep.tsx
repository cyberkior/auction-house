"use client";

import { useCallback, useState } from "react";
import Image from "next/image";

interface UploadStepProps {
  imageUrl: string | null;
  title: string;
  description: string;
  tags: string[];
  walletAddress: string;
  onImageChange: (url: string) => void;
  onTitleChange: (title: string) => void;
  onDescriptionChange: (description: string) => void;
  onTagsChange: (tags: string[]) => void;
  onNext: () => void;
}

export function UploadStep({
  imageUrl,
  title,
  description,
  tags,
  walletAddress,
  onImageChange,
  onTitleChange,
  onDescriptionChange,
  onTagsChange,
  onNext,
}: UploadStepProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const handleFileSelect = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        setUploadError("Please select an image file");
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        setUploadError("Image must be less than 10MB");
        return;
      }

      setIsUploading(true);
      setUploadError(null);
      setUploadProgress(10);

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("walletAddress", walletAddress);

        setUploadProgress(30);

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        setUploadProgress(80);

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Upload failed");
        }

        const { url } = await response.json();
        setUploadProgress(100);
        onImageChange(url);
      } catch (error) {
        console.error("Upload failed:", error);
        setUploadError(error instanceof Error ? error.message : "Failed to upload image");
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
      }
    },
    [onImageChange, walletAddress]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect]
  );

  const handleAddTag = useCallback(() => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !tags.includes(tag) && tags.length < 5) {
      onTagsChange([...tags, tag]);
      setTagInput("");
    }
  }, [tagInput, tags, onTagsChange]);

  const handleRemoveTag = useCallback(
    (tagToRemove: string) => {
      onTagsChange(tags.filter((t) => t !== tagToRemove));
    },
    [tags, onTagsChange]
  );

  const isValid = imageUrl && title.trim().length >= 3;

  return (
    <div className="space-y-8">
      {/* Image Upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Artwork Image
        </label>
        <div
          className={`relative border-2 border-dashed rounded-card p-8 text-center transition-colors ${
            dragOver
              ? "border-accent bg-accent/5"
              : "border-gray-200 hover:border-gray-300"
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          {imageUrl ? (
            <div className="relative aspect-square max-w-md mx-auto">
              <Image
                src={imageUrl}
                alt="Artwork preview"
                fill
                className="object-contain rounded-lg"
              />
              <button
                onClick={() => onImageChange("")}
                className="absolute top-2 right-2 w-8 h-8 bg-white rounded-full shadow flex items-center justify-center text-gray-600 hover:text-gray-900"
              >
                &times;
              </button>
            </div>
          ) : (
            <div className="py-12">
              <div className="text-4xl mb-4">🖼️</div>
              {isUploading ? (
                <>
                  <p className="text-gray-600 mb-2">Uploading...</p>
                  <div className="w-48 mx-auto bg-gray-200 rounded-full h-2 mb-4">
                    <div
                      className="bg-accent h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </>
              ) : (
                <>
                  <p className="text-gray-600 mb-2">Drop your artwork here</p>
                  <p className="text-sm text-gray-400 mb-4">
                    PNG, JPG, GIF, WebP up to 10MB
                  </p>
                </>
              )}
              {uploadError && (
                <p className="text-sm text-red-500 mb-4">{uploadError}</p>
              )}
              <input
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
                className="hidden"
                id="file-upload"
                disabled={isUploading}
              />
              <label
                htmlFor="file-upload"
                className={`inline-block px-6 py-2 bg-accent text-white rounded-button font-medium cursor-pointer hover:bg-accent-hover transition-colors ${
                  isUploading ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                {isUploading ? "Uploading..." : "Select File"}
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Title */}
      <div>
        <label
          htmlFor="title"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Title
        </label>
        <input
          type="text"
          id="title"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Name your artwork"
          maxLength={100}
          className="w-full px-4 py-3 border border-gray-200 rounded-card focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
        />
      </div>

      {/* Description */}
      <div>
        <label
          htmlFor="description"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Description
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="Tell collectors about your piece..."
          rows={4}
          maxLength={2000}
          className="w-full px-4 py-3 border border-gray-200 rounded-card focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent resize-none"
        />
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tags (optional)
        </label>
        <div className="flex gap-2 mb-2 flex-wrap">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 rounded-full text-sm"
            >
              {tag}
              <button
                onClick={() => handleRemoveTag(tag)}
                className="text-gray-400 hover:text-gray-600"
              >
                &times;
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
            placeholder="Add a tag"
            maxLength={20}
            className="flex-1 px-4 py-2 border border-gray-200 rounded-card focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
          />
          <button
            onClick={handleAddTag}
            disabled={!tagInput.trim() || tags.length >= 5}
            className="px-4 py-2 bg-gray-100 text-gray-600 rounded-button font-medium hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1">Up to 5 tags</p>
      </div>

      {/* Next Button */}
      <div className="pt-4">
        <button
          onClick={onNext}
          disabled={!isValid}
          className="w-full py-3 bg-accent text-white rounded-button font-medium hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue to Auction Settings
        </button>
      </div>
    </div>
  );
}
