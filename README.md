# ServiYa — セットアップ手順(コードは書かなくてOKです)

Phase 1: サインアップ〜役割分岐〜顧客/プロバイダー登録 まで完成しています。
以下の手順通りに画面操作するだけで、実際に動くWebアプリになります。

## ステップ1: Supabaseプロジェクトを作る

1. https://supabase.com にアクセスし、アカウント作成 → 「New Project」
2. プロジェクト名は `serviya` などお好きな名前で作成(リージョンは `us-east` 系が中南米から近くおすすめ)
3. 作成が終わったら、左メニューの **SQL Editor** を開く
4. このプロジェクト内の `supabase/schema.sql` の中身を全部コピーして貼り付け、「Run」を押す
   → これでデータベースの表(profiles, orders など)が全部できます

## ステップ2: 画像アップロード用のStorageバケットを作る

1. 左メニューの **Storage** → 「New bucket」
2. 名前: `verification-docs`
3. 「Public bucket」をONにする(MVPの簡易設定です。本番前にアクセス制御の見直しを推奨します)

## ステップ3: Google Loginを有効化する(任意)

1. 左メニューの **Authentication > Providers > Google** をON
2. Google Cloud Console 側でOAuthクライアントを作成し、Client ID/Secretを貼る
   (この手順が難しければ、まずはメール/パスワード登録だけで進めても問題ありません)

## ステップ4: APIキーをコードに貼る

1. 左メニューの **Project Settings > API**
2. `Project URL` と `anon public key` をコピー
3. `js/supabase-client.js` を開き、`YOUR-PROJECT-REF` と `YOUR-ANON-PUBLIC-KEY` の部分を書き換えて保存

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

## まだ実装していない部分(次のフェーズ)

- 注文作成〜マッチング〜重量確定〜配達までのフロー(Phase 2)
- cédulaのTSE自動照合(Didit/Verifikなど有料APIとの連携。現状は運営が手動でprovider_profiles.statusを`approved`に変更する運用)
- 地図上でピンをドラッグして住所を指定するUI(現状はGPS自動取得のみ。Google Maps/Mapbox APIキー取得後に追加可能)
- 決済(カードのオンライン決済、SINPE Móvilの実際の入金確認フロー)
- ネイティブアプリ化(Capacitorで今のコードをラップする想定)

準備ができたら、Phase 2(注文・マッチング画面)から着手しましょう。
