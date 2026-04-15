/**
 * Trainer Profile Scanner Component
 *
 * Allows users to scan their Pokémon GO trainer profile screenshot
 * during onboarding to auto-fill their profile information.
 *
 * Flow:
 * 1. User taps "Scan Profile" button
 * 2. Camera/gallery picker opens
 * 3. Image is sent to server for OCR processing
 * 4. Extracted data is returned and auto-fills the form
 *
 * Works with both camera capture and gallery selection.
 * Supports Capacitor (native) and web browser environments.
 */

import { useState, useRef } from "react";
import { Camera, Upload, Loader2, CheckCircle, AlertCircle, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TeamId } from "@shared/schema";

interface TrainerScanResult {
  success: boolean;
  confidence: 'high' | 'medium' | 'low';
  data: {
    name: string | null;
    team: TeamId | null;
    level: number | null;
    friendCode: string | null;
  };
  errors: string[];
}

interface TrainerScannerProps {
  onScanComplete: (data: Partial<{
    name: string;
    team: TeamId;
    level: number;
    code: string;
  }>) => void;
}

export function TrainerScanner({ onScanComplete }: TrainerScannerProps) {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<TrainerScanResult | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('Image is too large (max 10MB)');
      return;
    }

    setError(null);
    setScanning(true);
    setResult(null);

    try {
      // Read file as base64
      const base64 = await fileToBase64(file);
      setPreview(base64);

      // Send to server for OCR
      const response = await fetch('/api/trainer/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageData: base64 }),
      });

      if (!response.ok) {
        throw new Error('Scanner service unavailable');
      }

      const scanResult: TrainerScanResult = await response.json();
      setResult(scanResult);

      // Auto-fill the form with extracted data
      if (scanResult.success) {
        const formData: Partial<{ name: string; team: TeamId; level: number; code: string }> = {};
        if (scanResult.data.name) formData.name = scanResult.data.name;
        if (scanResult.data.team) formData.team = scanResult.data.team;
        if (scanResult.data.level) formData.level = scanResult.data.level;
        if (scanResult.data.friendCode) formData.code = scanResult.data.friendCode;
        onScanComplete(formData);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to scan screenshot');
    } finally {
      setScanning(false);
    }
  };

  const handleCapture = () => {
    fileInputRef.current?.click();
  };

  const fieldStatus = (value: any) => {
    if (value) return <CheckCircle className="w-3.5 h-3.5 text-green-500" />;
    return <AlertCircle className="w-3.5 h-3.5 text-zinc-500" />;
  };

  return (
    <div className="space-y-3">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Scan button */}
      {!result && !scanning && (
        <div className="space-y-2">
          <Button
            onClick={handleCapture}
            variant="outline"
            className="w-full h-14 rounded-xl border-2 border-dashed border-zinc-600 bg-zinc-800/30 text-zinc-300 hover:bg-zinc-700/50 hover:border-orange-600/50 transition-all"
          >
            <ScanLine className="w-5 h-5 mr-2 text-orange-500" />
            Scan Trainer Profile
          </Button>
          <p className="text-[10px] text-zinc-500 text-center leading-tight">
            Take a screenshot of your Pokémon GO trainer profile, then tap above to scan it.
            We'll auto-fill your name, team, level, and friend code.
          </p>
        </div>
      )}

      {/* Scanning state */}
      {scanning && (
        <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
              <ScanLine className="w-4 h-4 text-orange-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Scanning screenshot...</p>
              <p className="text-xs text-zinc-400">Reading your trainer info</p>
            </div>
          </div>

          {preview && (
            <div className="mt-3 rounded-lg overflow-hidden border border-zinc-700 max-h-32">
              <img
                src={preview}
                alt="Screenshot preview"
                className="w-full h-full object-cover opacity-50"
              />
            </div>
          )}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className={cn(
          "rounded-xl border p-3 space-y-2",
          result.confidence === 'high'
            ? "border-green-700/50 bg-green-900/20"
            : result.confidence === 'medium'
            ? "border-yellow-700/50 bg-yellow-900/20"
            : "border-zinc-700 bg-zinc-800/50"
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {result.confidence === 'high' ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <AlertCircle className="w-4 h-4 text-yellow-500" />
              )}
              <span className="text-xs font-semibold text-white">
                {result.confidence === 'high' ? 'Profile Scanned' :
                 result.confidence === 'medium' ? 'Partial Scan' :
                 'Low Confidence'}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCapture}
              className="text-xs text-orange-400 h-6 px-2"
            >
              Re-scan
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-1.5 text-xs">
            <div className="flex items-center gap-1.5">
              {fieldStatus(result.data.name)}
              <span className="text-zinc-400">Name:</span>
              <span className="text-white font-medium truncate">
                {result.data.name || 'Not found'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {fieldStatus(result.data.team)}
              <span className="text-zinc-400">Team:</span>
              <span className={cn(
                "font-medium capitalize",
                result.data.team === 'valor' ? 'text-red-400' :
                result.data.team === 'mystic' ? 'text-blue-400' :
                result.data.team === 'instinct' ? 'text-yellow-400' :
                'text-zinc-300'
              )}>
                {result.data.team || 'Not found'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {fieldStatus(result.data.level)}
              <span className="text-zinc-400">Level:</span>
              <span className="text-white font-medium">
                {result.data.level || 'Not found'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {fieldStatus(result.data.friendCode)}
              <span className="text-zinc-400">Code:</span>
              <span className="text-white font-medium font-mono text-[10px]">
                {result.data.friendCode || 'Not found'}
              </span>
            </div>
          </div>

          {result.confidence !== 'high' && (
            <p className="text-[10px] text-zinc-500">
              Some fields weren't detected. Please verify and correct any missing info below.
            </p>
          )}
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="rounded-xl border border-red-700/50 bg-red-900/20 p-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <span className="text-xs text-red-300">{error}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setError(null); handleCapture(); }}
            className="text-xs text-orange-400 mt-1.5 h-6 px-2"
          >
            Try again
          </Button>
        </div>
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
