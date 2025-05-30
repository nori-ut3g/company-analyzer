# Company Analyzer - EDINET財務分析システム

企業の財務データを自動分析し、レポートを生成するフルスタックアプリケーションです。

## 概要

このシステムは、金融庁のEDINETデータを解析し、企業の財務分析を自動化します。主な機能：

- EDINETデータの自動取得・解析
- 財務指標の計算（ROE、ROA、成長率など）
- 時系列分析とトレンド予測
- PDF/HTMLレポートの自動生成
- Webベースのダッシュボード

## 技術スタック

### バックエンド
- Node.js + TypeScript
- Express.js (API Gateway)
- PostgreSQL (データベース)
- Redis (キャッシュ・ジョブキュー)
- Bull (ジョブ処理)
- Puppeteer (PDF生成)

### フロントエンド
- React 18 + TypeScript
- Vite (ビルドツール)
- TanStack Query (データフェッチング)
- Tailwind CSS (スタイリング)
- Recharts (グラフ表示)
- React Router v6 (ルーティング)

## システム構成

```
company-analyzer/
├── docs/                    # ドキュメント
├── resource/               # EDINETデータ
│   └── EDINET/
│       ├── 2018/
│       │   ├── files/      # ZIPファイル
│       │   └── downloaded_list.csv
│       └── ...
└── edinet-analysis-system/ # メインアプリケーション
    ├── api-gateway/        # APIゲートウェイ
    ├── services/           # マイクロサービス
    │   ├── auth-service/
    │   ├── data-ingestion/
    │   ├── analysis-service/
    │   └── report-generator/
    ├── frontend/           # Reactフロントエンド
    ├── database/           # DB初期化スクリプト
    └── scripts/            # 起動スクリプト
```

## セットアップ

### 前提条件

- Node.js 18以上
- Docker & Docker Compose
- Git

### インストール手順

1. リポジトリのクローン
```bash
git clone <repository-url>
cd company-analyzer/edinet-analysis-system
```

2. 依存関係のインストール
```bash
# 各サービスの依存関係をインストール
npm install
```

3. 環境変数の設定
```bash
# 各サービスの.envファイルを設定
cp .env.example .env
```

4. データベースの起動
```bash
docker-compose up -d postgres redis
```

5. データベースの初期化
```bash
docker exec -i edinet-postgres psql -U postgres -d edinet_analysis < database/init.sql
```

## 起動方法

### 開発環境

1. 全サービスを起動
```bash
./scripts/start-services.sh
```

2. フロントエンドを起動
```bash
cd frontend
npm install
npm run dev
```

3. ブラウザでアクセス
```
http://localhost:3000
```

### 本番環境

```bash
docker-compose up -d
```

## 使用方法

### 1. ログイン
デモアカウント:
- Email: demo@example.com
- Password: password123

### 2. データの取り込み
```bash
# 2018年のデータを取り込む
curl -X POST http://localhost:8000/api/ingestion/ingest/2018 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. 財務分析の実行
1. 企業一覧から分析対象を選択
2. 「分析を実行」ボタンをクリック
3. 分析結果が表示される

### 4. レポート生成
1. レポートページで「新規レポート生成」
2. レポート種別と形式を選択
3. 生成完了後、ダウンロード可能

## API エンドポイント

### 認証
- `POST /api/auth/login` - ログイン
- `POST /api/auth/register` - ユーザー登録

### 企業情報
- `GET /api/companies` - 企業一覧
- `GET /api/companies/:id` - 企業詳細
- `POST /api/companies/search` - 企業検索

### 分析
- `POST /api/analysis/calculate/:companyId` - 財務指標計算
- `GET /api/analysis/time-series/:companyId` - 時系列データ
- `POST /api/analysis/trends/:companyId` - トレンド分析

### レポート
- `POST /api/reports/:companyId/generate` - レポート生成
- `GET /api/reports/download/:reportId` - レポートダウンロード

## トラブルシューティング

### サービスが起動しない
```bash
# ログを確認
tail -f /tmp/<service-name>.log

# ポートの確認
lsof -i :8000
```

### データベース接続エラー
```bash
# PostgreSQLの状態確認
docker ps | grep postgres

# 接続テスト
psql -h localhost -U postgres -d edinet_analysis
```

## 開発

### テスト実行
```bash
npm test
```

### ビルド
```bash
npm run build
```

### リンター
```bash
npm run lint
```

## ライセンス

MIT License

## 貢献

プルリクエストを歓迎します。大きな変更の場合は、まずissueを作成してください。

## サポート

問題が発生した場合は、GitHubのissueを作成してください。