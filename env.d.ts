/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Adresse de l'API (exemple: http://localhost:8000/api). */
  readonly VITE_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
