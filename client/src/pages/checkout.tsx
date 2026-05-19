import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Product } from "@/lib/types";
import { isAuthenticated } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { ArrowLeft, CreditCard, MapPin, User } from "lucide-react";
import { Link, useLocation } from "wouter";
import SquarePayment from "@/components/square-payment";

interface CartItemWithCustomPrice {
  productId: number;
  quantity: number;
  product?: Product;
  customPrice?: number;
}

interface CustomerInfo {
  firstName: string;
  lastName: string;
  phone: string;
  note: string;
}

export default function Checkout() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [cart, setCart] = useState<CartItemWithCustomPrice[]>([]);
  const [currentStep, setCurrentStep] = useState<'info' | 'payment'>('info');
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    firstName: '',
    lastName: '',
    phone: '',
    note: ''
  });

  // Charger le panier depuis localStorage
  useEffect(() => {
    const savedCart = localStorage.getItem("cart");
    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart);
        setCart(parsedCart);
      } catch (error) {
        console.error("Erreur lors du chargement du panier:", error);
        setLocation("/cart");
      }
    } else {
      setLocation("/cart");
    }
  }, [setLocation]);

  const createOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      const response = await apiRequest("POST", "/api/orders", orderData);
      return response.json();
    },
    onSuccess: (order) => {
      // Sauvegarder l'ID de commande pour la page de succès
      localStorage.setItem("lastOrderId", order.id.toString());
      localStorage.removeItem("cart");
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      setLocation("/order-success");
    },
    onError: (error: any) => {
      toast({
        title: "Erreur de paiement",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getTotalItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  const getTotalPrice = () => {
    return cart.reduce((total, item) => {
      const price = item.customPrice || parseFloat(item.product?.price || "0");
      return total + (price * item.quantity);
    }, 0);
  };

  const handleInfoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation des champs requis
    const requiredFields = ['firstName', 'lastName', 'phone'];
    const missingFields = requiredFields.filter(field => !customerInfo[field as keyof CustomerInfo]);
    
    if (missingFields.length > 0) {
      toast({
        title: "Champs manquants",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive",
      });
      return;
    }

    setCurrentStep('payment');
  };

  const handlePaymentSuccess = (paymentToken: string, paymentMethod: "card" | "afterpay") => {
    const orderData = {
      items: cart.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        customPrice: item.customPrice,
      })),
      customerInfo,
    };

    createOrderMutation.mutate({ ...orderData, paymentToken, paymentMethod });
  };

  const handlePaymentError = (error: string) => {
    toast({
      title: "Erreur de paiement",
      description: error,
      variant: "destructive",
    });
  };

  if (!isAuthenticated()) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-bold mb-4">Connexion requise</h2>
            <p className="text-gray-600 mb-4">Vous devez être connecté pour passer commande</p>
            <Link href="/login">
              <Button className="w-full">Se connecter</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Panier vide</h2>
          <p className="text-gray-600 mb-8">Votre panier est vide</p>
          <Link href="/marketplace">
            <Button>Retourner au marketplace</Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header avec navigation */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/cart">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour au panier
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            {currentStep === 'info' ? 'Détails du Bénéficiaire' : 'Paiement'}
          </h1>
        </div>

        {/* Indicateur d'étapes */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center space-x-4">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
              currentStep === 'info' ? 'bg-blue-600 text-white' : 'bg-green-600 text-white'
            }`}>
              <User className="h-4 w-4" />
            </div>
            <div className={`h-1 w-12 ${currentStep === 'payment' ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
              currentStep === 'payment' ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
            }`}>
              <CreditCard className="h-4 w-4" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Formulaire principal */}
          <div className="lg:col-span-2">
            {currentStep === 'info' ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Détails du Bénéficiaire
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleInfoSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="firstName">Prénom(s) *</Label>
                        <Input
                          id="firstName"
                          value={customerInfo.firstName}
                          onChange={(e) => setCustomerInfo(prev => ({ ...prev, firstName: e.target.value }))}
                          required
                          placeholder="Entrez votre ou vos prénoms"
                        />
                      </div>
                      <div>
                        <Label htmlFor="lastName">Nom *</Label>
                        <Input
                          id="lastName"
                          value={customerInfo.lastName}
                          onChange={(e) => setCustomerInfo(prev => ({ ...prev, lastName: e.target.value }))}
                          required
                          placeholder="Entrez votre nom de famille"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="phone">Numéro de téléphone *</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={customerInfo.phone}
                        onChange={(e) => setCustomerInfo(prev => ({ ...prev, phone: e.target.value }))}
                        required
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>

                    <div>
                      <Label htmlFor="note">Note (optionnel)</Label>
                      <textarea
                        id="note"
                        rows={4}
                        value={customerInfo.note}
                        onChange={(e) => setCustomerInfo(prev => ({ ...prev, note: e.target.value }))}
                        placeholder="Ajoutez une note pour votre commande (instructions spéciales, etc.)"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      />
                    </div>

                    <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3">
                      Continuer vers le paiement
                    </Button>
                  </form>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Paiement sécurisé
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <SquarePayment
                    amount={getTotalPrice().toFixed(2)}
                    currency="CAD"
                    onPaymentSuccess={handlePaymentSuccess}
                    onPaymentError={handlePaymentError}
                    isProcessing={createOrderMutation.isPending}
                  />
                </CardContent>
              </Card>
            )}
          </div>

          {/* Résumé de commande */}
          <div className="lg:col-span-1">
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle>Résumé de commande</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Produits */}
                <div className="space-y-3">
                  {cart.map((item, index) => (
                    <div key={`${item.productId}-${item.customPrice}-${index}`} className="flex justify-between text-sm">
                      <div className="flex-1">
                        <div className="font-medium">{item.product?.name}</div>
                        <div className="text-gray-500">
                          Qté: {item.quantity} × {(item.customPrice || parseFloat(item.product?.price || "0")).toFixed(2)} CAD
                        </div>
                      </div>
                      <div className="font-medium">
                        {((item.customPrice || parseFloat(item.product?.price || "0")) * item.quantity).toFixed(2)} CAD
                      </div>
                    </div>
                  ))}
                </div>

                <hr />

                {/* Totaux */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Sous-total ({getTotalItems()} article{getTotalItems() > 1 ? 's' : ''})</span>
                    <span>{getTotalPrice().toFixed(2)} CAD</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Livraison</span>
                    <span className="text-green-600">Gratuite</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Taxes</span>
                    <span>Incluses</span>
                  </div>
                </div>

                <hr />

                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>{getTotalPrice().toFixed(2)} CAD</span>
                </div>

                {/* Informations client si renseignées */}
                {currentStep === 'payment' && customerInfo.firstName && (
                  <div className="mt-6 pt-4 border-t">
                    <div className="text-sm">
                      <div className="font-medium mb-2">Bénéficiaire :</div>
                      <div>{customerInfo.firstName} {customerInfo.lastName}</div>
                      <div>{customerInfo.phone}</div>
                      {customerInfo.note && (
                        <div className="mt-2">
                          <div className="font-medium">Note :</div>
                          <div className="text-gray-600">{customerInfo.note}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
}