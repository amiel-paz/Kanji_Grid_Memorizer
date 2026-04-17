export function validateTileOpacity(opacity: number): void {
  if (!Number.isFinite(opacity) || opacity < 0 || opacity > 1) {
    throw new Error('Tile opacity must be a number between 0 and 1.');
  }
}
