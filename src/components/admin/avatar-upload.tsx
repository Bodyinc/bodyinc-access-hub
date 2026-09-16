import { useRef, useState } from "react";
import { Loader2, Upload, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadProviderAvatar } from "@/lib/provider-avatar-upload";

export function AvatarUpload({
  value,
  onChange,
  disabled,
}: {
  value?: string | null;
  onChange: (url: string) => void;
  disabled?: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSelect(file: File) {
    setError(null);
    setUploading(true);
    try {
      onChange(await uploadProviderAvatar(file));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#E8EEED]">
        {value ? (
          <img src={value} alt="Provider avatar" className="h-full w-full object-cover" />
        ) : (
          <User className="h-7 w-7 text-[#3B4759]/40" />
        )}
      </div>
      <div className="min-w-0 space-y-1">
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          disabled={disabled || uploading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleSelect(file);
            e.target.value = "";
          }}
        />
        <Button
          type="button"
          disabled={disabled || uploading}
          onClick={() => fileRef.current?.click()}
          className="h-9 rounded-[8px] bg-[#6A9B9C] px-3 text-[13px] font-semibold text-white hover:bg-[#5B8788]"
        >
          {uploading ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <Upload className="mr-1.5 h-4 w-4" />
          )}
          {uploading ? "Uploading…" : value ? "Replace photo" : "Upload photo"}
        </Button>
        <p className="text-[12px] font-normal text-[#3B4759]/70">JPG, PNG, or WebP · Max 5MB</p>
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </div>
    </div>
  );
}
