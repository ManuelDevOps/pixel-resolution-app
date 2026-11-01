export const pixelCount = (width, height) => width * height;
export const dimensions = (width, sourceWidth, sourceHeight) => ({
  width,
  height: Math.max(1, Math.round(width * sourceHeight / sourceWidth)),
});
export const imageBytes = (width, height, bits) => Math.ceil(pixelCount(width, height) * bits / 8);
export const guessPoints = (correct, hints) => correct ? Math.max(1, 3 - hints) : 0;
export const lowestUseful = (selected, minimum) => selected === minimum;
export const bestFit = (scenario, width) => ({ icon: 64, poster: 2048 })[scenario] === width;

export function validatePhoto(file) {
  if (!file || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return 'Choose a JPEG, PNG or WebP image.';
  if (file.size > 100 * 1024 * 1024) return 'Choose an image no larger than 100 MB.';
  if (!file.size) return 'Choose a non-empty image.';
  return '';
}

export function workingDimensions(width, height, maxSide = 1600) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
  const scale = Math.min(1, maxSide / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}
