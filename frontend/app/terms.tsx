// 利用規約ページ

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

export default function TermsScreen() {
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
        <Text style={styles.headerTitle}>利用規約</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* コンテンツ */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, isMobile && styles.contentMobile]}
      >
        <Text style={styles.lastUpdated}>最終更新日: 2025年1月1日</Text>

        {/* 第1条 適用 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>第1条（適用）</Text>
          <Text style={styles.paragraph}>
            本利用規約（以下「本規約」といいます）は、MICHE（以下「当社」といいます）が提供する動画配信サービス「MICHE」（以下「本サービス」といいます）の利用に関する条件を定めるものです。
          </Text>
          <Text style={styles.paragraph}>
            ユーザーは、本サービスを利用することにより、本規約に同意したものとみなされます。
          </Text>
        </View>

        {/* 第2条 年齢制限 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>第2条（年齢制限）</Text>
          <Text style={styles.paragraph}>
            本サービスは、18歳未満の方のご利用を禁止しております。ユーザーは、本サービスを利用することにより、自身が18歳以上であることを表明し、保証するものとします。
          </Text>
          <Text style={styles.paragraph}>
            プレミアム+プランについては、成人向けコンテンツへのアクセスが含まれるため、ご利用に際して年齢確認が必要となります。ユーザーは、プラン変更時に年齢確認に同意する必要があります。
          </Text>
          <Text style={styles.paragraph}>
            当社は、年齢制限に違反するユーザーを発見した場合、事前の通知なくアカウントを停止または削除する権利を有します。
          </Text>
        </View>

        {/* 第3条 禁止事項 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>第3条（禁止事項）</Text>
          <Text style={styles.paragraph}>
            ユーザーは、本サービスの利用にあたり、以下の行為を行ってはなりません。
          </Text>
          <View style={styles.listContainer}>
            <Text style={styles.listItem}>
              1. 日本国刑法第175条（わいせつ物頒布等）に違反するコンテンツのアップロード、配信、または共有
            </Text>
            <Text style={styles.listItem}>
              2. 違法、有害、脅迫的、虐待的、嫌がらせ、中傷的、下品、猥褻、名誉毀損的、プライバシーの侵害、憎悪、人種差別的または民族的に不快なコンテンツのアップロード
            </Text>
            <Text style={styles.listItem}>
              3. 未成年者に有害なコンテンツのアップロード、配信
            </Text>
            <Text style={styles.listItem}>
              4. 著作権、商標権、特許権、その他の知的財産権を侵害するコンテンツのアップロード
            </Text>
            <Text style={styles.listItem}>
              5. 虚偽の情報や誤解を招く情報の提供
            </Text>
            <Text style={styles.listItem}>
              6. 年齢、資格、所属などについての虚偽申告
            </Text>
            <Text style={styles.listItem}>
              7. 他のユーザーまたは第三者になりすます行為
            </Text>
            <Text style={styles.listItem}>
              8. 本サービスの運営を妨害する行為
            </Text>
            <Text style={styles.listItem}>
              9. 本サービスのセキュリティを侵害する行為
            </Text>
            <Text style={styles.listItem}>
              10. 法令または公序良俗に違反する行為
            </Text>
          </View>
          <Text style={styles.paragraph}>
            当社は、これらの禁止事項に違反するユーザーに対して、事前の通知なくコンテンツの削除、アカウントの停止または削除、その他必要な措置を講じる権利を有します。
          </Text>
        </View>

        {/* 第4条 アカウント */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>第4条（アカウント）</Text>
          <Text style={styles.paragraph}>
            ユーザーは、本サービスの利用にあたり、正確かつ最新の情報を提供する必要があります。
          </Text>
          <Text style={styles.paragraph}>
            ユーザーは、自己のアカウント情報（パスワードを含む）を適切に管理し、第三者に開示または使用させてはなりません。
          </Text>
          <Text style={styles.paragraph}>
            アカウントの不正使用が発覚した場合、ユーザーは直ちに当社に通知する必要があります。当社は、不正使用によって生じた損害について責任を負いません。
          </Text>
        </View>

        {/* 第5条 プライバシー */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>第5条（プライバシー）</Text>
          <Text style={styles.paragraph}>
            当社は、ユーザーの個人情報を、別途定めるプライバシーポリシーに従って適切に取り扱います。
          </Text>
          <Text style={styles.paragraph}>
            ユーザーは、本サービスの利用により、プライバシーポリシーに記載された個人情報の取り扱いに同意したものとみなされます。
          </Text>
        </View>

        {/* 第6条 知的財産権 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>第6条（知的財産権）</Text>
          <Text style={styles.paragraph}>
            本サービスおよびそれに関連するコンテンツ（テキスト、画像、動画、音声、ソフトウェアなど）に関する知的財産権は、当社または正当な権利者に帰属します。
          </Text>
          <Text style={styles.paragraph}>
            ユーザーがアップロードしたコンテンツの知的財産権は、ユーザーに帰属します。ただし、ユーザーは、当社に対して、本サービスの運営、宣伝、改善のために必要な範囲で、当該コンテンツを使用する非独占的なライセンスを無償で許諾するものとします。
          </Text>
        </View>

        {/* 第7条 免責 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>第7条（免責）</Text>
          <Text style={styles.paragraph}>
            当社は、本サービスの内容、品質、正確性、完全性、安全性、有用性について、いかなる保証も行いません。
          </Text>
          <Text style={styles.paragraph}>
            当社は、本サービスの利用により生じた損害（直接損害、間接損害、特別損害、付随的損害、結果的損害を含みますがこれらに限られません）について、一切の責任を負いません。
          </Text>
          <Text style={styles.paragraph}>
            当社は、本サービスの中断、停止、終了、利用不能、変更、削除、データの消失または機器の故障について、一切の責任を負いません。
          </Text>
        </View>

        {/* 第8条 規約の変更 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>第8条（規約の変更）</Text>
          <Text style={styles.paragraph}>
            当社は、必要に応じて本規約を変更することができます。規約を変更した場合、当社は本サービス上で変更内容を通知します。
          </Text>
          <Text style={styles.paragraph}>
            変更後もユーザーが本サービスを継続して利用する場合、変更後の規約に同意したものとみなされます。
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            ご不明な点がございましたら、サポートまでお問い合わせください。
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
    marginBottom: 32,
    textAlign: 'center',
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
  paragraph: {
    fontSize: 15,
    color: Colors.text,
    lineHeight: 24,
    marginBottom: 12,
  },
  listContainer: {
    marginVertical: 12,
    paddingLeft: 8,
  },
  listItem: {
    fontSize: 15,
    color: Colors.text,
    lineHeight: 24,
    marginBottom: 12,
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
