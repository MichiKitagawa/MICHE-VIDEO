// 認証ページ（ログイン/サインアップ）

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/Colors';
import { mockLogin, mockSignup } from '../utils/mockApi';

type TabType = 'login' | 'signup';

export default function AuthScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('login');

  // ログインフォーム
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // サインアップフォーム
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupPasswordConfirm, setSignupPasswordConfirm] = useState('');

  const handleLogin = async () => {
    if (!loginEmail || !loginPassword) {
      Alert.alert('エラー', 'メールアドレスとパスワードを入力してください');
      return;
    }

    try {
      const user = await mockLogin(loginEmail, loginPassword);
      Alert.alert('成功', 'ログインしました', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      Alert.alert('エラー', 'ログインに失敗しました');
    }
  };

  const handleSignup = async () => {
    if (!signupName || !signupEmail || !signupPassword || !signupPasswordConfirm) {
      Alert.alert('エラー', 'すべての項目を入力してください');
      return;
    }

    if (signupPassword !== signupPasswordConfirm) {
      Alert.alert('エラー', 'パスワードが一致しません');
      return;
    }

    try {
      const user = await mockSignup(signupName, signupEmail, signupPassword);
      Alert.alert('成功', 'アカウントを作成しました', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      Alert.alert('エラー', 'アカウント作成に失敗しました');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* ロゴ */}
        <View style={styles.logoContainer}>
          <Text style={styles.logo}>MICHE VIDEO</Text>
        </View>

        {/* タブ */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'login' && styles.activeTab]}
            onPress={() => setActiveTab('login')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'login' && styles.activeTabText,
              ]}
            >
              ログイン
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'signup' && styles.activeTab]}
            onPress={() => setActiveTab('signup')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'signup' && styles.activeTabText,
              ]}
            >
              サインアップ
            </Text>
          </TouchableOpacity>
        </View>

        {/* フォーム */}
        <View style={styles.formContainer}>
          {activeTab === 'login' ? (
            // ログインフォーム
            <>
              <TextInput
                style={styles.input}
                placeholder="メールアドレス"
                placeholderTextColor={Colors.textSecondary}
                value={loginEmail}
                onChangeText={setLoginEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <TextInput
                style={styles.input}
                placeholder="パスワード"
                placeholderTextColor={Colors.textSecondary}
                value={loginPassword}
                onChangeText={setLoginPassword}
                secureTextEntry
              />
              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleLogin}
              >
                <Text style={styles.submitButtonText}>ログイン</Text>
              </TouchableOpacity>
            </>
          ) : (
            // サインアップフォーム
            <>
              <TextInput
                style={styles.input}
                placeholder="ユーザー名"
                placeholderTextColor={Colors.textSecondary}
                value={signupName}
                onChangeText={setSignupName}
              />
              <TextInput
                style={styles.input}
                placeholder="メールアドレス"
                placeholderTextColor={Colors.textSecondary}
                value={signupEmail}
                onChangeText={setSignupEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <TextInput
                style={styles.input}
                placeholder="パスワード"
                placeholderTextColor={Colors.textSecondary}
                value={signupPassword}
                onChangeText={setSignupPassword}
                secureTextEntry
              />
              <TextInput
                style={styles.input}
                placeholder="パスワード（確認）"
                placeholderTextColor={Colors.textSecondary}
                value={signupPasswordConfirm}
                onChangeText={setSignupPasswordConfirm}
                secureTextEntry
              />
              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleSignup}
              >
                <Text style={styles.submitButtonText}>サインアップ</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* 戻るボタン */}
        <TouchableOpacity
          style={styles.backLink}
          onPress={() => router.back()}
        >
          <Text style={styles.backLinkText}>戻る</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.text,
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 32,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
  },
  tabText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  activeTabText: {
    color: Colors.primary,
    fontWeight: '600',
  },
  formContainer: {
    gap: 16,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    color: Colors.text,
    backgroundColor: Colors.background,
  },
  submitButton: {
    height: 48,
    backgroundColor: Colors.primary,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background,
  },
  backLink: {
    marginTop: 24,
    alignItems: 'center',
  },
  backLinkText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
});
