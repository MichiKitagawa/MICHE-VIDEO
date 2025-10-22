// Netflix型専用ヘッダー

import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';

type CategoryType = 'home' | 'series' | 'movie';
type SortType = 'popular' | 'newest' | 'rating' | 'title';

interface NetflixHeaderProps {
  activeCategory: CategoryType;
  onCategoryChange: (category: CategoryType) => void;
  selectedGenre: string | null;
  onGenreChange: (genre: string | null) => void;
  selectedCountry: string | null;
  onCountryChange: (country: string | null) => void;
  sortBy: SortType;
  onSortChange: (sort: SortType) => void;
  onProfilePress?: () => void;
}

const GENRES = [
  { value: null, label: 'すべてのジャンル' },
  { value: 'アクション', label: 'アクション' },
  { value: 'SF', label: 'SF' },
  { value: 'ロマンス', label: 'ロマンス' },
  { value: 'コメディ', label: 'コメディ' },
  { value: 'ドラマ', label: 'ドラマ' },
  { value: 'ファンタジー', label: 'ファンタジー' },
  { value: 'ホラー', label: 'ホラー' },
  { value: 'ミステリー', label: 'ミステリー' },
  { value: '歴史', label: '歴史' },
  { value: 'ファミリー', label: 'ファミリー' },
  { value: 'アドベンチャー', label: 'アドベンチャー' },
  { value: 'スリラー', label: 'スリラー' },
  { value: 'サスペンス', label: 'サスペンス' },
];

const COUNTRIES = [
  { value: null, label: 'すべての国' },
  { value: 'JP', label: '日本' },
  { value: 'US', label: 'アメリカ' },
  { value: 'KR', label: '韓国' },
  { value: 'UK', label: 'イギリス' },
];

const SORT_OPTIONS = [
  { value: 'popular' as SortType, label: '人気順' },
  { value: 'newest' as SortType, label: '新着順' },
  { value: 'rating' as SortType, label: '評価順' },
  { value: 'title' as SortType, label: 'タイトル順' },
];

