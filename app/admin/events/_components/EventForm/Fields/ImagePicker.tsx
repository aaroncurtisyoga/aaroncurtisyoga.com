"use client";

import { FC, useState, useCallback } from "react";
import { ListBlobResultBlob } from "@vercel/blob";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { cn } from "@/app/_lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useDisclosure } from "@/app/_hooks/useDisclosure";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { ImagePlus, Check, Upload, Image as ImageIcon, X } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { FieldErrors, useWatch } from "react-hook-form";
import { getImages } from "@/app/_lib/actions/blob.actions";
import { EventFormValues } from "@/app/admin/events/_components/EventForm/EventFormProvider";

interface ImagePickerProps {
  errors: FieldErrors<EventFormValues>;
  setValue: any;
  control?: any;
}

const ImagePicker: FC<ImagePickerProps> = ({ errors, setValue, control }) => {
  const [images, setImages] = useState<ListBlobResultBlob[]>([]);
  const [selectedImgUrl, setSelectedImgUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  // Always call the hook, but only use its value if control is provided
  const watchedImageUrl = useWatch({
    control: control || {},
    name: "imageUrl",
    disabled: !control,
  });
  const currentImageUrl = control ? watchedImageUrl : null;

  const handleGetImages = useCallback(async () => {
    const images = await getImages();
    setImages(images || []);
  }, []);

  const uploadImage = useCallback(
    async (file: File) => {
      setIsUploading(true);
      setUploadProgress(0);

      const formData = new FormData();
      formData.append("file", file);

      try {
        // Simulate progress (since fetch doesn't provide upload progress)
        const progressInterval = setInterval(() => {
          setUploadProgress((prev) => Math.min(prev + 10, 90));
        }, 100);

        const response = await fetch("/api/upload-image", {
          method: "POST",
          body: formData,
        });

        clearInterval(progressInterval);
        setUploadProgress(100);

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Upload failed");
        }

        const data = await response.json();
        setValue("imageUrl", data.url);

        // Refresh images list
        handleGetImages();

        setTimeout(() => {
          setIsUploading(false);
          setUploadProgress(0);
        }, 500);
      } catch (error) {
        console.error("Upload error:", error);
        setIsUploading(false);
        setUploadProgress(0);
        alert(
          error instanceof Error ? error.message : "Failed to upload image",
        );
      }
    },
    [setValue, handleGetImages],
  );

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        uploadImage(acceptedFiles[0]);
      }
    },
    [uploadImage],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".gif", ".webp"],
    },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024, // 5MB
  });

  const setHeroImage = () => {
    setValue("imageUrl", selectedImgUrl);
    onOpenChange();
  };

  const handlePressOpenButton = () => {
    handleGetImages();
    onOpen();
  };

  const clearImage = () => {
    setValue("imageUrl", "");
  };

  return (
    <>
      <div className="flex flex-col gap-3">
        <label className="text-sm font-medium">Event Image</label>

        {/* Drag and Drop Zone */}
        <div
          {...getRootProps()}
          className={cn(
            "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors",
            isDragActive
              ? "border-primary bg-primary/10"
              : "border-border hover:border-muted-foreground/40",
            isUploading && "pointer-events-none opacity-60",
          )}
        >
          <input {...getInputProps()} />

          {isUploading ? (
            <div className="space-y-2">
              <Upload className="w-8 h-8 mx-auto text-primary animate-pulse" />
              <p className="text-sm text-muted-foreground">Uploading...</p>
              <Progress value={uploadProgress} className="h-1" />
            </div>
          ) : isDragActive ? (
            <div className="space-y-2">
              <Upload className="w-8 h-8 mx-auto text-primary" />
              <p className="text-sm text-primary">Drop the image here</p>
            </div>
          ) : (
            <div className="space-y-2">
              <ImageIcon className="w-8 h-8 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Drag & drop an image here, or click to select
              </p>
              <p className="text-xs text-muted-foreground">
                JPG, PNG, GIF, WebP (max 5MB)
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons and Status */}
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={handlePressOpenButton}
            size="sm"
            disabled={isUploading}
          >
            <ImagePlus className="w-4 h-4" />
            Choose from Gallery
          </Button>

          {currentImageUrl && (
            <div className="flex items-center gap-2">
              <Badge variant="success">
                <Check className="w-3 h-3 mr-1" /> Image Selected
                <button onClick={clearImage} className="ml-1 hover:opacity-70">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            </div>
          )}
        </div>

        {/* Image Preview */}
        {currentImageUrl && (
          <Card className="max-w-[200px]">
            <CardContent className="p-2">
              <div className="relative w-full h-[100px]">
                <Image
                  src={currentImageUrl}
                  alt="Selected event image"
                  fill
                  className="object-cover rounded"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {errors.imageUrl?.message && (
          <div className="text-xs text-destructive">
            {errors.imageUrl.message}
          </div>
        )}
      </div>

      {/* Gallery Modal */}
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[95vw] h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Choose from gallery</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 flex-1 overflow-y-auto">
            {images?.map((image: any) => (
              <div key={image.pathname} className="relative aspect-video">
                <Image
                  src={image.url}
                  alt={image.pathname}
                  sizes="470px"
                  onClick={() => setSelectedImgUrl(image.url)}
                  className={cn(
                    "object-cover overflow-hidden rounded-md cursor-pointer transition-all",
                    "hover:opacity-75 hover:scale-105",
                    {
                      "ring-2 ring-primary ring-offset-2":
                        selectedImgUrl === image.url,
                    },
                  )}
                  fill={true}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="text-destructive border-destructive hover:bg-destructive/10"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button onClick={setHeroImage} disabled={!selectedImgUrl}>
              Select Image
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ImagePicker;
