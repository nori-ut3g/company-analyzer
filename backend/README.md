# EDINET Analysis System - Backend

企業の財務データを分析するためのバックエンドマイクロサービスシステムです。

## アーキテクチャ

本システムは以下のマイクロサービスで構成されています：

- **API Gateway** (Port 3000): フロントエンドからのリクエストを各サービスにルーティング
- **Auth Service** (Port 3001): 認証・認可を管理
- **Analysis Service** (Port 3002): 財務データの分析を実行
- **Data Ingestion Service** (Port 3003): EDINETデータの取り込み
- **Report Generator Service** (Port 3004): PDF/HTMLレポートの生成

## 必要な環境

- Docker & Docker Compose
- Node.js 20+ (ローカル開発時)
- PostgreSQL 15+
- Redis 7+

## セットアップ

### 1. 環境変数の設定

```bash
cp .env.example .env
```

`.env`ファイルを編集して、必要な環境変数を設定してください：

- `POSTGRES_PASSWORD`: PostgreSQLのパスワード
- `JWT_SECRET`: JWT生成用のシークレットキー
- `SENDGRID_API_KEY`: SendGridのAPIキー（メール送信用）

### 2. Dockerコンテナの起動

```bash
# 全サービスの起動
docker-compose up -d

# ログの確認
docker-compose logs -f

# 特定のサービスのログを確認
docker-compose logs -f auth-service
```

### 3. データベースの初期化

初回起動時、PostgreSQLコンテナが自動的に`database/init.sql`を実行し、必要なテーブルを作成します。

## 開発

### ローカルでの開発

各サービスディレクトリで個別に開発できます：

```bash
cd services/auth-service
npm install
npm run dev
```

### サービスの再ビルド

```bash
# 特定のサービスを再ビルド
docker-compose build auth-service

# 全サービスを再ビルド
docker-compose build

# キャッシュを使わずに再ビルド
docker-compose build --no-cache
```

## API エンドポイント

### 認証 (Auth Service)

- `POST /auth/register` - ユーザー登録
- `POST /auth/login` - ログイン
- `POST /auth/logout` - ログアウト
- `POST /auth/refresh` - トークンリフレッシュ
- `POST /auth/forgot-password` - パスワードリセット要求
- `POST /auth/reset-password` - パスワードリセット
- `GET /auth/verify-email` - メール認証

### 企業データ (Data Ingestion Service)

- `GET /companies` - 企業一覧取得
- `GET /companies/:id` - 企業詳細取得
- `POST /companies/search` - 企業検索
- `POST /ingestion/start` - データ取り込み開始
- `GET /ingestion/status/:jobId` - 取り込みステータス確認

### 分析 (Analysis Service)

- `POST /analysis/financial-metrics` - 財務指標分析
- `POST /analysis/time-series` - 時系列分析
- `POST /analysis/peer-comparison` - 同業他社比較
- `GET /analysis/results/:id` - 分析結果取得

### レポート (Report Generator Service)

- `POST /reports/generate` - レポート生成
- `GET /reports` - レポート一覧
- `GET /reports/:id` - レポートダウンロード
- `DELETE /reports/:id` - レポート削除

## トラブルシューティング

### コンテナが起動しない

```bash
# コンテナの状態確認
docker-compose ps

# エラーログの確認
docker-compose logs [service-name]
```

### データベース接続エラー

```bash
# PostgreSQLコンテナに接続
docker exec -it edinet-postgres psql -U edinet_user -d edinet_analysis

# 接続テスト
\dt
```

### ポート競合

使用ポートが既に使用されている場合は、`.env`ファイルでポート番号を変更してください。

## データベース管理

pgAdminが`http://localhost:5050`で利用可能です：
- Email: `admin@company-analyzer.com`
- Password: `admin`

## 監視とログ

各サービスのログは以下のコマンドで確認できます：

```bash
# リアルタイムログ表示
docker-compose logs -f [service-name]

# 過去のログ表示
docker-compose logs --tail=100 [service-name]
```

## バックアップ

### データベースバックアップ

```bash
# バックアップ作成
docker exec edinet-postgres pg_dump -U edinet_user edinet_analysis > backup.sql

# リストア
docker exec -i edinet-postgres psql -U edinet_user edinet_analysis < backup.sql
```

## セキュリティ

- 本番環境では必ず強力なパスワードとシークレットキーを使用してください
- HTTPS/TLSを有効にしてください
- ファイアウォールで不要なポートを閉じてください
- 定期的にセキュリティアップデートを適用してください

## ライセンス

MIT License