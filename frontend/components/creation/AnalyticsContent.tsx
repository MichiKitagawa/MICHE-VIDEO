// アナリティクスコンテンツ（詳細統計）

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  useWindowDimensions,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { Colors } from '../../constants/Colors';
import { getAnalytics } from '../../utils/mockApi';
import { Analytics, ContentPerformance } from '../../types';

type SortKey = 'views' | 'watch_time_hours' | 'ctr' | 'likes';

export default function AnalyticsContent() {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>('views');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const data = await getAnalytics();
      setAnalytics(data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 10000) return `${(num / 10000).toFixed(1)}万`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const sortedContent = analytics?.performance_by_content.slice().sort((a, b) => {
    const aVal = a[sortBy];
    const bVal = b[sortBy];
    return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
  });

  const handleSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(key);
      setSortOrder('desc');
    }
  };

  if (loading || !analytics) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>アナリティクス</Text>
      <Text style={styles.subtitle}>過去30日間の統計データ</Text>

      {/* 統計カード */}
      <View style={[styles.statsGrid, isMobile && styles.statsGridMobile]}>
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: Colors.primary + '20' }]}>
            <Ionicons name="eye" size={24} color={Colors.primary} />
          </View>
          <Text style={styles.statValue}>{formatNumber(analytics.overview.total_views)}</Text>
          <Text style={styles.statLabel}>総再生回数</Text>
          <View style={styles.statChange}>
            <Ionicons
              name={analytics.overview.views_change_percent >= 0 ? 'trending-up' : 'trending-down'}
              size={14}
              color={analytics.overview.views_change_percent >= 0 ? '#00C853' : '#D32F2F'}
            />
            <Text style={[
              styles.statChangeText,
              { color: analytics.overview.views_change_percent >= 0 ? '#00C853' : '#D32F2F' }
            ]}>
              {analytics.overview.views_change_percent >= 0 ? '+' : ''}
              {analytics.overview.views_change_percent}%
            </Text>
          </View>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: '#FF6B00' + '20' }]}>
            <Ionicons name="time" size={24} color="#FF6B00" />
          </View>
          <Text style={styles.statValue}>{formatNumber(analytics.overview.total_watch_time_hours)}h</Text>
          <Text style={styles.statLabel}>総視聴時間</Text>
          <View style={styles.statChange}>
            <Ionicons
              name={analytics.overview.watch_time_change_percent >= 0 ? 'trending-up' : 'trending-down'}
              size={14}
              color={analytics.overview.watch_time_change_percent >= 0 ? '#00C853' : '#D32F2F'}
            />
            <Text style={[
              styles.statChangeText,
              { color: analytics.overview.watch_time_change_percent >= 0 ? '#00C853' : '#D32F2F' }
            ]}>
              {analytics.overview.watch_time_change_percent >= 0 ? '+' : ''}
              {analytics.overview.watch_time_change_percent}%
            </Text>
          </View>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: '#00C853' + '20' }]}>
            <Ionicons name="person-add" size={24} color="#00C853" />
          </View>
          <Text style={styles.statValue}>{formatNumber(analytics.overview.subscribers_gained)}</Text>
          <Text style={styles.statLabel}>登録者増加</Text>
          <View style={styles.statChange}>
            <Ionicons
              name={analytics.overview.subscribers_change_percent >= 0 ? 'trending-up' : 'trending-down'}
              size={14}
              color={analytics.overview.subscribers_change_percent >= 0 ? '#00C853' : '#D32F2F'}
            />
            <Text style={[
              styles.statChangeText,
              { color: analytics.overview.subscribers_change_percent >= 0 ? '#00C853' : '#D32F2F' }
            ]}>
              {analytics.overview.subscribers_change_percent >= 0 ? '+' : ''}
              {analytics.overview.subscribers_change_percent}%
            </Text>
          </View>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: '#FF0050' + '20' }]}>
            <Ionicons name="heart" size={24} color="#FF0050" />
          </View>
          <Text style={styles.statValue}>{formatNumber(analytics.overview.total_likes)}</Text>
          <Text style={styles.statLabel}>総いいね数</Text>
          <View style={styles.statChange}>
            <Ionicons
              name={analytics.overview.likes_change_percent >= 0 ? 'trending-up' : 'trending-down'}
              size={14}
              color={analytics.overview.likes_change_percent >= 0 ? '#00C853' : '#D32F2F'}
            />
            <Text style={[
              styles.statChangeText,
              { color: analytics.overview.likes_change_percent >= 0 ? '#00C853' : '#D32F2F' }
            ]}>
              {analytics.overview.likes_change_percent >= 0 ? '+' : ''}
              {analytics.overview.likes_change_percent}%
            </Text>
          </View>
        </View>
      </View>

      {/* 再生回数推移グラフ */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>再生回数推移（過去30日）</Text>
        <View style={styles.chartContainer}>
          <LineChart
            data={{
              labels: analytics.views_timeline.map((d) => {
                const date = new Date(d.date);
                return `${date.getMonth() + 1}/${date.getDate()}`;
              }),
              datasets: [{
                data: analytics.views_timeline.map((d) => d.views),
              }],
            }}
            width={isMobile ? width - 48 : 600}
            height={250}
            chartConfig={{
              backgroundColor: Colors.surface,
              backgroundGradientFrom: Colors.surface,
              backgroundGradientTo: Colors.surface,
              decimalPlaces: 0,
              color: (opacity = 1) => Colors.primary,
              labelColor: (opacity = 1) => Colors.textSecondary,
              style: {
                borderRadius: 12,
              },
              propsForDots: {
                r: "3",
                strokeWidth: "2",
                stroke: Colors.primary,
              },
            }}
            bezier
            style={{
              marginVertical: 8,
              borderRadius: 12,
            }}
            formatYLabel={(value) => {
              const num = parseInt(value);
              if (num >= 10000) return `${(num / 10000).toFixed(0)}万`;
              if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
              return value;
            }}
          />
        </View>
      </View>

      {/* コンテンツパフォーマンス */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>コンテンツパフォーマンス</Text>

        {!isMobile && (
          <View style={styles.tableHeader}>
            <View style={styles.tableCellThumbnail}><Text style={styles.tableHeaderText}></Text></View>
            <View style={styles.tableCellTitle}><Text style={styles.tableHeaderText}>タイトル</Text></View>
            <TouchableOpacity style={styles.tableCellStat} onPress={() => handleSort('views')}>
              <Text style={styles.tableHeaderText}>再生回数</Text>
              {sortBy === 'views' && (
                <Ionicons
                  name={sortOrder === 'desc' ? 'chevron-down' : 'chevron-up'}
                  size={16}
                  color={Colors.text}
                />
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.tableCellStat} onPress={() => handleSort('watch_time_hours')}>
              <Text style={styles.tableHeaderText}>視聴時間</Text>
              {sortBy === 'watch_time_hours' && (
                <Ionicons
                  name={sortOrder === 'desc' ? 'chevron-down' : 'chevron-up'}
                  size={16}
                  color={Colors.text}
                />
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.tableCellStat} onPress={() => handleSort('ctr')}>
              <Text style={styles.tableHeaderText}>CTR</Text>
              {sortBy === 'ctr' && (
                <Ionicons
                  name={sortOrder === 'desc' ? 'chevron-down' : 'chevron-up'}
                  size={16}
                  color={Colors.text}
                />
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.tableCellStat} onPress={() => handleSort('likes')}>
              <Text style={styles.tableHeaderText}>いいね</Text>
              {sortBy === 'likes' && (
                <Ionicons
                  name={sortOrder === 'desc' ? 'chevron-down' : 'chevron-up'}
                  size={16}
                  color={Colors.text}
                />
              )}
            </TouchableOpacity>
          </View>
        )}

        {sortedContent?.map((content) => (
          <View key={content.id} style={[styles.contentRow, isMobile && styles.contentRowMobile]}>
            <Image source={{ uri: content.thumbnail_url }} style={styles.contentThumbnail} />
            <View style={styles.contentInfo}>
              <Text style={styles.contentTitle} numberOfLines={2}>{content.title}</Text>
              {isMobile && (
                <View style={styles.contentStats}>
                  <View style={styles.contentStatItem}>
                    <Ionicons name="eye" size={14} color={Colors.textSecondary} />
                    <Text style={styles.contentStatText}>{formatNumber(content.views)}</Text>
                  </View>
                  <View style={styles.contentStatItem}>
                    <Ionicons name="time" size={14} color={Colors.textSecondary} />
                    <Text style={styles.contentStatText}>{formatNumber(content.watch_time_hours)}h</Text>
                  </View>
                  <View style={styles.contentStatItem}>
                    <Text style={styles.contentStatText}>CTR {content.ctr}%</Text>
                  </View>
                  <View style={styles.contentStatItem}>
                    <Ionicons name="heart" size={14} color={Colors.textSecondary} />
                    <Text style={styles.contentStatText}>{formatNumber(content.likes)}</Text>
                  </View>
                </View>
              )}
            </View>
            {!isMobile && (
              <>
                <View style={styles.tableCellStat}>
                  <Text style={styles.cellText}>{formatNumber(content.views)}</Text>
                </View>
                <View style={styles.tableCellStat}>
                  <Text style={styles.cellText}>{formatNumber(content.watch_time_hours)}h</Text>
                </View>
                <View style={styles.tableCellStat}>
                  <Text style={styles.cellText}>{content.ctr}%</Text>
                </View>
                <View style={styles.tableCellStat}>
                  <Text style={styles.cellText}>{formatNumber(content.likes)}</Text>
                </View>
              </>
            )}
          </View>
        ))}
      </View>

      {/* 視聴者分析 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>視聴者分析</Text>

        {/* 年齢層分布 */}
        <View style={styles.analysisCar}>
          <Text style={styles.analysisCardTitle}>年齢層分布</Text>
          {Object.entries(analytics.audience.age_distribution).map(([age, percentage]) => (
            <View key={age} style={styles.barRow}>
              <Text style={styles.barLabel}>{age}歳</Text>
              <View style={styles.barContainer}>
                <View style={[styles.barFill, { width: `${percentage}%` }]} />
              </View>
              <Text style={styles.barValue}>{percentage}%</Text>
            </View>
          ))}
        </View>

        {/* 性別分布 */}
        <View style={styles.analysisCard}>
          <Text style={styles.analysisCardTitle}>性別分布</Text>
          {Object.entries(analytics.audience.gender_distribution).map(([gender, percentage]) => (
            <View key={gender} style={styles.barRow}>
              <Text style={styles.barLabel}>
                {gender === 'male' ? '男性' : gender === 'female' ? '女性' : 'その他'}
              </Text>
              <View style={styles.barContainer}>
                <View style={[
                  styles.barFill,
                  {
                    width: `${percentage}%`,
                    backgroundColor: gender === 'male' ? '#2196F3' : gender === 'female' ? '#FF4081' : '#9E9E9E'
                  }
                ]} />
              </View>
              <Text style={styles.barValue}>{percentage}%</Text>
            </View>
          ))}
        </View>

        {/* デバイス分布 */}
        <View style={styles.analysisCard}>
          <Text style={styles.analysisCardTitle}>デバイス別視聴</Text>
          {Object.entries(analytics.audience.devices).map(([device, percentage]) => (
            <View key={device} style={styles.barRow}>
              <Text style={styles.barLabel}>
                {device === 'mobile' ? 'モバイル' : device === 'desktop' ? 'デスクトップ' : device === 'tablet' ? 'タブレット' : 'TV'}
              </Text>
              <View style={styles.barContainer}>
                <View style={[styles.barFill, { width: `${percentage}%` }]} />
              </View>
              <Text style={styles.barValue}>{percentage}%</Text>
            </View>
          ))}
        </View>

        {/* 地域分布 */}
        <View style={styles.analysisCard}>
          <Text style={styles.analysisCardTitle}>上位地域</Text>
          {analytics.audience.top_regions.slice(0, 5).map((region) => (
            <View key={region.country} style={styles.barRow}>
              <Text style={styles.barLabel}>{region.name}</Text>
              <View style={styles.barContainer}>
                <View style={[styles.barFill, { width: `${region.percentage}%` }]} />
              </View>
              <Text style={styles.barValue}>{region.percentage}%</Text>
            </View>
          ))}
        </View>
      </View>

      {/* トラフィックソース */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>トラフィックソース</Text>
        <View style={styles.analysisCard}>
          {Object.entries(analytics.traffic_sources).map(([source, percentage]) => (
            <View key={source} style={styles.barRow}>
              <Text style={styles.barLabel}>
                {source === 'search' ? '検索' :
                 source === 'suggested' ? 'おすすめ' :
                 source === 'external' ? '外部サイト' :
                 source === 'direct' ? '直接アクセス' : 'チャンネルページ'}
              </Text>
              <View style={styles.barContainer}>
                <View style={[styles.barFill, { width: `${percentage}%` }]} />
              </View>
              <Text style={styles.barValue}>{percentage}%</Text>
            </View>
          ))}
        </View>
      </View>

      {/* エンゲージメント */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>エンゲージメント指標</Text>
        <View style={[styles.metricsGrid, isMobile && styles.metricsGridMobile]}>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{analytics.engagement.like_rate}%</Text>
            <Text style={styles.metricLabel}>いいね率</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{analytics.engagement.comment_rate}%</Text>
            <Text style={styles.metricLabel}>コメント率</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{formatNumber(analytics.engagement.share_count)}</Text>
            <Text style={styles.metricLabel}>シェア数</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{analytics.engagement.subscription_rate}%</Text>
            <Text style={styles.metricLabel}>登録率</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{analytics.engagement.avg_watch_percentage}%</Text>
            <Text style={styles.metricLabel}>平均視聴率</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 24,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 32,
  },
  statsGridMobile: {
    flexDirection: 'column',
  },
  statCard: {
    flex: 1,
    minWidth: 150,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  statChange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statChangeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 16,
  },
  chartContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    marginBottom: 8,
    gap: 12,
  },
  tableCellThumbnail: {
    width: 120,
  },
  tableCellTitle: {
    flex: 1,
  },
  tableCellStat: {
    width: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  tableHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  contentRow: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: Colors.card,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
    alignItems: 'center',
  },
  contentRowMobile: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  contentThumbnail: {
    width: 120,
    height: 68,
    borderRadius: 6,
    backgroundColor: Colors.border,
  },
  contentInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  contentTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  contentStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  contentStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  contentStatText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  cellText: {
    fontSize: 14,
    color: Colors.text,
  },
  analysisCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  analysisCar: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  analysisCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  barLabel: {
    width: 100,
    fontSize: 14,
    color: Colors.text,
  },
  barContainer: {
    flex: 1,
    height: 24,
    backgroundColor: Colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  barValue: {
    width: 50,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'right',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  metricsGridMobile: {
    flexDirection: 'column',
  },
  metricCard: {
    flex: 1,
    minWidth: 120,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  metricValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
