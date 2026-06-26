import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import apiService from '../services/api';
import { payWithCard } from '../services/payment';
import { useAuth } from '../contexts/AuthContext';

// L'API renvoie des produits déjà localisés (champs `name` / `description`
// selon la langue), et `price` provient d'une colonne numeric (donc string).
interface Product {
  id: number;
  name: string;
  description: string;
  price: number | string;
  currency: string;
  imageUrl?: string;
  inStock: boolean;
  categoryId: number;
}

interface Category {
  id: number;
  name: string;
  slug: string;
  icon: string;
  color: string;
}

export default function MarketplaceScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<{ [key: number]: number }>({});
  const [checkingOut, setCheckingOut] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [productsData, categoriesData] = await Promise.all([
        apiService.getProducts(),
        apiService.getCategories(),
      ]);

      setProducts(Array.isArray(productsData) ? productsData : []);
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
    } catch (error) {
      console.error('Failed to fetch marketplace data:', error);
      Alert.alert('Erreur', 'Impossible de charger les données du marketplace');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const addToCart = (productId: number) => {
    setCart(prev => ({
      ...prev,
      [productId]: (prev[productId] || 0) + 1
    }));
  };

  const filteredProducts = selectedCategory
    ? products.filter(product => product.categoryId === selectedCategory)
    : products;

  const cartItemCount = Object.values(cart).reduce((sum, count) => sum + count, 0);

  const cartTotal = Object.entries(cart).reduce((sum, [id, qty]) => {
    const product = products.find((p) => p.id === Number(id));
    return product ? sum + Number(product.price) * qty : sum;
  }, 0);

  const handleCheckout = () => {
    if (cartItemCount === 0 || checkingOut) return;
    Alert.alert(
      'Finaliser la commande',
      `Total : ${cartTotal.toFixed(2)} CAD\nProcéder au paiement par carte ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Payer', onPress: processCheckout },
      ],
    );
  };

  const processCheckout = async () => {
    const items = Object.entries(cart).map(([id, qty]) => ({
      productId: Number(id),
      quantity: qty,
    }));

    setCheckingOut(true);
    try {
      // Le serveur règle le paiement PUIS crée la commande (atomique) à partir
      // du nonce de carte obtenu via la feuille native Square.
      await payWithCard(async (nonce) => {
        await apiService.createOrder({
          items,
          customerInfo: {
            firstName: user?.firstName,
            lastName: user?.lastName,
            phone: user?.phone,
          },
          paymentToken: nonce,
          paymentMethod: 'card',
        });
      });
      Alert.alert('Commande payée', 'Merci ! Votre commande a été enregistrée.');
      setCart({});
    } catch (error: any) {
      if (error?.message !== 'CANCELLED') {
        Alert.alert('Erreur', error?.message || 'Le paiement a échoué');
      }
    } finally {
      setCheckingOut(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Marketplace</Text>
        <Text style={styles.subtitle}>Produits authentiques d'Afrique</Text>
        {cartItemCount > 0 && (
          <TouchableOpacity
            style={styles.cartButton}
            onPress={handleCheckout}
            disabled={checkingOut}
          >
            <Text style={styles.cartIcon}>{checkingOut ? '⏳' : '🛒'}</Text>
            <Text style={styles.cartCount}>{cartItemCount}</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Categories */}
        <View style={styles.categoriesSection}>
          <Text style={styles.sectionTitle}>Catégories</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.categoriesList}>
              <TouchableOpacity
                style={[
                  styles.categoryButton,
                  selectedCategory === null && styles.categoryButtonSelected,
                ]}
                onPress={() => setSelectedCategory(null)}
              >
                <Text style={styles.categoryIcon}>🏪</Text>
                <Text style={styles.categoryName}>Tout</Text>
              </TouchableOpacity>
              
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryButton,
                    selectedCategory === category.id && styles.categoryButtonSelected,
                  ]}
                  onPress={() => setSelectedCategory(category.id)}
                >
                  <Text style={styles.categoryIcon}>
                    {category.icon || '📦'}
                  </Text>
                  <Text style={styles.categoryName}>{category.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Products */}
        <View style={styles.productsSection}>
          <Text style={styles.sectionTitle}>
            {selectedCategory 
              ? categories.find(c => c.id === selectedCategory)?.name || 'Produits'
              : 'Tous les produits'
            }
          </Text>
          
          {loading ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="large" color="#FF6B35" />
            </View>
          ) : filteredProducts.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📦</Text>
              <Text style={styles.emptyText}>
                {products.length === 0
                  ? 'Aucun produit disponible pour le moment'
                  : 'Aucun produit dans cette catégorie'
                }
              </Text>
            </View>
          ) : (
            <View style={styles.productsGrid}>
              {filteredProducts.map((product) => (
                <View key={product.id} style={styles.productCard}>
                  <View style={styles.productImageContainer}>
                    {product.imageUrl ? (
                      <Image
                        source={{ uri: product.imageUrl }}
                        style={styles.productImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.placeholderImage}>
                        <Text style={styles.placeholderText}>📦</Text>
                      </View>
                    )}
                    {!product.inStock && (
                      <View style={styles.outOfStockOverlay}>
                        <Text style={styles.outOfStockText}>Rupture de stock</Text>
                      </View>
                    )}
                  </View>
                  
                  <View style={styles.productInfo}>
                    <Text style={styles.productName} numberOfLines={2}>
                      {product.name}
                    </Text>
                    <Text style={styles.productDescription} numberOfLines={2}>
                      {product.description}
                    </Text>
                    <Text style={styles.productPrice}>
                      {Number(product.price).toFixed(2)} {product.currency}
                    </Text>
                  </View>
                  
                  <TouchableOpacity
                    style={[
                      styles.addToCartButton,
                      !product.inStock && styles.addToCartButtonDisabled,
                    ]}
                    onPress={() => addToCart(product.id)}
                    disabled={!product.inStock}
                  >
                    <Text style={styles.addToCartText}>
                      {product.inStock ? 'Ajouter au panier' : 'Indisponible'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  subtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
    position: 'absolute',
    bottom: 20,
    left: 20,
  },
  cartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 8,
    borderRadius: 20,
  },
  cartIcon: {
    fontSize: 20,
    marginRight: 5,
  },
  cartCount: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  content: {
    flex: 1,
  },
  categoriesSection: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  categoriesList: {
    flexDirection: 'row',
  },
  categoryButton: {
    alignItems: 'center',
    padding: 15,
    margin: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    minWidth: 80,
  },
  categoryButtonSelected: {
    borderColor: '#FF6B35',
    backgroundColor: '#FFF5F1',
  },
  categoryIcon: {
    fontSize: 24,
    marginBottom: 5,
  },
  categoryName: {
    fontSize: 12,
    textAlign: 'center',
    color: '#333',
  },
  productsSection: {
    backgroundColor: '#fff',
    padding: 20,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 15,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  productCard: {
    width: '48%',
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    marginBottom: 15,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productImageContainer: {
    position: 'relative',
    height: 120,
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 32,
    color: '#999',
  },
  outOfStockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  outOfStockText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  productInfo: {
    padding: 12,
  },
  productName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  productDescription: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B35',
    marginBottom: 10,
  },
  addToCartButton: {
    backgroundColor: '#FF6B35',
    padding: 8,
    alignItems: 'center',
  },
  addToCartButtonDisabled: {
    backgroundColor: '#ccc',
  },
  addToCartText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});