import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AFTERPAY_FEE_RATE, applyAfterpayFee } from "@shared/payment-fees";

interface SquarePaymentProps {
  amount: string;
  currency: string;
  onPaymentSuccess: (token: string, paymentMethod: "card" | "afterpay") => void;
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
  const [showAfterpayModal, setShowAfterpayModal] = useState(false);
  const [isTokenizingAfterpay, setIsTokenizingAfterpay] = useState(false);
  const cardContainerRef = useRef<HTMLDivElement>(null);
  const afterpayContainerRef = useRef<HTMLDivElement>(null);
  const afterpayRef = useRef<any>(null);

  const baseAmount = parseFloat(amount) || 0;
  const afterpayFeeAmount = Math.round(baseAmount * AFTERPAY_FEE_RATE * 100) / 100;
  const afterpayTotal = applyAfterpayFee(baseAmount);
  const afterpayTotalStr = afterpayTotal.toFixed(2);
  const afterpayFeeStr = afterpayFeeAmount.toFixed(2);
  const feePercentStr = (AFTERPAY_FEE_RATE * 100).toFixed(1).replace(".", ",");

  useEffect(() => {
    let mounted = true;

    const waitForContainer = async () => {
      let attempts = 0;
      while (attempts < 20 && !cardContainerRef.current) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        attempts++;
      }
      return cardContainerRef.current;
    };

    const initSquare = async () => {
      try {
        if (!window.Square) {
          let attempts = 0;
          while (!window.Square && attempts < 50) {
            await new Promise((resolve) => setTimeout(resolve, 100));
            attempts++;
          }
        }

        if (!window.Square) {
          throw new Error("Square SDK non chargé après 5 secondes");
        }

        const container = await waitForContainer();
        if (!container) {
          throw new Error("Conteneur non trouvé après 2 secondes");
        }

        if (!mounted) return;

        const applicationId = import.meta.env.VITE_SQUARE_APPLICATION_ID;
        const locationId = import.meta.env.VITE_SQUARE_LOCATION_ID;

        if (!applicationId || !locationId) {
          throw new Error("Configuration Square manquante - applicationId ou locationId");
        }

        const paymentsInstance = window.Square.payments(applicationId, locationId);
        setPayments(paymentsInstance);

        const cardInstance = await paymentsInstance.card();
        setCard(cardInstance);
        await cardInstance.attach(container);

        try {
          const paymentRequest = paymentsInstance.paymentRequest({
            countryCode: 'CA',
            currencyCode: currency,
            total: {
              amount: afterpayTotalStr,
              label: 'Total (incl. frais Afterpay)',
            },
          });

          const afterpayInstance = await paymentsInstance.afterpayClearpay(paymentRequest);
          setAfterpay(afterpayInstance);
          afterpayRef.current = afterpayInstance;

          await new Promise(resolve => setTimeout(resolve, 200));

          if (document.getElementById('afterpay-button-hidden')) {
            await afterpayInstance.attach('#afterpay-button-hidden');
          }
        } catch (afterpayError: any) {
          // Afterpay not available for this configuration
        }

        setIsLoading(false);
      } catch (error: any) {
        console.error("Erreur Square:", error);
        if (mounted) {
          onPaymentError(`Erreur: ${error.message}`);
          setIsLoading(false);
        }
      }
    };

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
  }, [amount, currency, afterpayTotalStr]);

  const handleCardPayment = async () => {
    if (!card || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const result = await card.tokenize();

      if (result.status === "OK") {
        onPaymentSuccess(result.token, "card");
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

  const handleAfterpayConfirm = async () => {
    const afterpayInstance = afterpayRef.current;
    if (!afterpayInstance) {
      onPaymentError("Afterpay n'est pas disponible");
      return;
    }

    setIsTokenizingAfterpay(true);
    try {
      const result = await afterpayInstance.tokenize();
      if (result.status === "OK") {
        setShowAfterpayModal(false);
        onPaymentSuccess(result.token, "afterpay");
      } else {
        const errorMessage = result.errors?.length > 0
          ? result.errors[0].message
          : "Erreur lors du traitement Afterpay";
        onPaymentError(errorMessage);
      }
    } catch (error: any) {
      console.error("Erreur de paiement Afterpay:", error);
      onPaymentError("Erreur lors du traitement du paiement Afterpay: " + error.message);
    } finally {
      setIsTokenizingAfterpay(false);
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

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center">
              <div className="w-6 h-6 bg-black text-white font-bold text-sm rounded mr-2 flex items-center justify-center">
                A
              </div>
              Payer en 4 fois avec Afterpay
            </h3>
            <p className="text-xs text-gray-500">
              Des frais additionnels de {feePercentStr} % s'appliquent au paiement par Afterpay.
            </p>
            <button
              type="button"
              onClick={() => setShowAfterpayModal(true)}
              disabled={isLoading || !afterpay || isProcessing || isSubmitting}
              className="w-full bg-black hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center transition-colors min-h-[50px]"
            >
              <span className="mr-2">Buy now with</span>
              <span className="font-bold">Clearpay</span>
            </button>
            <div
              id="afterpay-button-hidden"
              ref={afterpayContainerRef}
              style={{ display: 'none' }}
            />
          </div>

          <div className="flex items-center">
            <div className="flex-1 border-t border-gray-300"></div>
            <div className="px-4 text-gray-500 text-sm">ou</div>
            <div className="flex-1 border-t border-gray-300"></div>
          </div>

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

      <Dialog
        open={showAfterpayModal}
        onOpenChange={(open) => {
          if (!isTokenizingAfterpay) setShowAfterpayModal(open);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <div className="w-6 h-6 bg-black text-white font-bold text-sm rounded mr-2 flex items-center justify-center">
                A
              </div>
              Frais Afterpay
            </DialogTitle>
            <DialogDescription className="text-left pt-2">
              En sélectionnant le paiement avec Afterpay, des frais additionnels
              de {feePercentStr} % seront appliqués à votre commande afin de compenser
              les frais de transaction facturés par le fournisseur de paiement.
              <br />
              <br />
              Le montant total incluant ces frais est affiché avant la confirmation
              finale de votre achat.
              <br />
              <br />
              En poursuivant votre commande avec ce mode de paiement, vous
              reconnaissez et acceptez ces frais additionnels.
            </DialogDescription>
          </DialogHeader>

          <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Sous-total</span>
              <span className="font-medium">{baseAmount.toFixed(2)} {currency}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Frais Afterpay ({feePercentStr} %)</span>
              <span className="font-medium">+{afterpayFeeStr} {currency}</span>
            </div>
            <div className="border-t border-gray-300 pt-2 flex justify-between text-base">
              <span className="font-semibold text-gray-800">Total à payer</span>
              <span className="font-bold text-primary">{afterpayTotalStr} {currency}</span>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowAfterpayModal(false)}
              disabled={isTokenizingAfterpay}
            >
              Annuler
            </Button>
            <Button
              onClick={handleAfterpayConfirm}
              disabled={isTokenizingAfterpay}
              className="bg-black hover:bg-gray-800 text-white"
            >
              {isTokenizingAfterpay ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Traitement...
                </>
              ) : (
                <>Accepter et payer {afterpayTotalStr} {currency}</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
