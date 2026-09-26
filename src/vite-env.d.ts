/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_AUTH_EMAIL_DOMAIN?: string
  /** commit del build (lo setea el workflow de deploy) */
  readonly VITE_APP_VERSION?: string
}
interface ImportMeta {
  readonly env: ImportMetaEnv
}
