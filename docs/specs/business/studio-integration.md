# MICHE STUDIO 連携仕様

## STUDIO の役割

**MICHE STUDIO**は、IP（知的財産）を安全に登録・共有し、クリエイターが安心して二次創作や商品化に利用できる**知財流通の中核プラットフォーム**。

### 主要機能

1. **IP登録・証明**
   - IPホルダーがキャラクター・世界観を公式登録
   - ブロックチェーンまたは信頼できる第三者機関による証明
   - タイムスタンプ付き登録証明書の発行

2. **ライセンス管理**
   - 利用条件の設定（商用利用可/不可、改変可/不可など）
   - 収益分配比率の設定（IPホルダー:クリエイター = 50:50など）
   - ライセンス期間・地域制限

3. **収益分配**
   - 全プラットフォームからの収益を集約
   - 自動で分配計算・送金
   - 透明な収益レポート

4. **KYC・本人確認**
   - IPホルダー・クリエイターの本人確認
   - 税務情報の管理
   - 不正利用防止

5. **使用履歴・侵害申告**
   - すべての使用記録を保存
   - 侵害申告の受付・対応
   - 証拠としての記録提供

---

## VIDEO プラットフォームとの連携フロー

### 1. IPライセンス選択フロー

```
[動画アップロード画面]
    ↓
[STUDIO API呼び出し]
GET /api/ip-licenses?user_id={creator_id}
    ↓
[利用可能なIPライセンス一覧を取得]
    ↓
[クリエイターがIPライセンスを選択]
    ↓
[VIDEO プラットフォームに保存]
video.ip_license_id = "ip_xxxxx"
```

**APIレスポンス例:**
```json
{
  "licenses": [
    {
      "id": "ip_001",
      "name": "ファンタジーワールドキャラクター",
      "thumbnail_url": "https://cdn.example.com/ip/ip_001.jpg",
      "license_type": "商用利用可",
      "revenue_split": {
        "ip_holder": 50,
        "creator": 50
      },
      "restrictions": {
        "adult_content": false,
        "modifications": true
      }
    }
  ]
}
```

### 2. 視聴数・収益情報の送信

**送信タイミング:**
- 動画視聴が記録されたとき
- 投げ銭が発生したとき
- サブスク収益が確定したとき

**送信データ:**
```json
{
  "event_type": "video_view",
  "platform": "miche_video",
  "video_id": "vid_xxxxx",
  "ip_license_id": "ip_001",
  "creator_id": "usr_xxxxx",
  "viewer_id": "usr_yyyyy",
  "revenue": {
    "amount": 10,
    "currency": "JPY",
    "type": "subscription"
  },
  "metadata": {
    "watch_duration": 180,
    "total_duration": 300,
    "completion_rate": 0.6
  },
  "timestamp": "2025-01-01T12:00:00Z"
}
```

**STUDIO側の処理:**
1. 収益データを記録
2. IPライセンス情報を照会
3. 分配比率に基づいて計算（例: IP 50%, Creator 50%）
4. プラットフォーム手数料（30%）を差し引く
5. 保留期間（14日間）後に出金可能にする

### 3. IP侵害申告フロー

```
[視聴者が不正利用を発見]
    ↓
[VIDEO プラットフォームで通報]
    ↓
[STUDIO APIに侵害申告を送信]
POST /api/violations/report
    ↓
[STUDIO側で審査]
    ↓
[結果をVIDEO プラットフォームに通知]
    ↓
[該当動画の削除 or 警告]
```

**侵害申告データ:**
```json
{
  "video_id": "vid_xxxxx",
  "ip_license_id": "ip_001",
  "reporter_id": "usr_zzzzz",
  "violation_type": "unauthorized_use",
  "evidence_urls": [
    "https://cdn.example.com/evidence/screenshot1.jpg"
  ],
  "description": "このIPライセンスは使用許可を得ていません"
}
```

---

## APIエンドポイント仕様

### STUDIO → VIDEO

**1. IPライセンス一覧取得**
```
GET /api/ip-licenses
Query Parameters:
  - user_id: クリエイターのユーザーID
  - type: ライセンスタイプ（商用/非商用）
  - adult_allowed: 成人コンテンツ可否

Response:
{
  "licenses": [...],
  "total": 10,
  "page": 1,
  "limit": 20
}
```

**2. IPライセンス詳細取得**
```
GET /api/ip-licenses/:id

Response:
{
  "id": "ip_001",
  "name": "ファンタジーワールドキャラクター",
  "description": "魔法の世界を舞台にしたキャラクター群",
  "ip_holder": {
    "id": "usr_holder",
    "name": "田中太郎"
  },
  "license_terms": {
    "commercial_use": true,
    "modifications": true,
    "adult_content": false,
    "revenue_split": { "ip_holder": 50, "creator": 50 }
  },
  "usage_count": 1234,
  "total_revenue": 5000000
}
```

