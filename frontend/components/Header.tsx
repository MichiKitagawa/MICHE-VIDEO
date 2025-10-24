// Header コンポーネント（YouTubeライク）

import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/Colors';
import { getUnreadNotificationCount } from '../utils/mockApi';

interface HeaderProps {
  showProfile?: boolean;
  showSearch?: boolean;
  onProfilePress?: () => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

export default function Header({
  showProfile = true,
  showSearch = true,
  onProfilePress,
  searchQuery: externalSearchQuery,
  onSearchChange
}: HeaderProps) {
  const router = useRouter();
  const [internalSearchQuery, setInternalSearchQuery] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const searchQuery = externalSearchQuery !== undefined ? externalSearchQuery : internalSearchQuery;

  useEffect(() => {
    loadUnreadCount();
  }, []);

  const loadUnreadCount = async () => {
    try {
      const count = await getUnreadNotificationCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('Failed to load unread notification count:', error);
    }
  };

  const handleSearchChange = (text: string) => {
    if (onSearchChange) {
      onSearchChange(text);
    } else {
      setInternalSearchQuery(text);
    }
  };

  const handleNotificationPress = () => {
    router.push('/notifications' as any);
  };

  return (
    <View style={styles.container}>
      <View style={styles.leftSection}>
        <Text style={styles.logo}>MICHE</Text>
      </View>

      {showSearch && (
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={Colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="検索"
            placeholderTextColor={Colors.textSecondary}
            value={searchQuery}
            onChangeText={handleSearchChange}
          />
        </View>
      )}

      <View style={styles.rightSection}>
        {/* 通知アイコン */}
        <TouchableOpacity style={styles.iconButton} onPress={handleNotificationPress}>
          <View>
            <Ionicons name="notifications-outline" size={28} color={Colors.text} />
            {unreadCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        {/* プロフィールアイコン */}
        {showProfile && (
          <TouchableOpacity style={styles.iconButton} onPress={onProfilePress}>
            <Ionicons name="person-circle-outline" size={28} color={Colors.text} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 12,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    borderRadius: 20,
    paddingHorizontal: 12,
    height: 36,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconButton: {
    padding: 4,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#E91E63',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: Colors.background,
    fontSize: 11,
    fontWeight: 'bold',
  },
});