export default function NetflixHeader({
  activeCategory,
  onCategoryChange,
  selectedGenre,
  onGenreChange,
  selectedCountry,
  onCountryChange,
  sortBy,
  onSortChange,
  onProfilePress,
}: NetflixHeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showGenreMenu, setShowGenreMenu] = useState(false);
  const [showCountryMenu, setShowCountryMenu] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);

  const getGenreLabel = () => {
    const genre = GENRES.find(g => g.value === selectedGenre);
    return genre?.label || 'すべてのジャンル';
  };

  const getCountryLabel = () => {
    const country = COUNTRIES.find(c => c.value === selectedCountry);
    return country?.label || 'すべての国';
  };

  const getSortLabel = () => {
    const sort = SORT_OPTIONS.find(s => s.value === sortBy);
    return sort?.label || '人気順';
  };

  return (
    <View style={styles.container}>
      {/* 1層目：メインナビゲーション */}
      <View style={styles.mainNav}>
        <View style={styles.leftSection}>
          <Text style={styles.logo}>MICHE</Text>

          <View style={styles.categoryTabs}>
            <TouchableOpacity
              style={[styles.categoryTab, activeCategory === 'home' && styles.categoryTabActive]}
              onPress={() => onCategoryChange('home')}
            >
              <Text style={[styles.categoryTabText, activeCategory === 'home' && styles.categoryTabTextActive]}>
                ホーム
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.categoryTab, activeCategory === 'series' && styles.categoryTabActive]}
              onPress={() => onCategoryChange('series')}
            >
              <Text style={[styles.categoryTabText, activeCategory === 'series' && styles.categoryTabTextActive]}>
                シリーズ
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.categoryTab, activeCategory === 'movie' && styles.categoryTabActive]}
              onPress={() => onCategoryChange('movie')}
            >
              <Text style={[styles.categoryTabText, activeCategory === 'movie' && styles.categoryTabTextActive]}>
                映画
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.rightSection}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={18} color={Colors.textSecondary} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="タイトル、ジャンルで検索"
              placeholderTextColor={Colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {onProfilePress && (
            <TouchableOpacity style={styles.iconButton} onPress={onProfilePress}>
              <Ionicons name="person-circle-outline" size={28} color={Colors.text} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 2層目：フィルターバー */}
      <View style={styles.filterBar}>
        {/* ジャンルフィルター */}
        <View style={styles.filterGroup}>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowGenreMenu(!showGenreMenu)}
          >
            <Text style={styles.filterButtonText}>{getGenreLabel()}</Text>
            <Ionicons name="chevron-down" size={16} color={Colors.text} />
          </TouchableOpacity>

          {showGenreMenu && (
            <View style={styles.dropdownMenu}>
              <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
                {GENRES.map((genre) => (
                  <TouchableOpacity
                    key={genre.value || 'all'}
                    style={styles.dropdownItem}
                    onPress={() => {
                      onGenreChange(genre.value);
                      setShowGenreMenu(false);
                    }}
                  >
                    <Text style={[
                      styles.dropdownItemText,
                      selectedGenre === genre.value && styles.dropdownItemTextActive
                    ]}>
                      {genre.label}
                    </Text>
                    {selectedGenre === genre.value && (
                      <Ionicons name="checkmark" size={18} color={Colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* 国フィルター */}
        <View style={styles.filterGroup}>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowCountryMenu(!showCountryMenu)}
          >
            <Text style={styles.filterButtonText}>{getCountryLabel()}</Text>
            <Ionicons name="chevron-down" size={16} color={Colors.text} />
          </TouchableOpacity>

          {showCountryMenu && (
            <View style={styles.dropdownMenu}>
              <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
                {COUNTRIES.map((country) => (
                  <TouchableOpacity
                    key={country.value || 'all'}
                    style={styles.dropdownItem}
                    onPress={() => {
                      onCountryChange(country.value);
                      setShowCountryMenu(false);
                    }}
                  >
                    <Text style={[
                      styles.dropdownItemText,
                      selectedCountry === country.value && styles.dropdownItemTextActive
                    ]}>
                      {country.label}
                    </Text>
                    {selectedCountry === country.value && (
                      <Ionicons name="checkmark" size={18} color={Colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* ソートフィルター */}
        <View style={styles.filterGroup}>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowSortMenu(!showSortMenu)}
          >
            <Text style={styles.filterButtonText}>{getSortLabel()}</Text>
            <Ionicons name="chevron-down" size={16} color={Colors.text} />
          </TouchableOpacity>

          {showSortMenu && (
            <View style={styles.dropdownMenu}>
              {SORT_OPTIONS.map((sort) => (
                <TouchableOpacity
                  key={sort.value}
                  style={styles.dropdownItem}
                  onPress={() => {
                    onSortChange(sort.value);
                    setShowSortMenu(false);
                  }}
                >
                  <Text style={[
                    styles.dropdownItemText,
                    sortBy === sort.value && styles.dropdownItemTextActive
                  ]}>
                    {sort.label}
                  </Text>
                  {sortBy === sort.value && (
                    <Ionicons name="checkmark" size={18} color={Colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  mainNav: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    gap: 12,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  logo: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
  },
  categoryTabs: {
    flexDirection: 'row',
    gap: 4,
  },
  categoryTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  categoryTabActive: {
    backgroundColor: Colors.primary,
  },
  categoryTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  categoryTabTextActive: {
    color: Colors.background,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    borderRadius: 20,
    paddingHorizontal: 12,
    height: 36,
    width: 240,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
  },
  iconButton: {
    padding: 4,
  },
  filterBar: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 12,
    backgroundColor: Colors.card,
  },
  filterGroup: {
    position: 'relative',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.background,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterButtonText: {
    fontSize: 14,
    color: Colors.text,
  },
  dropdownMenu: {
    position: 'absolute',
    top: 42,
    left: 0,
    minWidth: 200,
    maxHeight: 300,
    backgroundColor: Colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 1000,
  },
  dropdownScroll: {
    maxHeight: 300,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dropdownItemText: {
    fontSize: 14,
    color: Colors.text,
  },
  dropdownItemTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
});
