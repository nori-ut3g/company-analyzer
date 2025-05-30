# EDINET企業業績分析レポートシステム要件定義書

## 1. プロジェクト概要

### 1.1 システム名
EDINET企業業績分析レポートシステム

### 1.2 目的
EDINETから取得した財務データを基に企業業績を分析し、投資判断に必要な情報をPDF・HTML形式でレポート化するWebサービスの構築

### 1.3 スコープ
- EDINETデータの取得・解析・DB格納
- 株価データ等外部データとの統合
- AI（Claude Code）を活用した分析レポート自動生成
- PDF・HTMLレポート出力機能
- Web UI提供

## 2. システム全体アーキテクチャ

### 2.1 マイクロサービス構成
```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   Frontend      │  │   API Gateway   │  │   Auth Service  │
│   (React/Vue)   │  │    (Express)    │  │   (JWT/OAuth)   │
└─────────────────┘  └─────────────────┘  └─────────────────┘
         │                      │                      │
         └──────────────────────┼──────────────────────┘
                               │
         ┌──────────────────────┼──────────────────────┐
         │                      │                      │
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   Data          │  │   Analysis      │  │   Report        │
│   Ingestion     │  │   Service       │  │   Generator     │
│   Service       │  │                 │  │   Service       │
└─────────────────┘  └─────────────────┘  └─────────────────┘
         │                      │                      │
         └──────────────────────┼──────────────────────┘
                               │
                    ┌─────────────────┐
                    │   PostgreSQL    │
                    │   Database      │
                    └─────────────────┘
```

### 2.2 技術スタック
- **Frontend**: React/Vue.js + TypeScript
- **Backend**: Node.js + Express/Fastify
- **Database**: PostgreSQL (主データ) + Redis (キャッシュ)
- **Container**: Docker + Docker Compose
- **Deployment**: Kubernetes or Docker Swarm
- **CI/CD**: GitHub Actions

## 3. 機能要件

### 3.1 データ取得・管理機能

#### 3.1.1 EDINETデータ取得サービス
**概要**: EDINETからCSVデータを取得し、構造化してDB格納

**機能詳細**:
- EDINET APIからの有価証券報告書データ取得
- CSVファイルの解析・正規化
- データ品質チェック（欠損値、異常値検出）
- 増分データ取得（差分更新）
- エラーハンドリング・リトライ機能

**入力**: EDINET API、CSVファイル
**出力**: 構造化された財務データ（DB格納）

#### 3.1.2 外部データ統合サービス
**概要**: 株価データ等の外部データソースとの統合

**機能詳細**:
- 株価データAPI連携（Yahoo Finance、Alpha Vantage等）
- 経済指標データ取得
- データの正規化・標準化
- データ統合・マッピング処理

**入力**: 各種外部API
**出力**: 統合データ（DB格納）

### 3.2 データベース設計

#### 3.2.1 主要テーブル構成
```sql
-- 企業マスタ
companies (
    company_id UUID PRIMARY KEY,
    edinet_code VARCHAR(6) UNIQUE,
    company_name VARCHAR(255),
    industry_code VARCHAR(10),
    listing_market VARCHAR(50),
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- 財務データ
financial_statements (
    statement_id UUID PRIMARY KEY,
    company_id UUID REFERENCES companies(company_id),
    period_end DATE,
    statement_type VARCHAR(20), -- BS, PL, CF
    account_item VARCHAR(100),
    amount DECIMAL(15,2),
    unit VARCHAR(10),
    created_at TIMESTAMP
);

-- 株価データ
stock_prices (
    price_id UUID PRIMARY KEY,
    company_id UUID REFERENCES companies(company_id),
    trade_date DATE,
    open_price DECIMAL(10,2),
    high_price DECIMAL(10,2),
    low_price DECIMAL(10,2),
    close_price DECIMAL(10,2),
    volume BIGINT,
    created_at TIMESTAMP
);

-- 分析結果
analysis_results (
    analysis_id UUID PRIMARY KEY,
    company_id UUID REFERENCES companies(company_id),
    analysis_type VARCHAR(50),
    analysis_period VARCHAR(20),
    metrics JSONB,
    insights TEXT,
    created_at TIMESTAMP
);
```

### 3.3 分析エンジン

#### 3.3.1 財務分析サービス
**概要**: 財務データの定量分析

**機能詳細**:
- 収益性分析（ROE, ROA, 利益率等）
- 安全性分析（自己資本比率, 流動比率等）
- 成長性分析（売上成長率, 利益成長率等）
- 効率性分析（総資産回転率, 棚卸資産回転率等）
- 同業他社比較分析
- 時系列トレンド分析

**入力**: 財務データ
**出力**: 分析結果（数値・グラフデータ）

#### 3.3.2 AI分析サービス（Claude Code連携）
**概要**: Claude Codeを活用した定性分析・レポート生成

**機能詳細**:
- 財務データの解釈・考察生成
- 業界動向分析
- 投資判断サポート情報生成
- リスク要因分析
- 将来予測・展望生成

**入力**: 分析結果、市場データ
**出力**: 分析レポート（テキスト）

