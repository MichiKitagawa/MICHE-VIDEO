// CategoryChipsBar コンポーネント（YouTube風カテゴリーフィルター）

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';

type SortType = 'relevance' | 'upload_date' | 'view_count' | 'rating';

interface CategoryChipsBarProps {
  categories: string[];
  activeCategory: string;
  onCategoryChange: (category: string) => void;
  sortBy: SortType;
  onSortChange: (sort: SortType) => void;
}

const SORT_OPTIONS = [
  { value: 'relevance' as SortType, label: '関連度' },
  { value: 'upload_date' as SortType, label: 'アップロード日' },
  { value: 'view_count' as SortType, label: '視聴回数' },
  { value: 'rating' as SortType, label: '評価' },
];

export default function CategoryChipsBar({
  categories,
  activeCategory,
  onCategoryChange,
  sortBy,
  onSortChange,
}: CategoryChipsBarProps) {
  const [showSortMenu, setShowSortMenu] = useState(false);

  const getSortLabel = () => {
    const sort = SORT_OPTIONS.find((s) => s.value === sortBy);
    return sort?.label || '関連度';
  };

  return (
    <View style={styles.container}>
      {/* カテゴリーチップ（横スクロール） */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipsScroll}
        contentContainerStyle={styles.chipsContainer}
      >
        {categories.map((category) => (
          <TouchableOpacity
            key={category}
            style={[styles.chip, activeCategory === category && styles.chipActive]}
            onPress={() => onCategoryChange(category)}
          >
            <Text style={[styles.chipText, activeCategory === category && styles.chipTextActive]}>
              {category}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ソートドロップダウン */}
      <View style={styles.sortContainer}>
        <TouchableOpacity
          style={styles.sortButton}
          onPress={() => setShowSortMenu(!showSortMenu)}
        >
          <Ionicons name="filter-outline" size={18} color={Colors.text} />
          <Text style={styles.sortButtonText}>{getSortLabel()}</Text>
          <Ionicons name="chevron-down" size={16} color={Colors.text} />
        </TouchableOpacity>

        {showSortMenu && (
          <View style={styles.sortMenu}>
            {SORT_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={styles.sortMenuItem}
                onPress={() => {
                  onSortChange(option.value);
                  setShowSortMenu(false);
                }}
              >
                <Text
                  style={[
                    styles.sortMenuItemText,
                    sortBy === option.value && styles.sortMenuItemTextActive,
                  ]}
                >
                  {option.label}
                </Text>
                {sortBy === option.value && (
                  <Ionicons name="checkmark" size={18} color={Colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingVertical: 8,
    gap: 12,
  },
  chipsScroll: {
    flex: 1,
  },
  chipsContainer: {
    paddingHorizontal: 12,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: Colors.text,
    borderColor: Colors.text,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
  chipTextActive: {
    color: Colors.background,
    fontWeight: '600',
  },
  sortContainer: {
    position: 'relative',
    paddingRight: 12,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sortButtonText: {
    fontSize: 14,
    color: Colors.text,
  },
  sortMenu: {
    position: 'absolute',
    top: 44,
    right: 12,
    minWidth: 180,
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
  sortMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sortMenuItemText: {
    fontSize: 14,
    color: Colors.text,
  },
  sortMenuItemTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
});
