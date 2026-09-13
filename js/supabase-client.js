// ============================================================
// SupabaseプロジェクトのURLとPublishable key(旧称: anon key)を
// ここに貼ってください
// 取得場所: Supabase Dashboard > Project Settings > API Keys
//   - Project URL はそのまま
//   - Publishable key（sb_publishable_... の形式。旧 anon key）を使う
//   - Secret key（sb_secret_... 旧 service_role key）は絶対にここに
//     貼らないこと。フロントに置くとDBを誰でも操作できてしまいます
// ============================================================
const SUPABASE_URL = "https://ptzbrseoczzdmuxwwxed.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_FIek865NVZyeUFtOg4RHog_34yiZbXL";

// CDN経由でSupabase JSライブラリを読み込んで使う（ビルド不要）
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