### 3.4 レポート生成機能

#### 3.4.1 レポートテンプレート管理
**機能詳細**:
- HTMLテンプレート管理
- PDFテンプレート管理
- カスタムレポート作成機能
- レポート項目設定

#### 3.4.2 レポート出力サービス
**機能詳細**:
- HTML形式レポート生成
- PDF形式レポート生成（Puppeteer使用）
- グラフ・チャート生成（Chart.js/D3.js）
- レポート配信機能（メール送信）

### 3.5 Web UI機能

#### 3.5.1 企業検索・選択機能
- 企業名・銘柄コード検索
- 業界別企業一覧
- お気に入り企業管理

#### 3.5.2 分析結果表示機能
- ダッシュボード表示
- インタラクティブグラフ表示
- 比較分析表示

#### 3.5.3 レポート管理機能
- レポート履歴管理
- レポート設定
- レポートダウンロード

## 4. 非機能要件

### 4.1 性能要件
- レスポンス時間: API応答 < 2秒
- スループット: 同時ユーザー数 100人
- データ処理: 1日1回のバッチ処理でEDINETデータ更新

### 4.2 可用性要件
- システム稼働率: 99.5%以上
- 障害復旧時間: 4時間以内
- データバックアップ: 日次自動バックアップ

### 4.3 セキュリティ要件
- 認証: JWT認証
- API保護: Rate Limiting実装
- データ暗号化: DB保存時暗号化
- HTTPS通信必須

### 4.4 運用要件
- ログ管理: 構造化ログ出力
- 監視: ヘルスチェック・メトリクス監視
- アラート: 異常検知時の自動通知

## 5. 開発手順・フェーズ

### Phase 1: 基盤構築（4-6週間）
1. **データベース設計・構築**
   - PostgreSQL環境構築
   - テーブル設計・作成
   - 基本的なCRUD API実装

2. **EDINETデータ取得サービス開発**
   - EDINET API連携機能実装
   - CSV解析・DB格納機能実装
   - Docker化

### Phase 2: 分析機能開発（4-6週間）
1. **財務分析エンジン開発**
   - 基本的な財務指標計算機能
   - 分析結果格納機能
   - Docker化

2. **Claude Code連携基盤**
   - API連携インフラ構築
   - 分析結果テキスト化機能
   - Docker化

### Phase 3: レポート機能開発（3-4週間）
1. **レポート生成サービス開発**
   - HTMLレポート生成機能
   - PDFレポート生成機能
   - テンプレート管理機能
   - Docker化

### Phase 4: フロントエンド開発（4-5週間）
1. **Web UI開発**
   - 企業検索・選択画面
   - 分析結果表示画面
   - レポート管理画面
   - Docker化

### Phase 5: 統合・テスト（2-3週間）
1. **システム統合**
   - 各サービス間連携テスト
   - Docker Compose設定
   - CI/CDパイプライン構築

2. **本番環境構築**
   - インフラ環境構築
   - デプロイ・動作確認

## 6. Dockerコンテナ構成

### 6.1 各サービスのコンテナ
```yaml
services:
  # フロントエンド
  frontend:
    build: ./frontend
    ports: ["3000:3000"]
    
  # APIゲートウェイ
  api-gateway:
    build: ./api-gateway
    ports: ["8000:8000"]
    
  # データ取得サービス
  data-ingestion:
    build: ./data-ingestion
    environment:
      - DB_HOST=postgres
      
  # 分析サービス
  analysis-service:
    build: ./analysis-service
    environment:
      - DB_HOST=postgres
      
  # レポート生成サービス
  report-generator:
    build: ./report-generator
    environment:
      - DB_HOST=postgres
      
  # データベース
  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=edinet_analysis
    volumes:
      - postgres_data:/var/lib/postgresql/data
      
  # キャッシュ
  redis:
    image: redis:7-alpine
```

## 7. Claude Code活用計画

### 7.1 並列開発項目
1. **データ取得サービス** - EDINETデータ処理ロジック
2. **財務分析エンジン** - 指標計算アルゴリズム
3. **レポート生成サービス** - テンプレート処理ロジック
4. **Web APIサービス** - REST API実装
5. **フロントエンドコンポーネント** - React/Vueコンポーネント

### 7.2 AI分析連携
- Claude CodeのAPI経由でのテキスト分析
- 財務データの定性的解釈生成
- 投資判断サポート情報の自動生成

## 8. 運用・保守計画

### 8.1 監視項目
- システムリソース使用率
- API応答時間
- データ取得処理状況
- エラー発生状況

### 8.2 保守項目
- データベース定期メンテナンス
- ログファイル管理
- セキュリティアップデート
- 機能追加・改善

## 9. 今後の拡張計画

### 9.1 データソース拡張
- 決算説明会資料の自動取得・分析
- ニュース記事の感情分析
- ESG情報の統合

### 9.2 機能拡張
- 機械学習による株価予測
- ポートフォリオ最適化機能
- リアルタイム分析・アラート機能

---

## 次のアクション
1. 各フェーズの詳細設計書作成
2. Docker環境構築
3. Claude Codeによる並列開発開始