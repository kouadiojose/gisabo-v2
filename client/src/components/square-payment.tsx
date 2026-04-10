import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface SquarePaymentProps {
  amount: string;
  currency: string;
  onPaymentSuccess: (token: string) => void;
  onPaymentError: (error: string) => void;
  isProcessing: boolean;
}

declare global {
  interface Window {
    Square: any;
  }
}

export default function SquarePayment({
  amount,
  currency,
  onPaymentSuccess,
  onPaymentError,
  isProcessing,
}: SquarePaymentProps) {
  const [payments, setPayments] = useState<any>(null);
  const [card, setCard] = useState<any>(null);
  const [afterpay, setAfterpay] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const cardContainerRef = useRef<HTMLDivElement>(null);
  const afterpayContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;

    const waitForContainer = async () => {
      // Attendre que le conteneur soit disponible
      let attempts = 0;
      while (attempts < 20 && !cardContainerRef.current) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        attempts++;
      }
      return cardContainerRef.current;
    };

    const initSquare = async () => {
      try {
        // Initialize Square SDK

        // Attendre que Square SDK soit chargé
        if (!window.Square) {
          // Wait for Square SDK to load
          let attempts = 0;
          while (!window.Square && attempts < 50) {
            await new Promise((resolve) => setTimeout(resolve, 100));
            attempts++;
          }
        }

        if (!window.Square) {
          throw new Error("Square SDK non chargé après 5 secondes");
        }

        // Attendre que le conteneur soit disponible
        const container = await waitForContainer();
        if (!container) {
          throw new Error("Conteneur non trouvé après 2 secondes");
        }

        if (!mounted) return;

        // Square SDK loaded

        const applicationId = import.meta.env.VITE_SQUARE_APPLICATION_ID;
        const locationId = import.meta.env.VITE_SQUARE_LOCATION_ID;

        if (!applicationId || !locationId) {
          throw new Error("Configuration Square manquante - applicationId ou locationId");
        }

        // Créer l'instance de paiements
        const paymentsInstance = window.Square.payments(applicationId, locationId);
        setPayments(paymentsInstance);

        // Créer la carte
        const cardInstance = await paymentsInstance.card();
        setCard(cardInstance);
        await cardInstance.attach(container);

        // Initialiser Afterpay comme dans la documentation
        try {
          const paymentRequest = paymentsInstance.paymentRequest({
            countryCode: 'CA', // Canada
            currencyCode: currency,
            total: {
              amount: amount,
              label: 'Total',
            },
          });

          const afterpayInstance = await paymentsInstance.afterpayClearpay(paymentRequest);
          setAfterpay(afterpayInstance);

          // Attendre que le conteneur Afterpay soit disponible
          // Attendre un peu que le DOM soit prêt
          await new Promise(resolve => setTimeout(resolve, 200));
          
          if (document.getElementById('afterpay-button')) {
            await afterpayInstance.attach('#afterpay-button');
            // Afterpay button attached
            
            // Ajouter l'écouteur d'événement pour le clic comme dans la documentation
            const afterpayButton = document.getElementById('afterpay-button');
            if (afterpayButton) {
              afterpayButton.addEventListener('click', async (event) => {
                try {
                  const tokenResult = await afterpayInstance.tokenize();
                  if (tokenResult.status === 'OK') {
                    onPaymentSuccess(tokenResult.token);
                  } else {
                    let errorMessage = `Tokenization failed with status: ${tokenResult.status}`;
                    if (tokenResult.errors) {
                      errorMessage += ` and errors: ${JSON.stringify(tokenResult.errors)}`;
                    }
                    throw new Error(errorMessage);
                  }
                } catch (e: any) {
                  console.error(e.message);
                  onPaymentError("Erreur Afterpay: " + e.message);
                }
              });
            }
          } else {
            // Afterpay container not found
          }
        } catch (afterpayError: any) {
          // Afterpay not available for this configuration
        }

        // Square initialized successfully
        setIsLoading(false);
      } catch (error: any) {
        console.error("❌ Erreur Square:", error);
        if (mounted) {
          onPaymentError(`Erreur: ${error.message}`);
          setIsLoading(false);
        }
      }
    };

    // Délai pour s'assurer que le rendu React est terminé
    const timer = setTimeout(initSquare, 100);

    return () => {
      mounted = false;
      clearTimeout(timer);
      if (card) {
        card.destroy();
      }
      if (afterpay) {
        afterpay.destroy();
      }
    };
  }, [amount, currency]);

  const handleCardPayment = async () => {
    if (!card || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const result = await card.tokenize();

      if (result.status === "OK") {
        onPaymentSuccess(result.token);
      } else {
        const errorMessage = result.errors?.length > 0
          ? result.errors[0].message
          : "Erreur lors du traitement de la carte";
        onPaymentError(errorMessage);
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error("Erreur de paiement carte:", error);
      onPaymentError("Erreur lors du traitement du paiement");
      setIsSubmitting(false);
    }
  };

  const handleAfterpayPayment = async () => {
    if (!afterpay) {
      onPaymentError("Afterpay n'est pas disponible");
      return;
    }

    try {
      const result = await afterpay.tokenize();
      if (result.status === "OK") {
        onPaymentSuccess(result.token);
      } else {
        const errorMessage = result.errors?.length > 0
          ? result.errors[0].message
          : "Erreur lors du traitement Afterpay";
        onPaymentError(errorMessage);
      }
    } catch (error) {
      console.error("Erreur de paiement Afterpay:", error);
      onPaymentError("Erreur lors du traitement du paiement Afterpay");
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b">
        <CardTitle className="font-poppins text-xl flex items-center">
          <i className="fab fa-square text-green-600 mr-3 text-2xl"></i>
          Paiement sécurisé
        </CardTitle>
        <p className="text-gray-600">Méthodes de paiement disponibles</p>
      </CardHeader>

      <CardContent className="p-8">
        <div className="space-y-6">
          {/* Montant à payer */}
          <div className="bg-gradient-to-r from-primary/10 to-secondary/10 p-4 rounded-xl border">
            <div className="text-center">
              <p className="text-lg font-semibold text-gray-700 mb-1">
                Montant à payer
              </p>
              <p className="text-3xl font-bold text-primary">
                {amount} {currency}
              </p>
            </div>
          </div>

          {/* Bouton Afterpay - en haut */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center">
              <div className="w-6 h-6 bg-black text-white font-bold text-sm rounded mr-2 flex items-center justify-center">
                A
              </div>
              Payer en 4 fois avec Afterpay
            </h3>
            <div
              id="afterpay-button"
              ref={afterpayContainerRef}
              className="min-h-[50px]"
            />
          </div>

          {/* Séparateur */}
          <div className="flex items-center">
            <div className="flex-1 border-t border-gray-300"></div>
            <div className="px-4 text-gray-500 text-sm">ou</div>
            <div className="flex-1 border-t border-gray-300"></div>
          </div>

          {/* Formulaire de carte Square */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center">
              <i className="fas fa-credit-card text-blue-600 mr-2"></i>
              Paiement par carte bancaire
            </h3>
            <p className="text-sm text-gray-600">
              Cartes acceptées : Visa, Mastercard, American Express
            </p>

            {isLoading && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-gray-600">
                  Chargement du formulaire de paiement...
                </p>
              </div>
            )}

            <div
              ref={cardContainerRef}
              className={`border-2 border-gray-200 rounded-lg p-4 min-h-[120px] ${isLoading ? "hidden" : ""}`}
              style={{ backgroundColor: "#fff" }}
            />

            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-2 text-center">
                Cartes acceptées :
              </p>
              <div className="flex justify-center space-x-4">
                <i className="fab fa-cc-visa text-blue-600 text-2xl"></i>
                <i className="fab fa-cc-mastercard text-red-500 text-2xl"></i>
                <i className="fab fa-cc-amex text-blue-500 text-2xl"></i>
                <i className="fab fa-cc-discover text-orange-500 text-2xl"></i>
              </div>
            </div>
          </div>

          {/* Bouton de paiement par carte */}
          <Button
            onClick={handleCardPayment}
            disabled={isProcessing || isLoading || !card || isSubmitting}
            size="lg"
            className="w-full bg-green-600 hover:bg-green-700 text-white py-4 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
          >
            {isProcessing ? (
              <>
                <i className="fas fa-spinner fa-spin mr-3"></i>
                Traitement en cours...
              </>
            ) : (
              <>
                <i className="fas fa-credit-card mr-3"></i>
                Payer {amount} {currency} par carte
              </>
            )}
          </Button>

          {/* Garanties de sécurité */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="text-center">
              <i className="fas fa-shield-alt text-green-600 text-2xl mb-2"></i>
              <p className="text-xs text-gray-600">Paiement sécurisé SSL</p>
            </div>
            <div className="text-center">
              <i className="fas fa-lock text-green-600 text-2xl mb-2"></i>
              <p className="text-xs text-gray-600">Données cryptées</p>
            </div>
            <div className="text-center">
              <i className="fas fa-award text-green-600 text-2xl mb-2"></i>
              <p className="text-xs text-gray-600">Square certifié PCI</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}