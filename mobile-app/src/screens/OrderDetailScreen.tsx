import React, { useEffect, useState, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import apiService from '../services/api';
import { statusLabel, statusColor, formatDate } from '../utils/status';
import { useI18n } from '../lib/i18n';

interface OrderDetail {
  id: number;
  total: number | string;
  currency: string;
  status: string;
  createdAt: string;
}

interface OrderItem {
  id: number;
  quantity: number;
  price: number | string;
  product?: { name?: string };
}

export default function OrderDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { t } = useI18n();
  const order: OrderDetail | undefined = route.params?.order;
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);

  useLayoutEffect(() => {
    navigation.setOptions({ title: t('detail.orderTitle') });
  }, [navigation, t]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!order) return;
      try {
        const data = await apiService.getOrderItems(order.id);
        if (mounted) setItems(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Failed to fetch order items:', error);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [order]);

  if (!order) {
    return (
      <View style={styles.center}>
        <Text style={styles.empty}>{t('detail.orderNotFound')}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.headerCard}>
        <Text style={styles.amount}>
          {Number(order.total).toFixed(2)} {order.currency}
        </Text>
        <View
          style={[styles.badge, { backgroundColor: statusColor(order.status) + '22' }]}
        >
          <Text style={[styles.badgeText, { color: statusColor(order.status) }]}>
            {statusLabel(order.status)}
          </Text>
        </View>
        <Text style={styles.orderNumber}>{t('detail.orderNumber')} #{order.id}</Text>
        <Text style={styles.date}>{formatDate(order.createdAt)}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('detail.articles')}</Text>
        {loading ? (
          <ActivityIndicator color="#FF6B35" style={{ paddingVertical: 16 }} />
        ) : items.length === 0 ? (
          <Text style={styles.empty}>{t('detail.noArticles')}</Text>
        ) : (
          items.map((item) => (
            <View key={item.id} style={styles.itemRow}>
              <Text style={styles.itemName} numberOfLines={2}>
                {item.product?.name || `Produit #${item.id}`}
              </Text>
              <Text style={styles.itemQty}>x{item.quantity}</Text>
              <Text style={styles.itemPrice}>
                {(Number(item.price) * item.quantity).toFixed(2)} {order.currency}
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { color: '#666', fontSize: 15, textAlign: 'center', paddingVertical: 8 },
  headerCard: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 24,
    borderRadius: 10,
    alignItems: 'center',
  },
  amount: { fontSize: 28, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  badge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 13, fontWeight: '600' },
  orderNumber: { marginTop: 10, color: '#333', fontWeight: '600' },
  date: { marginTop: 4, color: '#666', fontSize: 13 },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginBottom: 15,
    padding: 16,
    borderRadius: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemName: { flex: 1, color: '#333', fontSize: 14 },
  itemQty: { color: '#666', fontSize: 14, marginHorizontal: 12 },
  itemPrice: { color: '#333', fontSize: 14, fontWeight: '600' },
});
