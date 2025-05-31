# Company Analyzer - EDINET財務分析システム

日本の上場企業の財務データ（EDINET）を分析するためのフルスタックWebアプリケーションです。

## システム構成

```
company-analyzer/
├── frontend/          # React + TypeScript フロントエンド
├── backend/           # Node.js マイクロサービス バックエンド
├── resource/          # EDINETデータファイル
└── docs/             # ドキュメント
```

## 主な機能

- 📊 **財務データ分析**: EDINETから取得した有価証券報告書の分析
- 📈 **時系列分析**: 企業の財務指標の推移を可視化
- 🔍 **企業検索**: 証券コード、企業名での検索
- 📑 **レポート生成**: 分析結果のPDF/HTMLレポート出力
- 🔐 **認証・認可**: セキュアなユーザー管理

## 技術スタック

### フロントエンド
- React 18
- TypeScript
- Vite
- TailwindCSS
- React Query
- Chart.js

### バックエンド
- Node.js + Express
- TypeScript
- PostgreSQL
- Redis
- Docker & Docker Compose
- マイクロサービスアーキテクチャ

## クイックスタート

### 必要な環境
- Docker & Docker Compose
- Node.js 20+
- npm または yarn

### セットアップ手順

1. **リポジトリのクローン**
```bash
git clone [repository-url]
cd company-analyzer
```

2. **環境変数の設定**

バックエンド:
```bash
cd backend
cp .env.example .env
# .envファイルを編集して必要な値を設定
```

フロントエンド:
```bash
cd ../frontend
cp .env.example .env
# .envファイルを編集（通常はデフォルト値でOK）
```

3. **Dockerコンテナの起動**

```bash
# プロジェクトルートから
docker-compose up -d
```

これにより以下のサービスが起動します：
- フロントエンド: http://localhost:5173
- バックエンドAPI: http://localhost:3000
- pgAdmin: http://localhost:5050

4. **初期データの投入**（オプション）

EDINETデータがある場合は、Data Ingestion APIを使用してインポートできます。

## 開発

### フロントエンドの開発

```bash
cd frontend
npm install
npm run dev
```

### バックエンドの開発

```bash
cd backend
# 各サービスディレクトリで
npm install
npm run dev
```

### ビルド

```bash
# フロントエンドビルド
cd frontend
npm run build

# Dockerイメージのビルド
docker-compose build
```

## プロジェクト構造

### フロントエンド (`frontend/`)
```
src/
├── components/     # 再利用可能なUIコンポーネント
├── pages/         # ページコンポーネント
├── services/      # API通信ロジック
├── contexts/      # React Context
├── hooks/         # カスタムフック
└── types/         # TypeScript型定義
```

### バックエンド (`backend/`)
```
├── api-gateway/           # APIゲートウェイ
├── services/
│   ├── auth-service/      # 認証サービス
│   ├── analysis-service/  # 分析サービス
│   ├── data-ingestion/    # データ取込サービス
│   └── report-generator/  # レポート生成サービス
└── database/             # データベーススキーマ
```

## API ドキュメント

詳細なAPIドキュメントは [backend/README.md](backend/README.md) を参照してください。

## データソース

- EDINET: 金融庁が提供する有価証券報告書等の開示書類データ
- 株価データ: カブプラスなどから取得した日次株価データ

## セキュリティ

- JWT認証
- HTTPS通信（本番環境）
- 環境変数による機密情報管理
- CORS設定
- Rate Limiting

## トラブルシューティング

### コンテナが起動しない
```bash
docker-compose logs -f [service-name]
```

### データベース接続エラー
- PostgreSQLコンテナが正常に起動しているか確認
- 環境変数の設定を確認

### フロントエンドがAPIに接続できない
- `VITE_API_URL`の設定を確認
- CORSの設定を確認

## Contributing

1. このリポジトリをフォーク
2. 機能ブランチを作成 (`git checkout -b feature/AmazingFeature`)
3. 変更をコミット (`git commit -m 'Add some AmazingFeature'`)
4. ブランチにプッシュ (`git push origin feature/AmazingFeature`)
5. プルリクエストを作成

## ライセンス

MIT License

## お問い合わせ

プロジェクトに関する質問や提案は、Issueを作成してください。