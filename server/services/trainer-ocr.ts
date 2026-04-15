/**
 * Trainer Profile Screenshot OCR Service
 *
 * Parses Pokémon GO trainer profile screenshots to extract:
 * - Trainer name
 * - Team (Valor/Mystic/Instinct)
 * - Level
 * - Friend code (from the friend screen)
 *
 * APPROACH:
 * This uses a two-pronged strategy:
 * 1. Color analysis for team detection (red = Valor, blue = Mystic, yellow = Instinct)
 * 2. Pattern matching on OCR text for name, level, and friend code
 *
 * The service is designed to work with the standard Pokémon GO trainer profile
 * screen layout. It handles common OCR noise and formatting variations.
 *
 * For production, this can be enhanced with:
 * - Tesseract.js for local OCR (no external API needed)
 * - Google Cloud Vision API for higher accuracy
 * - Apple Vision framework (on iOS devices via Capacitor plugin)
 */

export interface TrainerScanResult {
  success: boolean;
  confidence: 'high' | 'medium' | 'low';
  data: {
    name: string | null;
    team: 'valor' | 'mystic' | 'instinct' | null;
    level: number | null;
    friendCode: string | null;
  };
  errors: string[];
}

/**
 * Detect team from dominant colors in the image
 * Pokémon GO trainer profiles have very distinct team color backgrounds:
 * - Valor: Red (#FF0000-ish)
 * - Mystic: Blue (#0000FF-ish)
 * - Instinct: Yellow (#FFD700-ish)
 */
function detectTeamFromColors(buffer: Buffer): 'valor' | 'mystic' | 'instinct' | null {
  // Simple approach: sample pixels from the header area of the screenshot
  // In a real implementation, we'd use sharp or canvas to analyze pixels
  // For now, we look at raw byte patterns in the PNG/JPEG data

  // Check for PNG signature
  const isPng = buffer[0] === 0x89 && buffer[1] === 0x50;
  const isJpeg = buffer[0] === 0xFF && buffer[1] === 0xD8;

  if (!isPng && !isJpeg) return null;

  // Sample a region of bytes from the top portion of the image (header area)
  // This is a heuristic - the top 20% of the image typically shows team color
  const sampleSize = Math.min(buffer.length, 50000);
  const sampleStart = Math.floor(buffer.length * 0.05);
  const sampleEnd = Math.min(sampleStart + sampleSize, buffer.length);

  let redScore = 0;
  let blueScore = 0;
  let yellowScore = 0;
  let samples = 0;

  // For uncompressed portions, check RGB-like byte triplets
  for (let i = sampleStart; i < sampleEnd - 2; i += 3) {
    const r = buffer[i];
    const g = buffer[i + 1];
    const b = buffer[i + 2];

    // Skip very dark or very light pixels
    if (r + g + b < 50 || r + g + b > 700) continue;

    samples++;

    // Red (Valor): high R, low G and B
    if (r > 150 && g < 100 && b < 100) redScore++;
    // Blue (Mystic): high B, low R and G
    if (b > 150 && r < 100 && g < 100) blueScore++;
    // Yellow (Instinct): high R and G, low B
    if (r > 150 && g > 130 && b < 80) yellowScore++;
  }

  if (samples === 0) return null;

  const threshold = samples * 0.02; // At least 2% of sampled pixels

  if (redScore > threshold && redScore > blueScore && redScore > yellowScore) return 'valor';
  if (blueScore > threshold && blueScore > redScore && blueScore > yellowScore) return 'mystic';
  if (yellowScore > threshold && yellowScore > redScore && yellowScore > blueScore) return 'instinct';

  return null;
}

/**
 * Extract trainer info from OCR text
 * Handles various OCR output formats and common misreads
 */
