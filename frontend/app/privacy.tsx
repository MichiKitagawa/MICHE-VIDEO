// プライバシーポリシーページ

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';

export default function PrivacyScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  return (
    <View style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>プライバシーポリシー</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* コンテンツ */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, isMobile && styles.contentMobile]}
      >
        <Text style={styles.lastUpdated}>最終更新日: 2025年1月1日</Text>

        <Text style={styles.intro}>
          MICHE（以下「当社」といいます）は、ユーザーの個人情報の保護を重要視し、適切に取り扱うことをお約束します。本プライバシーポリシーは、当社が提供する動画配信サービス「MICHE」（以下「本サービス」といいます）における個人情報の取り扱いについて説明するものです。
        </Text>

        {/* 収集する個人情報 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. 収集する個人情報</Text>
          <Text style={styles.paragraph}>
            当社は、本サービスの提供にあたり、以下の個人情報を収集します。
          </Text>

          <View style={styles.subsection}>
            <Text style={styles.subsectionTitle}>1.1 アカウント登録時に提供される情報</Text>
            <View style={styles.listContainer}>
              <Text style={styles.listItem}>• ユーザー名</Text>
              <Text style={styles.listItem}>• メールアドレス</Text>
              <Text style={styles.listItem}>• パスワード（暗号化して保管）</Text>
              <Text style={styles.listItem}>• プロフィール情報（任意）</Text>
            </View>
          </View>

          <View style={styles.subsection}>
            <Text style={styles.subsectionTitle}>1.2 本サービス利用時に自動的に収集される情報</Text>
            <View style={styles.listContainer}>
              <Text style={styles.listItem}>• IPアドレス</Text>
              <Text style={styles.listItem}>• デバイス情報（機種、OS、ブラウザ情報等）</Text>
              <Text style={styles.listItem}>• 視聴履歴、検索履歴</Text>
              <Text style={styles.listItem}>• アプリ使用状況データ</Text>
              <Text style={styles.listItem}>• 位置情報（許可された場合のみ）</Text>
            </View>
          </View>

          <View style={styles.subsection}>
            <Text style={styles.subsectionTitle}>1.3 決済に関する情報</Text>
            <View style={styles.listContainer}>
              <Text style={styles.listItem}>• クレジットカード情報（決済代行業者経由で取得）</Text>
              <Text style={styles.listItem}>• 請求先住所</Text>
              <Text style={styles.listItem}>• 取引履歴</Text>
            </View>
          </View>

          <View style={styles.subsection}>
            <Text style={styles.subsectionTitle}>1.4 クリエイター情報（コンテンツ作成者のみ）</Text>
            <View style={styles.listContainer}>
              <Text style={styles.listItem}>• 本人確認書類</Text>
              <Text style={styles.listItem}>• 銀行口座情報（収益の振込先）</Text>
              <Text style={styles.listItem}>• PayPal情報（選択した場合）</Text>
              <Text style={styles.listItem}>• 収益関連データ</Text>
            </View>
          </View>
        </View>

        {/* 利用目的 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. 個人情報の利用目的</Text>
          <Text style={styles.paragraph}>
            当社は、収集した個人情報を以下の目的で利用します。
          </Text>
          <View style={styles.listContainer}>
            <Text style={styles.listItem}>• 本サービスの提供、運営、改善</Text>
            <Text style={styles.listItem}>• ユーザー認証およびアカウント管理</Text>
            <Text style={styles.listItem}>• コンテンツのパーソナライゼーション、レコメンデーション</Text>
            <Text style={styles.listItem}>• 決済処理および請求</Text>
            <Text style={styles.listItem}>• クリエイターへの収益分配</Text>
            <Text style={styles.listItem}>• カスタマーサポートの提供</Text>
            <Text style={styles.listItem}>• 不正利用の防止、セキュリティ対策</Text>
            <Text style={styles.listItem}>• サービスに関する通知やお知らせの送信</Text>
            <Text style={styles.listItem}>• マーケティング活動（オプトアウト可能）</Text>
            <Text style={styles.listItem}>• 統計データの作成および分析</Text>
            <Text style={styles.listItem}>• 法令遵守</Text>
          </View>
        </View>

        {/* 第三者提供 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. 個人情報の第三者提供</Text>
          <Text style={styles.paragraph}>
            当社は、以下の場合を除き、ユーザーの同意なく個人情報を第三者に提供することはありません。
          </Text>

          <View style={styles.subsection}>
            <Text style={styles.subsectionTitle}>3.1 決済代行業者への提供</Text>
            <Text style={styles.paragraph}>
              本サービスの決済処理のため、以下の決済代行業者に決済情報を提供します。
            </Text>
            <View style={styles.listContainer}>
              <Text style={styles.listItem}>
                • Stripe, Inc.（プレミアムプラン）{'\n'}
                提供情報: クレジットカード情報、請求先情報、取引履歴
              </Text>
              <Text style={styles.listItem}>
                • CCBill LLC（プレミアム+プラン）{'\n'}
                提供情報: クレジットカード情報、請求先情報、取引履歴、年齢確認情報
              </Text>
            </View>
            <Text style={styles.paragraph}>
              これらの決済代行業者は、独自のプライバシーポリシーに従って個人情報を取り扱います。
            </Text>
          </View>

          <View style={styles.subsection}>
            <Text style={styles.subsectionTitle}>3.2 法令に基づく開示</Text>
            <Text style={styles.paragraph}>
              法令に基づき開示が要求される場合、または公的機関から適法な要請を受けた場合
            </Text>
          </View>

          <View style={styles.subsection}>
            <Text style={styles.subsectionTitle}>3.3 事業承継</Text>
            <Text style={styles.paragraph}>
              合併、会社分割、事業譲渡その他の事由により事業の承継が行われる場合
            </Text>
          </View>
        </View>

        {/* Cookie */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Cookieおよび類似技術の使用</Text>
          <Text style={styles.paragraph}>
            本サービスでは、ユーザー体験の向上、アクセス解析、および広告配信のために、Cookieおよび類似の技術を使用します。
          </Text>
          <View style={styles.listContainer}>
            <Text style={styles.listItem}>
              • 必須Cookie: サービスの基本機能を提供するために必要
            </Text>
            <Text style={styles.listItem}>
              • 分析Cookie: サービスの使用状況を分析し、改善に役立てる
            </Text>
            <Text style={styles.listItem}>
              • 広告Cookie: ユーザーの興味に合わせた広告を表示
            </Text>
          </View>
          <Text style={styles.paragraph}>
            ユーザーは、ブラウザの設定によりCookieを無効化できますが、一部機能が制限される場合があります。
          </Text>
        </View>

        {/* データ保管期間 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. 個人情報の保管期間</Text>
          <Text style={styles.paragraph}>
            当社は、利用目的を達成するために必要な期間、または法令で定められた期間、個人情報を保管します。
          </Text>
          <View style={styles.listContainer}>
            <Text style={styles.listItem}>
              • アカウント情報: アカウント削除後30日間保管し、その後完全に削除
            </Text>
            <Text style={styles.listItem}>
              • 視聴履歴: アカウント削除と同時に削除（ユーザーはいつでも履歴を削除可能）
            </Text>
            <Text style={styles.listItem}>
              • 決済情報: 税法および会計法令に基づき、最大7年間保管
            </Text>
            <Text style={styles.listItem}>
              • クリエイター収益情報: 税法に基づき、最大7年間保管
            </Text>
          </View>
        </View>

        {/* ユーザーの権利 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. ユーザーの権利</Text>
          <Text style={styles.paragraph}>
            ユーザーは、自己の個人情報について以下の権利を有します。
          </Text>
          <View style={styles.listContainer}>
            <Text style={styles.listItem}>
              • アクセス権: 自己の個人情報の開示を請求する権利
            </Text>
            <Text style={styles.listItem}>
              • 訂正権: 不正確な個人情報の訂正を請求する権利
            </Text>
            <Text style={styles.listItem}>
              • 削除権: 個人情報の削除を請求する権利（一定の場合を除く）
            </Text>
            <Text style={styles.listItem}>
              • 利用停止権: 個人情報の利用停止を請求する権利
            </Text>
            <Text style={styles.listItem}>
              • データポータビリティ権: 個人情報をデータ形式で受け取る権利
            </Text>
          </View>
          <Text style={styles.paragraph}>
            これらの権利を行使する場合は、アプリ内の設定画面から操作するか、サポートまでご連絡ください。
          </Text>
        </View>

        {/* セキュリティ */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. セキュリティ対策</Text>
          <Text style={styles.paragraph}>
            当社は、個人情報の紛失、破壊、改ざん、不正アクセスを防止するため、適切な技術的および組織的なセキュリティ対策を講じています。
          </Text>
          <View style={styles.listContainer}>
            <Text style={styles.listItem}>• SSL/TLS暗号化通信</Text>
            <Text style={styles.listItem}>• パスワードの暗号化保管</Text>
            <Text style={styles.listItem}>• アクセス制御およびログ監視</Text>
            <Text style={styles.listItem}>• 定期的なセキュリティ監査</Text>
            <Text style={styles.listItem}>• 従業員への教育・研修</Text>
          </View>
        </View>

        {/* 未成年者 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. 未成年者の個人情報</Text>
          <Text style={styles.paragraph}>
            本サービスは18歳未満の方の利用を禁止しております。当社は、故意に18歳未満の方から個人情報を収集することはありません。
          </Text>
          <Text style={styles.paragraph}>
            18歳未満の方から個人情報が収集されたことが判明した場合、当社は速やかに当該情報を削除します。
          </Text>
        </View>

        {/* 国際転送 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>9. 国際的なデータ転送</Text>
          <Text style={styles.paragraph}>
            本サービスは日本国内で提供されますが、一部のデータ処理やストレージについて、日本国外のサーバーを利用する場合があります。この場合、当社は適切なデータ保護措置を講じます。
          </Text>
        </View>

        {/* プライバシーポリシーの変更 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>10. プライバシーポリシーの変更</Text>
          <Text style={styles.paragraph}>
            当社は、法令の変更やサービスの改善に伴い、本プライバシーポリシーを変更することがあります。重要な変更がある場合は、アプリ内通知またはメールでお知らせします。
          </Text>
          <Text style={styles.paragraph}>
            変更後も本サービスを継続して利用する場合、変更後のプライバシーポリシーに同意したものとみなされます。
          </Text>
        </View>

        {/* お問い合わせ */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>11. お問い合わせ</Text>
          <Text style={styles.paragraph}>
            本プライバシーポリシーに関するご質問、個人情報の取り扱いに関するご要望がございましたら、以下までご連絡ください。
          </Text>
          <View style={styles.contactBox}>
            <Text style={styles.contactText}>MICHE カスタマーサポート</Text>
            <Text style={styles.contactText}>Email: privacy@miche.example.com</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            当社は、ユーザーの皆様のプライバシーを尊重し、個人情報を適切に保護してまいります。
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 32,
    maxWidth: 800,
    alignSelf: 'center',
    width: '100%',
  },
  contentMobile: {
    padding: 16,
  },
  lastUpdated: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 24,
    textAlign: 'center',
  },
  intro: {
    fontSize: 15,
    color: Colors.text,
    lineHeight: 24,
    marginBottom: 32,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
  },
  subsection: {
    marginBottom: 20,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  paragraph: {
    fontSize: 15,
    color: Colors.text,
    lineHeight: 24,
    marginBottom: 12,
  },
  listContainer: {
    marginVertical: 8,
    paddingLeft: 8,
  },
  listItem: {
    fontSize: 15,
    color: Colors.text,
    lineHeight: 24,
    marginBottom: 8,
  },
  contactBox: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 16,
    marginTop: 12,
  },
  contactText: {
    fontSize: 15,
    color: Colors.text,
    lineHeight: 24,
  },
  footer: {
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  footerText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
