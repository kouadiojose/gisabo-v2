import React, { useLayoutEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { statusLabel, statusColor, formatDate } from '../utils/status';
import { useI18n } from '../lib/i18n';

interface TransferDetail {
  id: number;
  amount: number | string;
  currency: string;
  recipientName: string;
  recipientPhone?: string;
  destinationCountry: string;
  destinationCurrency?: string;
  exchangeRate?: number | string;
  fees?: number | string;
  receivedAmount?: number | string;
  deliveryMethod?: string;
  status: string;
  createdAt: string;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

export default function TransferDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { t } = useI18n();
  const transfer: TransferDetail | undefined = route.params?.transfer;

  useLayoutEffect(() => {
    navigation.setOptions({ title: t('detail.transferTitle') });
  }, [navigation, t]);

  const deliveryLabel = (method?: string) => {
    switch (method) {
      case 'mobile':
        return t('detail.mobileMoney');
      case 'bank':
        return t('detail.bankAccount');
      case 'cash':
        return t('detail.cash');
      default:
        return method || '—';
    }
  };

  if (!transfer) {
    return (
      <View style={styles.center}>
        <Text style={styles.empty}>{t('detail.transferNotFound')}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.headerCard}>
        <Text style={styles.amount}>
          {Number(transfer.amount).toFixed(2)} {transfer.currency}
        </Text>
        <View
          style={[
            styles.badge,
            { backgroundColor: statusColor(transfer.status) + '22' },
          ]}
        >
          <Text style={[styles.badgeText, { color: statusColor(transfer.status) }]}>
            {statusLabel(transfer.status)}
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('detail.recipient')}</Text>
        <Row label={t('detail.name')} value={transfer.recipientName} />
        {!!transfer.recipientPhone && (
          <Row label={t('detail.phone')} value={transfer.recipientPhone} />
        )}
        <Row label={t('detail.destination')} value={transfer.destinationCountry} />
        <Row label={t('detail.delivery')} value={deliveryLabel(transfer.deliveryMethod)} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('detail.details')}</Text>
        <Row label={t('detail.transferNumber')} value={`#${transfer.id}`} />
        {transfer.exchangeRate != null && (
          <Row label={t('detail.exchangeRate')} value={String(transfer.exchangeRate)} />
        )}
        {transfer.fees != null && (
          <Row
            label={t('detail.fees')}
            value={`${Number(transfer.fees).toFixed(2)} ${transfer.currency}`}
          />
        )}
        {transfer.receivedAmount != null && (
          <Row
            label={t('detail.receivedAmount')}
            value={`${Number(transfer.receivedAmount).toFixed(0)} ${
              transfer.destinationCurrency || ''
            }`}
          />
        )}
        <Row label={t('detail.date')} value={formatDate(transfer.createdAt)} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { color: '#666', fontSize: 16 },
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
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  label: { color: '#666', fontSize: 14, flex: 1 },
  value: { color: '#333', fontSize: 14, fontWeight: '600', textAlign: 'right', flex: 1 },
});
