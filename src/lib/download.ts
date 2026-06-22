interface DownloadTextFileOptions {
  readonly contents: string;
  readonly filename: string;
  readonly mimeType?: string;
}

export function downloadTextFile({
  contents,
  filename,
  mimeType = 'text/plain;charset=utf-8',
}: DownloadTextFileOptions): boolean {
  if (
    typeof document === 'undefined' ||
    typeof URL === 'undefined' ||
    typeof URL.createObjectURL !== 'function'
  ) {
    return false;
  }

  const blob = new Blob([contents], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  if (typeof URL.revokeObjectURL === 'function') {
    URL.revokeObjectURL(url);
  }

  return true;
}
