# EDINET Analysis System

EDINET（金融庁の電子開示システム）のデータを分析し、企業の財務分析レポートを自動生成するマイクロサービスベースのシステムです。

## 機能概要

- **データ取得**: EDINETから企業の財務データを自動取得・解析
- **財務分析**: ROE、ROA、成長率などの財務指標を自動計算
- **比較分析**: 同業他社との比較、時系列分析
- **レポート生成**: PDF/HTML形式での分析レポート自動生成
- **AI分析**: Claude APIを使用した定性的分析（オプション）

## システム構成

### マイクロサービス

1. **API Gateway** (Port 8000)
   - 全てのリクエストのエントリーポイント
   - 認証・認可の管理
   - ルーティング

2. **Auth Service** (Port 3001)
   - ユーザー認証
   - JWT トークン管理

3. **Data Ingestion Service** (Port 3002)
   - EDINETデータの取得・解析
   - CSV/XBRLファイルのパース
   - データベースへの保存

4. **Analysis Service** (Port 3003)
   - 財務指標の計算
   - 時系列分析
   - 業界比較分析

5. **Report Generator Service** (Port 3004)
   - HTML/PDFレポート生成
   - チャート生成
   - テンプレート管理

### データベース

- **PostgreSQL**: メインデータストア
- **Redis**: キャッシュ、ジョブキュー

## セットアップ

### 前提条件

- Node.js 18+
- Docker & Docker Compose
- PostgreSQL 15+
- Redis 7+

### インストール

```bash
# リポジトリのクローン
git clone <repository-url>
cd edinet-analysis-system

# 依存関係のインストール
npm install

# 環境変数の設定
cp .env.example .env
# .envファイルを編集して必要な設定を行う

# データベースの初期化
docker-compose up -d postgres redis
npm run db:migrate
```

### サービスの起動

```bash
# 全サービスを起動
./scripts/start-services.sh

# または個別に起動
cd services/auth-service && npm run dev
cd services/data-ingestion && npm run dev
cd services/analysis-service && npm run dev
cd services/report-generator && npm run dev
cd api-gateway && npm run dev
```

## 使い方

### 1. データの取り込み

```bash
# 2018年のデータを取り込む
curl -X POST http://localhost:8000/api/ingestion/ingest/2018 \
  -H "Authorization: Bearer YOUR_TOKEN"

# 全年度のデータを取り込む
curl -X POST http://localhost:8000/api/ingestion/ingest-all \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. 企業の検索

```bash
# 企業一覧を取得
curl http://localhost:8000/api/companies \
  -H "Authorization: Bearer YOUR_TOKEN"

# 企業を検索
curl -X POST http://localhost:8000/api/companies/search \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "トヨタ"}'
```

### 3. 財務分析の実行

```bash
# 財務指標の計算
curl -X POST http://localhost:8000/api/analysis/calculate/1 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"fiscalYear": 2023, "fiscalPeriod": "FY"}'
```

### 4. レポートの生成

```bash
# PDFレポートの生成
curl -X POST http://localhost:8000/api/reports/generate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": 1,
    "fiscalYear": 2023,
    "fiscalPeriod": "FY",
    "format": "pdf"
  }'
```

## API ドキュメント

### 認証エンドポイント

- `POST /api/auth/login` - ログイン
- `POST /api/auth/register` - ユーザー登録
- `POST /api/auth/refresh` - トークンリフレッシュ

### 企業情報エンドポイント

- `GET /api/companies` - 企業一覧
- `GET /api/companies/:id` - 企業詳細
- `POST /api/companies/search` - 企業検索

### 分析エンドポイント

- `POST /api/analysis/calculate/:companyId` - 財務指標計算
- `POST /api/analysis/compare` - 企業比較
- `GET /api/analysis/time-series/:companyId` - 時系列データ
- `POST /api/analysis/trends/:companyId` - トレンド分析

### レポートエンドポイント

- `POST /api/reports/generate` - レポート生成
- `GET /api/reports/history/:companyId` - レポート履歴
- `GET /api/reports/download/:reportId` - レポートダウンロード

## 開発

### テストの実行

```bash
# 全テストを実行
npm test

# サービス別にテスト
cd services/analysis-service && npm test
```

### ビルド

```bash
# 全サービスをビルド
npm run build

# Dockerイメージのビルド
docker-compose build
```

### デプロイ

```bash
# プロダクション環境へのデプロイ
docker-compose -f docker-compose.prod.yml up -d
```

## トラブルシューティング

### ポートが使用中の場合

```bash
# 使用中のポートを確認
lsof -i :8000

# プロセスを終了
kill -9 <PID>
```

### データベース接続エラー

```bash
# PostgreSQLの状態を確認
docker ps | grep postgres

# ログを確認
docker logs edinet-postgres
```

### サービスが起動しない場合

```bash
# ログを確認
tail -f /tmp/<service-name>.log

# 依存関係を再インストール
rm -rf node_modules package-lock.json
npm install
```

## ライセンス

MIT License

## 貢献

プルリクエストを歓迎します。大きな変更の場合は、まずissueを作成して変更内容を議論してください。