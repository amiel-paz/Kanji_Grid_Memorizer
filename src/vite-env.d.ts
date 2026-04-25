/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_REVIEW_SCHEDULER_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
