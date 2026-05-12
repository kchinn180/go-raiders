/**
 * Trainer Profile Scanner Component
 *
 * Lets trainers upload a screenshot of their Pokémon GO profile page
 * to use as a visual reference while filling in their details manually.
 *
 * Note: Auto-fill via OCR is not yet available. The image is shown as a
 * reference only — name, team, and level should be read from the screenshot
 * and typed into the form. Friend code is always entered manually (it lives
 * on a separate page in Pokémon GO and is not part of the profile screenshot).
 */

import { useState, useRef } from "react";
import { Upload, X, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface TrainerScannerProps {
  /** Called when the user clears the preview — optional cleanup hook */
  onClear?: () => void;
}

export function TrainerScanner({ onClear }: TrainerScannerProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setError("Image is too large (max 20 MB)");
      return;
    }

    try {
      const base64 = await fileToBase64(file);
      setPreview(base64);
    } catch {
      setError("Failed to load image — please try again");
    }

    // Reset input so the same file can be re-selected
    e.target.value = "";
  };

  const clearPreview = () => {
    setPreview(null);
    setError(null);
    onClear?.();
  };

  return (
    <div className="space-y-2">
      {/* Hidden file input — no capture="environment" to avoid Capacitor freeze */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      {!preview ? (
        /* Upload button */
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "w-full rounded-xl border-2 border-dashed border-zinc-600 bg-zinc-800/30",
            "flex flex-col items-center justify-center gap-1.5 py-4",
            "text-zinc-400 hover:bg-zinc-700/30 hover:border-orange-600/50 transition-all active:scale-[0.98]"
          )}
        >
          <Upload className="w-5 h-5 text-orange-500" />
          <span className="text-sm font-semibold text-zinc-300">Upload Profile Screenshot</span>
          <span className="text-[11px] text-zinc-500 text-center px-4 leading-tight">
            Snap your trainer profile in Pokémon GO — use it as a reference while you fill in your details below
          </span>
        </button>
      ) : (
        /* Preview image */
        <div className="relative rounded-xl overflow-hidden border border-zinc-700 bg-zinc-900">
          <img
            src={preview}
            alt="Trainer profile reference"
            className="w-full max-h-48 object-contain"
          />

          {/* Clear button */}
          <button
            type="button"
            onClick={clearPreview}
            className="absolute top-2 right-2 bg-black/70 backdrop-blur rounded-full p-1.5 hover:bg-black/90 transition-colors"
          >
            <X className="w-3.5 h-3.5 text-white" />
          </button>

          {/* Bottom hint bar */}
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent px-3 py-2">
            <div className="flex items-center gap-1.5">
              <ImageIcon className="w-3 h-3 text-orange-400 flex-shrink-0" />
              <p className="text-[10px] text-zinc-300 leading-tight">
                Read your name, team, and level from this screenshot and fill them in below ↓
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Friendly note about friend code */}
      {!preview && (
        <p className="text-[10px] text-zinc-500 text-center leading-snug px-2">
          Friend code is on a <span className="text-zinc-400 font-medium">separate page</span> in Pokémon GO — enter it manually in the field below.
        </p>
      )}

      {error && (
        <p className="text-xs text-red-400 text-center">{error}</p>
      )}
    </div>
  );
}

/** Convert a File to a base64 data URI */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
