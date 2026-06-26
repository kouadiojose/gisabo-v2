import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { statusLabel, statusColor, formatDate } from '../utils/status';

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

const deliveryLabel = (method?: string) => {
  switch (method) {
    case 'mobile':
      return 'Mobile Money';
    case 'bank':
      return 'Compte bancaire';
    case 'cash':
      return 'Espèces';
    default:
      return method || '—';
  }
};

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
  const transfer: TransferDetail | undefined = route.params?.transfer;

  if (!transfer) {
    return (
      <View style={styles.center}>
        <Text style={styles.empty}>Transfert introuvable</Text>
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
        <Text style={styles.cardTitle}>Bénéficiaire</Text>
        <Row label="Nom" value={transfer.recipientName} />
        {!!transfer.recipientPhone && (
          <Row label="Téléphone" value={transfer.recipientPhone} />
        )}
        <Row label="Destination" value={transfer.destinationCountry} />
        <Row label="Réception" value={deliveryLabel(transfer.deliveryMethod)} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Détails</Text>
        <Row label="N° de transfert" value={`#${transfer.id}`} />
        {transfer.exchangeRate != null && (
          <Row label="Taux de change" value={String(transfer.exchangeRate)} />
        )}
        {transfer.fees != null && (
          <Row
            label="Frais"
            value={`${Number(transfer.fees).toFixed(2)} ${transfer.currency}`}
          />
        )}
        {transfer.receivedAmount != null && (
          <Row
            label="Montant reçu"
            value={`${Number(transfer.receivedAmount).toFixed(0)} ${
              transfer.destinationCurrency || ''
            }`}
          />
        )}
        <Row label="Date" value={formatDate(transfer.createdAt)} />
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