function extractFromText(text: string): Partial<TrainerScanResult['data']> {
  const result: Partial<TrainerScanResult['data']> = {};
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // Extract friend code: pattern of 12 digits, possibly with spaces
  const friendCodePattern = /(\d[\d\s]{11,15}\d)/;
  for (const line of lines) {
    const match = line.replace(/[oO]/g, '0').match(friendCodePattern);
    if (match) {
      const digits = match[1].replace(/\D/g, '');
      if (digits.length === 12) {
        result.friendCode = digits.replace(/(\d{4})(?=\d)/g, '$1 ');
        break;
      }
    }
  }

  // Extract level: "Level XX" or "LV XX" or "Lv. XX"
  const levelPatterns = [
    /(?:level|lv\.?|lvl\.?)\s*(\d{1,2})/i,
    /(?:TL|Trainer\s*Level)\s*(\d{1,2})/i,
    /^\s*(\d{1,2})\s*$/,  // standalone number
  ];

  for (const line of lines) {
    for (const pattern of levelPatterns) {
      const match = line.match(pattern);
      if (match) {
        const level = parseInt(match[1]);
        if (level >= 1 && level <= 50) {
          result.level = level;
          break;
        }
      }
    }
    if (result.level) break;
  }

  // Extract team from text mentions
  const teamPatterns = {
    valor: /\b(valor|team\s*valor|red\s*team)\b/i,
    mystic: /\b(mystic|team\s*mystic|blue\s*team)\b/i,
    instinct: /\b(instinct|team\s*instinct|yellow\s*team)\b/i,
  };

  const fullText = lines.join(' ');
  for (const [team, pattern] of Object.entries(teamPatterns)) {
    if (pattern.test(fullText)) {
      result.team = team as 'valor' | 'mystic' | 'instinct';
      break;
    }
  }

  // Extract trainer name
  // In the PoGO profile screen, the name is usually a prominent line
  // that isn't a number, "Level", "Team", or friend code
  const skipPatterns = [
    /^\d+$/,
    /level|lv\.|lvl/i,
    /valor|mystic|instinct|team/i,
    /friend|code|trainer/i,
    /^\d{4}\s\d{4}\s\d{4}$/,
    /walked|caught|battles|pokestop/i,
    /buddy|medal|gift|trade/i,
    /km|xp|stardust/i,
  ];

  for (const line of lines) {
    if (line.length < 3 || line.length > 20) continue;
    if (skipPatterns.some(p => p.test(line))) continue;

    // Trainer names are typically alphanumeric
    if (/^[A-Za-z0-9_]{3,15}$/.test(line)) {
      result.name = line;
      break;
    }
  }

  return result;
}

/**
 * Parse a trainer profile screenshot
 *
 * @param base64Image - Base64 encoded image data (PNG or JPEG)
 * @returns Parsed trainer data with confidence score
 */
export async function parseTrainerScreenshot(base64Image: string): Promise<TrainerScanResult> {
  const errors: string[] = [];
  const buffer = Buffer.from(base64Image, 'base64');

  // Step 1: Detect team from colors
  const colorTeam = detectTeamFromColors(buffer);

  // Step 2: Try OCR-based extraction
  let ocrData: Partial<TrainerScanResult['data']> = {};

  try {
    // Attempt to use Tesseract.js if available
    const { createWorker } = await import('tesseract.js').catch(() => ({ createWorker: null }));

    if (createWorker) {
      const worker = await (createWorker as any)('eng');
      const { data: { text } } = await worker.recognize(buffer);
      await worker.terminate();

      ocrData = extractFromText(text);
    } else {
      errors.push('OCR library not available - using color analysis only');
    }
  } catch (e: any) {
    errors.push(`OCR failed: ${e.message}`);
  }

  // Step 3: Merge results, preferring OCR data
  const team = ocrData.team || colorTeam;
  const name = ocrData.name || null;
  const level = ocrData.level || null;
  const friendCode = ocrData.friendCode || null;

  // Calculate confidence
  const fieldsFound = [name, team, level, friendCode].filter(Boolean).length;
  let confidence: 'high' | 'medium' | 'low';
  if (fieldsFound >= 3) confidence = 'high';
  else if (fieldsFound >= 2) confidence = 'medium';
  else confidence = 'low';

  return {
    success: fieldsFound > 0,
    confidence,
    data: { name, team, level, friendCode },
    errors,
  };
}
