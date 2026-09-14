# ServiYa — セットアップ手順(コードは書かなくてOKです)

Phase 1: サインアップ〜役割分岐〜顧客/プロバイダー登録 まで完成しています。
以下の手順通りに画面操作するだけで、実際に動くWebアプリになります。

## データベースのSQLファイルについて(重要)

このプロジェクトのSupabase用SQLファイルは2種類に分かれます:

- **`supabase/schema.sql`** — 最初の1回だけ実行するファイル。テーブルを新規作成します。**2回目以降は絶対に再実行しないでください**(エラーになります)。
- **`supabase/migration_00X_〇〇.sql`** — フェーズが進むたびに追加されるファイル。既存のテーブルに列やルールを**追加**するだけのファイルです。`schema.sql`は変更せず、そのまま新しいクエリとして貼って実行してください。

つまり実行するSQLは**毎回置き換えるのではなく、フェーズが増えるたびに1つずつ追加で実行していく**イメージです。番号順(001, 002, 003…)に実行してください。

## ステップ1: Supabaseプロジェクトを作る

1. https://supabase.com にアクセスし、アカウント作成 → 「New Project」
2. プロジェクト名は `serviya` などお好きな名前で作成(リージョンは `us-east` 系が中南米から近くおすすめ)
3. 作成が終わったら、左メニューの **SQL Editor** を開く
4. このプロジェクト内の `supabase/schema.sql` の中身を全部コピーして貼り付け、「Run」を押す
   → これでデータベースの表(profiles, orders など)が全部できます(これが唯一の初回セットアップ用ファイルです)

## ステップ2: 画像アップロード用のStorageバケットを作る

1. 左メニューの **Storage** → 「New bucket」
2. 名前: `verification-docs`
3. 「Public bucket」をONにする(MVPの簡易設定です。本番前にアクセス制御の見直しを推奨します)

## ステップ3: Google Loginを有効化する(任意)

1. 左メニューの **Authentication > Providers > Google** をON
2. Google Cloud Console 側でOAuthクライアントを作成し、Client ID/Secretを貼る
   (この手順が難しければ、まずはメール/パスワード登録だけで進めても問題ありません)

## ステップ4: APIキーをコードに貼る

1. 左メニューの **Project Settings > API Keys**
2. `Project URL` と `Publishable key`(`sb_publishable_...`、旧称 anon key)をコピー
   ※ `Secret key`(旧 service_role key)は絶対にコピーしない・使わないでください。これはサーバー専用の管理者キーで、フロント用のこのコードに含めるとデータベースを誰でも操作できる状態になります
3. `js/supabase-client.js` を開き、`YOUR-PROJECT-REF` と `YOUR-PUBLISHABLE-KEY` の部分を書き換えて保存

## ステップ5: GitHubにアップロード

1. https://github.com で新しいリポジトリを作成(例: `serviya-web`)
2. このフォルダ一式(index.html, css/, js/, register/, supabase/ など)をアップロード
   (GitHubのウェブ画面から「Add file > Upload files」でドラッグ&ドロップも可能です)

## ステップ6: Cloudflare Pagesで公開

1. https://dash.cloudflare.com → Workers & Pages → 「Create application」→「Pages」→「Connect to Git」
2. 先ほどのGitHubリポジトリを選択
3. ビルド設定は不要です(プレーンHTMLなので):
   - Build command: 空欄のまま
   - Build output directory: `/` (ルート)
4. デプロイが終わると `https://serviya-web.pages.dev` のようなURLが発行されます

これでサインアップ→役割選択→顧客/プロバイダー登録まで、実際にブラウザで動作確認できます。

---

## 動作確認の流れ

1. `index.html` を開く → 「Crear cuenta」
2. 名前・メール・パスワードを入力 → 「¿Cómo quieres usar ServiYa?」画面に進む
3. 「Busco servicio de lavandería」→ 顧客登録フォーム(位置情報・州/郡・señas particulares・支払い方法)
4. 「Quiero lavar y ganar」→ プロバイダー登録フォーム(cédula・顔写真・cédula写真・SINPE番号)

## Phase 2を反映する手順

1. Supabaseダッシュボード → **SQL Editor**
2. `supabase/migration_002_phase2.sql` の中身を全部コピーして貼り付け、「Run」を押す
   (`schema.sql`は変更していないので、再実行の必要はありません。これは追加分だけです)
3. 続けて `supabase/migration_003_fix_claim_policy.sql` も同様に実行してください(注文受諾時のバグ修正)
4. 続けて `supabase/migration_004_storage_policy.sql` も同様に実行してください(プロバイダー登録時の写真アップロード許可)
5. 続けて `supabase/migration_005_distance_and_pickup_address.sql` も同様に実行してください(受付一覧の距離表示・受諾後の集荷先住所閲覧)
6. 続けて `supabase/migration_006_provider_job_limit.sql` も同様に実行してください(プロバイダー1人あたりの同時受注上限)
7. 続けて `supabase/migration_007_protect_provider_admin_fields.sql` も同様に実行してください(プロフィール編集画面を追加する前の安全対策)
8. 続けて `supabase/migration_008_hide_address_after_completion.sql` も同様に実行してください(配達完了後は顧客住所を非表示にする)
9. 続けて `supabase/migration_009_scheduling_and_cancellation.sql` も同様に実行してください(スケジュール集荷・キャンセルポリシー: 受注前のみ無料キャンセル可、受注後は一切不可)
10. GitHubに新しいファイル一式(`order-new.html`, `orders-available.html`, `order-manage.html`, `profile-customer.html`, `profile-provider.html`, `pedidos-historial.html`, `trabajos-historial.html`, `js/`配下一式)と、更新した`dashboard-customer.html`・`dashboard-provider.html`・`README.md`をアップロード
11. Cloudflareが自動で再デプロイ(数十秒〜1分)

## Phase 2.3で追加したもの

- **プロフィール画面**(`profile-customer.html` / `profile-provider.html`): 電話番号・住所・señas particulares・SINPE番号などを後から見返し・編集できます。プロバイダーのcédula・審査ステータス・評価は、本人が書き換えられないようDB側でも保護しています(悪意あるAPI直叩きも防止)
- **プルダウンメニュー**(`js/nav.js`): 全ページ共通のナビゲーション。どのページからでも「ダッシュボード/新規注文またはプロバイダーは受付一覧/プロフィール/ログアウト」に飛べます
- **注文ステータスの色分け**(`js/order-status-labels.js`の`ORDER_STATUS_COLORS`): 待機中=グレー、作業中=ティール、もうすぐ完了=オレンジ、完了=緑、問題あり=赤

## 料金ロジック(js/pricing.js)

- 標準: ₡1,300/kg + 集配₡1,000、最低₡6,500
- Express: ₡2,200/kg + 集配₡1,000、最低₡9,500
- 早朝(5-8時)・夜間(19-21時): +₡1,500
- 運営手数料: 15%

金額を変えたい場合は`js/pricing.js`の`PRICING`定数だけ書き換えればOKです。

## まだ実装していない部分(次のフェーズ)

- cédulaのTSE自動照合(Didit/Verifikなど有料APIとの連携。現状は運営が手動でprovider_profiles.statusを`approved`に変更する運用)
- 地図上でピンをドラッグして住所を指定するUI(現状はGPS自動取得のみ。Google Maps/Mapbox APIキー取得後に追加可能)
- 決済(カードのオンライン決済、SINPE Móvilの実際の入金確認フロー)
- ネイティブアプリ化(Capacitorで今のコードをラップする想定)

準備ができたら、Phase 2(注文・マッチング画面)から着手しましょう。
