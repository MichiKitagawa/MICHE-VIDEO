// サブスクリプションプランカード

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SubscriptionPlan } from '../types';
import { Colors } from '../constants/Colors';

interface PlanCardProps {
  plan: SubscriptionPlan;
  onUpgrade: (planId: string) => void;
}

export default function PlanCard({ plan, onUpgrade }: PlanCardProps) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const getPlanColor = () => {
    if (plan.id.includes('free')) return '#9E9E9E';
    if (plan.id.includes('premium_plus')) return '#FFB300';
    if (plan.id.includes('premium')) return Colors.primary;
    return Colors.primary;
  };

  const getPaymentProviderLabel = () => {
    if (!plan.payment_provider) return null;
    switch (plan.payment_provider) {
      case 'stripe':
        return 'Stripe';
      case 'ccbill':
        return 'CCBill';
      default:
        return plan.payment_provider.toUpperCase();
    }
  };

  const planColor = getPlanColor();

  return (
    <View style={[styles.card, isMobile && styles.cardMobile, plan.is_current && styles.cardActive]}>
      {plan.is_current && (
        <View style={[styles.currentBadge, { backgroundColor: planColor }]}>
          <Text style={styles.currentBadgeText}>現在のプラン</Text>
        </View>
      )}

      <View style={[styles.header, isMobile && styles.headerMobile]}>
        <Text style={styles.planName}>{plan.name}</Text>
        <View style={styles.priceContainer}>
          <Text style={[styles.priceSymbol, isMobile && styles.priceSymbolMobile]}>¥</Text>
          <Text style={[styles.price, isMobile && styles.priceMobile]}>{plan.price.toLocaleString()}</Text>
          <Text style={styles.priceCycle}>/月</Text>
        </View>
      </View>

      <View style={styles.features}>
        {plan.features.map((feature, index) => (
          <View key={index} style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={18} color={planColor} />
            <Text style={styles.featureText}>{feature}</Text>
          </View>
        ))}
      </View>

      {/* 決済プロバイダー表示 */}
      {plan.payment_provider && (
        <View style={styles.providerInfo}>
          <Ionicons name="card-outline" size={16} color={Colors.textSecondary} />
          <Text style={styles.providerText}>
            決済: {getPaymentProviderLabel()}
          </Text>
        </View>
      )}

      {!plan.is_current && (
        <TouchableOpacity
          style={[styles.button, { backgroundColor: planColor }]}
          onPress={() => onUpgrade(plan.id)}
        >
          <Text style={styles.buttonText}>アップグレード</Text>
        </TouchableOpacity>
      )}

      {plan.is_current && (
        <View style={styles.currentLabel}>
          <Ionicons name="checkmark-circle" size={20} color={planColor} />
          <Text style={[styles.currentLabelText, { color: planColor }]}>
            利用中
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    maxWidth: 320,
    minWidth: 280,
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 24,
    borderWidth: 2,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    position: 'relative',
  },
  cardMobile: {
    minWidth: 0,
    maxWidth: '100%',
    width: '100%',
    padding: 20,
  },
  cardActive: {
    borderColor: Colors.primary,
    borderWidth: 3,
  },
  currentBadge: {
    position: 'absolute',
    top: -1,
    left: -1,
    right: -1,
    paddingVertical: 8,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    alignItems: 'center',
  },
  currentBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.background,
    textTransform: 'uppercase',
  },
  header: {
    marginTop: 12,
    marginBottom: 20,
    alignItems: 'center',
  },
  headerMobile: {
    marginTop: 8,
    marginBottom: 16,
  },
  planName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  priceSymbol: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  priceSymbolMobile: {
    fontSize: 20,
    marginBottom: 2,
  },
  price: {
    fontSize: 40,
    fontWeight: 'bold',
    color: Colors.text,
    lineHeight: 48,
  },
  priceMobile: {
    fontSize: 32,
    lineHeight: 40,
  },
  priceCycle: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  features: {
    marginBottom: 24,
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  featureText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.background,
  },
  currentLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  currentLabelText: {
    fontSize: 16,
    fontWeight: '700',
  },
  providerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: Colors.surface,
    borderRadius: 6,
    marginBottom: 16,
  },
  providerText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
});
