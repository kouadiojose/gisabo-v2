import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api';
import { payWithCard } from '../services/payment';

export default function CartScreen() {
  const { items, itemCount, total, addItem, decrement, removeItem, clear } =
    useCart();
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const [checkingOut, setCheckingOut] = useState(false);

  const handleCheckout = () => {
    if (itemCount === 0 || checkingOut) return;
    Alert.alert(
      'Finaliser la commande',
      `Total : ${total.toFixed(2)} CAD\nProcéder au paiement par carte ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Payer', onPress: processCheckout },
      ],
    );
  };

  const processCheckout = async () => {
    const orderItems = items.map((line) => ({
      productId: line.product.id,
      quantity: line.quantity,
    }));

    setCheckingOut(true);
    try {
      // Le serveur règle le paiement PUIS crée la commande (atomique) à partir
      // du nonce de carte obtenu via la feuille native Square.
      await payWithCard(async (nonce) => {
        await apiService.createOrder({
          items: orderItems,
          customerInfo: {
            firstName: user?.firstName,
            lastName: user?.lastName,
            phone: user?.phone,
          },
          paymentToken: nonce,
          paymentMethod: 'card',
        });
      });
      clear();
      Alert.alert('Commande payée', 'Merci ! Votre commande a été enregistrée.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      if (error?.message !== 'CANCELLED') {
        Alert.alert('Erreur', error?.message || 'Le paiement a échoué');
      }
    } finally {
      setCheckingOut(false);
    }
  };

  if (itemCount === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>🛒</Text>
        <Text style={styles.emptyText}>Votre panier est vide</Text>
        <TouchableOpacity
          style={styles.continueButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.continueButtonText}>Continuer mes achats</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.list}>
        {items.map((line) => (
          <View key={line.product.id} style={styles.itemCard}>
            <View style={styles.itemImageContainer}>
              {line.product.imageUrl ? (
                <Image
                  source={{ uri: line.product.imageUrl }}
                  style={styles.itemImage}
                  resizeMode="cover"
                />
              ) : (
                <Text style={styles.itemPlaceholder}>📦</Text>
              )}
            </View>

            <View style={styles.itemInfo}>
              <Text style={styles.itemName} numberOfLines={2}>
                {line.product.name}
              </Text>
              <Text style={styles.itemPrice}>
                {Number(line.product.price).toFixed(2)} {line.product.currency}
              </Text>

              <View style={styles.qtyRow}>
                <TouchableOpacity
                  style={styles.qtyButton}
                  onPress={() => decrement(line.product.id)}
                >
                  <Text style={styles.qtyButtonText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.qtyValue}>{line.quantity}</Text>
                <TouchableOpacity
                  style={styles.qtyButton}
                  onPress={() => addItem(line.product)}
                >
                  <Text style={styles.qtyButtonText}>+</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeItem(line.product.id)}
                >
                  <Text style={styles.removeButtonText}>Retirer</Text>
                </TouchableOpacity>
              </View>
            </View>

            <Text style={styles.lineTotal}>
              {(Number(line.product.price) * line.quantity).toFixed(2)}
            </Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{total.toFixed(2)} CAD</Text>
        </View>
        <TouchableOpacity
          style={[styles.payButton, checkingOut && styles.payButtonDisabled]}
          onPress={handleCheckout}
          disabled={checkingOut}
        >
          <Text style={styles.payButtonText}>
            {checkingOut ? 'Traitement...' : `Payer ${total.toFixed(2)} CAD`}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  list: {
    flex: 1,
  },
  itemCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginTop: 15,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  itemImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  itemPlaceholder: {
    fontSize: 24,
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  itemPrice: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  qtyButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FF6B35',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  qtyValue: {
    marginHorizontal: 12,
    fontSize: 16,
    fontWeight: '600',
    minWidth: 20,
    textAlign: 'center',
  },
  removeButton: {
    marginLeft: 16,
  },
  removeButtonText: {
    color: '#e53935',
    fontSize: 13,
  },
  lineTotal: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  footer: {
    backgroundColor: '#fff',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  payButton: {
    backgroundColor: '#FF6B35',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  payButtonDisabled: {
    opacity: 0.6,
  },
  payButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    padding: 30,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 24,
  },
  continueButton: {
    backgroundColor: '#FF6B35',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
