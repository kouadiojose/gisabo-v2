import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Product, CartItem } from "@/lib/types";
import { isAuthenticated } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { ShoppingCart, X } from "lucide-react";
import { useLocation } from "wouter";
import { useLanguage } from "@/lib/i18n";

// Interface pour les éléments du panier avec prix personnalisé
interface CartItemWithCustomPrice extends CartItem {
  customPrice?: number;
}

export default function Marketplace() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { t } = useLanguage();
  const [cart, setCart] = useState<CartItemWithCustomPrice[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [customPrice, setCustomPrice] = useState<string>("");

  const { language } = useLanguage();

  const { data: products, isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: [`/api/products?lang=${language}`],
  });

  const createOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      const response = await apiRequest("POST", "/api/orders", orderData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: t('marketplace.orderCreated'),
        description: t('marketplace.orderSuccess'),
      });
      setCart([]);
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    },
    onError: (error: any) => {
      toast({
        title: t('marketplace.error'),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const openPriceModal = (product: Product) => {
    setSelectedProduct(product);
    setCustomPrice(product.price); // Prix par défaut = prix du produit
  };

  const addToCart = (product: Product, priceOverride?: number) => {
    const finalPrice = priceOverride || parseFloat(product.price);
    
    setCart(prev => {
      const existingItem = prev.find(item => 
        item.productId === product.id && item.customPrice === finalPrice
      );
      
      if (existingItem) {
        return prev.map(item =>
          item.productId === product.id && item.customPrice === finalPrice
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      
      return [...prev, { 
        productId: product.id, 
        quantity: 1, 
        product,
        customPrice: finalPrice
      }];
    });
    
    toast({
      title: t('marketplace.productAdded'),
      description: t('marketplace.productAddedDesc')
        .replace('{name}', product.name)
        .replace('{price}', finalPrice.toFixed(2)),
    });
  };

  const handleAddToCartWithPrice = () => {
    if (!selectedProduct) return;
    
    const priceValue = parseFloat(customPrice);
    const minPrice = parseFloat(selectedProduct.price);
    
    if (isNaN(priceValue) || priceValue < minPrice) {
      toast({
        title: t('marketplace.invalidPrice'),
        description: t('marketplace.invalidPriceDesc').replace('{min}', minPrice.toFixed(2)),
        variant: "destructive",
      });
      return;
    }
    
    addToCart(selectedProduct, priceValue);
    setSelectedProduct(null);
    setCustomPrice("");
  };

  const getTotalItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  const getTotalPrice = () => {
    return cart.reduce((total, item) => {
      const price = item.customPrice || parseFloat(item.product?.price || "0");
      return total + (price * item.quantity);
    }, 0);
  };

  const handleViewCart = () => {
    if (cart.length === 0) {
      toast({
        title: t('marketplace.emptyCart'),
        description: t('marketplace.emptyCartDesc'),
        variant: "destructive",
      });
      return;
    }

    // Sauvegarder le panier dans localStorage avec les informations produit
    const cartWithProducts = cart.map(item => ({
      ...item,
      product: products?.find(p => p.id === item.productId)
    }));
    localStorage.setItem("cart", JSON.stringify(cartWithProducts));
    setLocation("/cart");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      {/* Header avec panier */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">{t('marketplace.title')}</h1>
            
            {/* Bouton Panier */}
            <Button 
              className="bg-blue-600 hover:bg-blue-700 text-white relative"
              onClick={handleViewCart}
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
{t('marketplace.viewCart')} ({getTotalItems()})
              {getTotalItems() > 0 && (
                <Badge className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-1.5 py-0.5">
                  {getTotalItems()}
                </Badge>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Grille de produits */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {productsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <div className="h-64 bg-gray-200 animate-pulse"></div>
                <CardContent className="p-6 space-y-4">
                  <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-12 bg-gray-200 rounded animate-pulse"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : Array.isArray(products) && products.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {products.map((product) => (
              <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow bg-white">
                {/* Image du produit */}
                <div className="h-64 bg-gray-100 flex items-center justify-center overflow-hidden">
                  {product.imageUrl ? (
                    <img 
                      src={product.imageUrl} 
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-gray-400 text-4xl">
                      📦
                    </div>
                  )}
                </div>
                
                <CardContent className="p-6 text-center">
                  {/* Nom du produit */}
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    {product.name}
                  </h3>
                  
                  {/* Prix minimum */}
                  <div className="mb-4">
                    <span className="text-lg font-bold text-gray-900">
                      {t('marketplace.priceFrom')} {parseFloat(product.price).toFixed(2)} CAD
                    </span>
                    <p className="text-sm text-gray-600 mt-1">
                      {t('marketplace.supportText')}
                    </p>
                  </div>

                  {/* Bouton Ajouter au panier */}
                  <Button 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3"
                    onClick={() => openPriceModal(product)}
                    disabled={!product.inStock}
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    {product.inStock ? t('marketplace.addToCart') : t('marketplace.outOfStock')}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">🛍️</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('marketplace.noProducts')}</h3>
            <p className="text-gray-600">{t('marketplace.noProductsText')}</p>
          </div>
        )}
      </div>

      {/* Résumé du panier (fixé en bas sur mobile) */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 md:hidden">
          <div className="flex justify-between items-center">
            <div>
              <span className="text-sm text-gray-600">{t('marketplace.total')} </span>
              <span className="font-bold text-lg">{getTotalPrice().toFixed(2)} CAD</span>
            </div>
            <Button 
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handleViewCart}
            >
              {t('marketplace.order')} ({getTotalItems()})
            </Button>
          </div>
        </div>
      )}

      {/* Modal pour saisir le prix personnalisé */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  {t('marketplace.addToCart')}
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedProduct(null);
                    setCustomPrice("");
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">
                    {selectedProduct.name}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {t('marketplace.startingFrom')} {parseFloat(selectedProduct.price).toFixed(2)} CAD
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="custom-price">
                    {t('marketplace.supportMore')}
                  </Label>
                  <Input
                    id="custom-price"
                    type="number"
                    step="0.01"
                    min={selectedProduct.price}
                    value={customPrice}
                    onChange={(e) => setCustomPrice(e.target.value)}
                    placeholder={`Minimum ${parseFloat(selectedProduct.price).toFixed(2)}`}
                    className="text-lg"
                  />
                  <p className="text-xs text-gray-500">
                    {t('marketplace.supportDescription')}
                  </p>
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedProduct(null);
                    setCustomPrice("");
                  }}
                  className="flex-1"
                >
                  {t('marketplace.cancel')}
                </Button>
                <Button
                  onClick={handleAddToCartWithPrice}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={!customPrice || parseFloat(customPrice) < parseFloat(selectedProduct.price)}
                >
                  {t('marketplace.addToCart')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}