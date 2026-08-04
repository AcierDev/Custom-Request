"use client";

import type React from "react";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ImageIcon, Loader2, Upload } from "lucide-react";
import { toast } from "@/lib/toast";
import {
  FILE_UPLOAD_CONFIG,
  loadExtractableFile,
} from "./fileUpload";

const DEFAULT_UPLOAD_ERROR_MESSAGE = "Could not read that file.";

interface ImageUploaderProps {
  onImageUpload: (imageDataUrl: string) => void;
}

export function ImageUploader({ onImageUpload }: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!isProcessing) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    if (!isProcessing && e.dataTransfer.files[0]) {
      void handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      void handleFile(e.target.files[0]);
    }
  };

  const handleFile = async (file: File) => {
    setIsProcessing(true);
    try {
      onImageUpload(await loadExtractableFile(file));
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : DEFAULT_UPLOAD_ERROR_MESSAGE,
      );
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors duration-200 ${
        isDragging
          ? "border-blue-500 bg-blue-500/5 dark:bg-blue-900/20"
          : "border-white/10 hover:border-blue-400 dark:hover:border-blue-500"
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <motion.div
        className="flex flex-col items-center justify-center gap-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="w-20 h-20 rounded-full bg-blue-500/10 dark:bg-blue-900/30 flex items-center justify-center">
          <ImageIcon className="h-10 w-10 text-blue-300" />
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-medium text-white">
            Upload an Image or PDF
          </h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Drag and drop a file, paste an image from your clipboard
            (⌘/Ctrl+V), or click to browse. PDFs use the first page.
          </p>
        </div>

        <div className="space-y-3">
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="bg-blue-600 hover:bg-blue-500 ring-1 ring-blue-400/40 text-white"
          >
            {isProcessing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            {isProcessing ? "Preparing file…" : "Browse Files"}
          </Button>

          <p className="text-xs text-slate-400">
            Supported formats: JPG, PNG, GIF, WebP, PDF (max{" "}
            {FILE_UPLOAD_CONFIG.maxSizeMegabytes} MB)
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept={FILE_UPLOAD_CONFIG.fileInputAccept}
          disabled={isProcessing}
          className="hidden"
          onChange={handleFileChange}
        />
      </motion.div>
    </div>
  );
}