### VIDEO → STUDIO

**1. 視聴数・収益情報の送信**
```
POST /api/analytics/events
Body:
{
  "event_type": "video_view" | "tip" | "subscription",
  "platform": "miche_video",
  "video_id": "vid_xxxxx",
  "ip_license_id": "ip_001",
  "creator_id": "usr_xxxxx",
  "revenue": { "amount": 10, "currency": "JPY" },
  "timestamp": "2025-01-01T12:00:00Z"
}

Response:
{
  "success": true,
  "message": "イベントを記録しました",
  "event_id": "evt_xxxxx"
}
```

**2. IP侵害申告**
```
POST /api/violations/report
Body:
{
  "video_id": "vid_xxxxx",
  "ip_license_id": "ip_001",
  "reporter_id": "usr_zzzzz",
  "violation_type": "unauthorized_use",
  "evidence_urls": ["..."],
  "description": "説明"
}

Response:
{
  "success": true,
  "case_id": "case_xxxxx",
  "message": "申告を受け付けました。審査には3-5営業日かかります"
}
```

**3. 侵害申告ステータス確認**
```
GET /api/violations/:case_id

Response:
{
  "case_id": "case_xxxxx",
  "status": "pending" | "approved" | "rejected",
  "resolution": "動画削除" | "警告",
  "reviewed_at": "2025-01-05T12:00:00Z"
}
```

---

## 収益分配の詳細

### 分配計算例

**前提:**
- 動画視聴によるサブスク収益: ¥100
- プラットフォーム手数料: 30%
- IP分配比率: IPホルダー 50%, クリエイター 50%

**計算:**
```
1. プラットフォーム手数料を差し引く
   ¥100 - ¥30 (30%) = ¥70

2. IPホルダーとクリエイターで分配
   IPホルダー: ¥70 × 50% = ¥35
   クリエイター: ¥70 × 50% = ¥35
```

### 分配タイムライン

```
Day 0: 収益発生
  ↓
Day 1-14: 保留期間（チャージバック・不正対策）
  ↓
Day 15: 出金可能に
  ↓
クリエイター/IPホルダーが出金申請
  ↓
3-5営業日で銀行振込
```

### 最低出金額

- **銀行振込**: ¥3,000以上
- **PayPal**: ¥1,000以上
- **Stripe Connect**: ¥500以上

---

## データ整合性の保証

### 1. トランザクション管理

**VIDEO側:**
```sql
BEGIN TRANSACTION;

-- 動画視聴を記録
INSERT INTO video_views (video_id, user_id, ip_license_id, ...)
VALUES (...);

-- 収益を記録
INSERT INTO earnings (video_id, ip_license_id, amount, ...)
VALUES (...);

-- STUDIO APIにイベント送信
-- （失敗時はロールバック）

COMMIT;
```

### 2. リトライメカニズム

STUDIOへのAPI送信が失敗した場合:
1. イベントをキューに保存
2. 指数バックオフでリトライ（1分後、5分後、30分後...）
3. 24時間以内に成功しない場合はアラート

### 3. データ監査

- 毎日深夜にVIDEOとSTUDIOのデータを照合
- 差分があればアラート
- 手動で修正または自動リコンサイル

---

## セキュリティ

### API認証

**相互認証:**
- VIDEO → STUDIO: APIキー（シークレット管理）
- STUDIO → VIDEO: 署名付きリクエスト（HMAC-SHA256）

### データ暗号化

- 送信データ: TLS 1.3
- 保存データ: AES-256暗号化
- APIキー: AWS Secrets Manager

### レート制限

- VIDEO → STUDIO: 1000 requests/分
- STUDIO → VIDEO: 500 requests/分

---

## モニタリング

### 監視項目

1. **API成功率**
   - 目標: > 99.9%
   - アラート: 95%未満

2. **API応答時間**
   - 目標: < 500ms (P95)
   - アラート: > 1000ms

3. **データ整合性**
   - 日次照合エラー率: < 0.1%

4. **収益分配精度**
   - 目標: 100%正確
   - アラート: 差分検出時に即座通知

---

## 今後の拡張

### フェーズ2（6ヶ月後）

- **リアルタイムダッシュボード** - STUDIO側でVIDEO収益をリアルタイム表示
- **自動税務計算** - 国別の税率を適用して源泉徴収
- **NFT連携** - IPライセンスをNFT化

### フェーズ3（1年後）

- **マルチプラットフォーム対応** - SHORTS, COMIC, EC との統合
- **スマートコントラクト** - ブロックチェーンベースの自動分配
- **グローバル展開** - 多通貨・多言語対応
