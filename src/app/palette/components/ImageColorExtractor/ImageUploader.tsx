"use client"

import type React from "react"

import { useState, useRef } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Upload, ImageIcon } from "lucide-react"
import { toast } from "sonner"

const MAX_IMAGE_SIZE_MB = 10
const MAX_IMAGE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024

// Validate + read an image File into a data URL. Shared by the file
// picker, drag-and-drop, and clipboard paste so all three behave the
// same. Returns true once a valid image starts loading.
export function loadImageFile(
  file: File,
  onImageUpload: (imageDataUrl: string) => void
): boolean {
  if (!file.type.match("image.*")) {
    toast.error("Please select an image file")
    return false
  }
  if (file.size > MAX_IMAGE_BYTES) {
    toast.error(`Image size should be less than ${MAX_IMAGE_SIZE_MB}MB`)
    return false
  }
  const reader = new FileReader()
  reader.onload = (e) => {
    if (e.target?.result) {
      onImageUpload(e.target.result as string)
    }
  }
  reader.readAsDataURL(file)
  return true
}

interface ImageUploaderProps {
  onImageUpload: (imageDataUrl: string) => void
}

export function ImageUploader({ onImageUpload }: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  const handleFile = (file: File) => {
    loadImageFile(file, onImageUpload)
  }

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
          <h3 className="text-lg font-medium text-white">Upload an Image</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Drag and drop an image, paste from your clipboard (⌘/Ctrl+V), or
            click to browse your files
          </p>
        </div>

        <div className="space-y-3">
          <Button
            onClick={() => fileInputRef.current?.click()}
            className="bg-blue-600 hover:bg-blue-500 ring-1 ring-blue-400/40 text-white"
          >
            <Upload className="mr-2 h-4 w-4" />
            Browse Files
          </Button>

          <p className="text-xs text-slate-400">Supported formats: JPG, PNG, GIF, WebP (max {MAX_IMAGE_SIZE_MB}MB)</p>
        </div>

        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      </motion.div>
    </div>
  )
}
