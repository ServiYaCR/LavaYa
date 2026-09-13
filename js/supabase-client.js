// ============================================================
// SupabaseプロジェクトのURLとanon keyをここに貼ってください
// 取得場所: Supabase Dashboard > Project Settings > API
// ============================================================
const SUPABASE_URL = "https://ptzbrseoczzdmuxwwxed.supabase.co/rest/v1/";
const SUPABASE_ANON_KEY = "sb_publishable_FIek865NVZyeUFtOg4RHog_34yiZbXL";

// CDN経由でSupabase JSライブラリを読み込んで使う（ビルド不要）
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
