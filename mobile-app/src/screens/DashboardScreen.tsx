import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api';
import { statusLabel } from '../utils/status';

// amount / total proviennent de colonnes numeric -> renvoyées en string par l'API.
interface Transfer {
  id: number;
  amount: number | string;
  currency: string;
  recipientName: string;
  destinationCountry: string;
  status: string;
  createdAt: string;
}

interface Order {
  id: number;
  total: number | string;
  currency: string;
  status: string;
  createdAt: string;
}

export default function DashboardScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalSent: 0,
    monthlyTransfers: 0,
    totalOrders: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [transfersData, ordersData] = await Promise.all([
        apiService.getTransfers(),
        apiService.getOrders(),
      ]);
      
      const transfersList: Transfer[] = Array.isArray(transfersData) ? transfersData : [];
      const ordersList: Order[] = Array.isArray(ordersData) ? ordersData : [];
      setTransfers(transfersList);
      setOrders(ordersList);

      // Calculate stats (les montants arrivent en string -> coercition numérique)
      const totalSent = transfersList.reduce((sum: number, transfer: Transfer) => {
        return transfer.status === 'completed' ? sum + Number(transfer.amount) : sum;
      }, 0);

      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      
      const monthlyTransfers = transfersList.filter((transfer: Transfer) => {
        const transferDate = new Date(transfer.createdAt);
        return transferDate.getMonth() === currentMonth &&
               transferDate.getFullYear() === currentYear;
      }).length;

      setStats({
        totalSent,
        monthlyTransfers,
        totalOrders: ordersList.length,
      });
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#4CAF50';
      case 'processing':
        return '#FF9800';
      case 'pending':
        return '#2196F3';
      default:
        return '#666';
    }
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>
          Bonjour, {user?.firstName || 'Utilisateur'} !
        </Text>
        <Text style={styles.subtitle}>
          Bienvenue sur votre tableau de bord GISABO
        </Text>
      </View>

      {/* Statistiques */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.totalSent.toFixed(2)}</Text>
          <Text style={styles.statLabel}>Total envoyé (CAD)</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.monthlyTransfers}</Text>
          <Text style={styles.statLabel}>Transferts ce mois</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.totalOrders}</Text>
          <Text style={styles.statLabel}>Commandes</Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Actions rapides</Text>
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionIcon}>💸</Text>
            <Text style={styles.actionText}>Nouveau transfert</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionIcon}>🛒</Text>
            <Text style={styles.actionText}>Marketplace</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionIcon}>📱</Text>
            <Text style={styles.actionText}>Recharge mobile</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Recent Transfers */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Transferts récents</Text>
        {loading ? (
          <View style={styles.emptyState}>
            <ActivityIndicator color="#FF6B35" />
          </View>
        ) : transfers.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Aucun transfert récent</Text>
          </View>
        ) : (
          transfers.slice(0, 3).map((transfer) => (
            <TouchableOpacity
              key={transfer.id}
              style={styles.transactionCard}
              onPress={() => navigation.navigate('TransferDetail', { transfer })}
            >
              <View style={styles.transactionInfo}>
                <Text style={styles.transactionTitle}>
                  Vers {transfer.recipientName}
                </Text>
                <Text style={styles.transactionDetails}>
                  {Number(transfer.amount).toFixed(2)} {transfer.currency} → {transfer.destinationCountry}
                </Text>
              </View>
              <View style={styles.transactionStatus}>
                <Text
                  style={[
                    styles.statusText,
                    { color: getStatusColor(transfer.status) },
                  ]}
                >
                  {statusLabel(transfer.status)}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Recent Orders */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Commandes récentes</Text>
        {loading ? (
          <View style={styles.emptyState}>
            <ActivityIndicator color="#FF6B35" />
          </View>
        ) : orders.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Aucune commande récente</Text>
          </View>
        ) : (
          orders.slice(0, 3).map((order) => (
            <TouchableOpacity
              key={order.id}
              style={styles.transactionCard}
              onPress={() => navigation.navigate('OrderDetail', { order })}
            >
              <View style={styles.transactionInfo}>
                <Text style={styles.transactionTitle}>
                  Commande #{order.id}
                </Text>
                <Text style={styles.transactionDetails}>
                  {Number(order.total).toFixed(2)} {order.currency}
                </Text>
              </View>
              <View style={styles.transactionStatus}>
                <Text
                  style={[
                    styles.statusText,
                    { color: getStatusColor(order.status) },
                  ]}
                >
                  {statusLabel(order.status)}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#FF6B35',
    padding: 20,
    paddingTop: 60,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 15,
    marginTop: 15,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingVertical: 16,
    paddingHorizontal: 8,
    marginHorizontal: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B35',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
  },
  quickActions: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    alignItems: 'center',
    flex: 1,
    padding: 15,
    margin: 5,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  actionIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  actionText: {
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#fff',
    margin: 15,
    marginTop: 0,
    padding: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyState: {
    padding: 30,
    alignItems: 'center',
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
  },
  transactionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  transactionInfo: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  transactionDetails: {
    fontSize: 14,
    color: '#666',
  },
  transactionStatus: {
    alignItems: 'flex-end',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
});