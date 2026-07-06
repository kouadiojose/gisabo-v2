import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AFTERPAY_FEE_RATE, applyAfterpayFee } from "@shared/payment-fees";

interface SquarePaymentProps {
  amount: string;
  currency: string;
  onPaymentSuccess: (token: string, paymentMethod: "card" | "afterpay") => void;
  onPaymentError: (error: string) => void;
  isProcessing: boolean;
}

type PaymentMethod = "card" | "afterpay";

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
  const [card, setCard] = useState<any>(null);
  const [afterpay, setAfterpay] = useState<any>(null);
  const [afterpayAvailable, setAfterpayAvailable] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>("card");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Verrou de confirmation : une fois le paiement soumis (carte tokenisée),
  // on bloque le formulaire pour empêcher tout double paiement et on affiche
  // un écran de confirmation jusqu'à la redirection vers la page de succès.
  const [submitted, setSubmitted] = useState(false);
  const [serverStarted, setServerStarted] = useState(false);
  const [showIssue, setShowIssue] = useState(false);
  const cardContainerRef = useRef<HTMLDivElement>(null);
  const afterpayContainerRef = useRef<HTMLDivElement>(null);

  const baseAmount = parseFloat(amount) || 0;
  const afterpayFeeAmount = Math.round(baseAmount * AFTERPAY_FEE_RATE * 100) / 100;
  const afterpayTotal = applyAfterpayFee(baseAmount);
  const afterpayTotalStr = afterpayTotal.toFixed(2);
  const afterpayFeeStr = afterpayFeeAmount.toFixed(2);
  const afterpayInstallmentStr = (afterpayTotal / 4).toFixed(2);
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

          await new Promise(resolve => setTimeout(resolve, 200));

          const afterpayButton = document.getElementById('afterpay-button');
          if (afterpayButton) {
            await afterpayInstance.attach('#afterpay-button');
            if (mounted) setAfterpayAvailable(true);

            afterpayButton.addEventListener('click', async (event) => {
              event.preventDefault();
              try {
                const result = await afterpayInstance.tokenize();
                if (result.status === "OK") {
                  setSubmitted(true);
                  onPaymentSuccess(result.token, "afterpay");
                } else {
                  const errorMessage = result.errors?.length > 0
                    ? result.errors[0].message
                    : "Erreur lors du traitement Afterpay";
                  onPaymentError(errorMessage);
                }
              } catch (afterpayErr: any) {
                console.error("Erreur de paiement Afterpay:", afterpayErr);
                onPaymentError("Erreur lors du traitement du paiement Afterpay: " + afterpayErr.message);
              }
            });
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

  // Dès que la requête serveur (création de la commande / du transfert) démarre,
  // on mémorise qu'elle a bien été lancée.
  useEffect(() => {
    if (isProcessing) setServerStarted(true);
  }, [isProcessing]);

  // Si le serveur a répondu (isProcessing repasse à false) sans que la page ait
  // été redirigée, c'est que la confirmation a échoué APRÈS l'envoi du paiement.
  // On laisse une fenêtre de grâce de 1,5 s : en cas de succès, la redirection
  // démonte le composant avant l'affichage du message d'erreur (pas de
  // clignotement intempestif).
  useEffect(() => {
    if (submitted && serverStarted && !isProcessing) {
      const timer = setTimeout(() => setShowIssue(true), 1500);
      return () => clearTimeout(timer);
    }
    setShowIssue(false);
  }, [submitted, serverStarted, isProcessing]);

  const confirming = submitted && !showIssue;
  const postPaymentIssue = submitted && showIssue;

  const handleRetry = () => {
    setShowIssue(false);
    setServerStarted(false);
    setSubmitted(false);
    setIsSubmitting(false);
  };

  const handleCardPayment = async () => {
    if (!card || isSubmitting || submitted) return;

    setIsSubmitting(true);
    try {
      const result = await card.tokenize();

      if (result.status === "OK") {
        setSubmitted(true);
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

  return (
    <Card className="shadow-lg">
      <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b">
        <CardTitle className="font-poppins text-xl flex items-center">
          <i className="fab fa-square text-green-600 mr-3 text-2xl"></i>
          Paiement sécurisé
        </CardTitle>
        <p className="text-gray-600">
          Choisissez votre méthode de paiement ci-dessous
        </p>
      </CardHeader>

      <CardContent className="p-6 sm:p-8">
        {/* Écran de confirmation / d'erreur après soumission du paiement */}
        {submitted && (
          <div className="mb-2">
            {confirming ? (
              <div className="text-center py-10">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">
                  Confirmation de votre paiement en cours…
                </h3>
                <p className="mt-2 text-gray-600">
                  Merci de patienter quelques instants. Ne fermez pas et ne
                  rechargez pas cette page, et ne soumettez pas le paiement à
                  nouveau. Vous allez être redirigé automatiquement.
                </p>
              </div>
            ) : (
              <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-6 text-center">
                <i className="fas fa-exclamation-triangle text-amber-600 text-3xl mb-3"></i>
                <h3 className="text-lg font-semibold text-amber-900">
                  La confirmation n'a pas abouti
                </h3>
                <p className="mt-2 text-sm text-amber-800">
                  Votre paiement a peut-être tout de même été traité.{" "}
                  <strong>
                    Pour éviter d'être débité deux fois, ne payez pas à nouveau
                    immédiatement.
                  </strong>{" "}
                  Si un montant a été prélevé, contactez-nous au{" "}
                  <strong>+1 (613) 762-6686</strong> ou{" "}
                  <strong>gisabonet@gmail.com</strong> et nous confirmerons votre
                  transaction.
                </p>
                <Button
                  onClick={handleRetry}
                  variant="outline"
                  className="mt-4"
                >
                  Réessayer le paiement
                </Button>
              </div>
            )}
          </div>
        )}

        <div className={submitted ? "hidden" : "space-y-6"}>
          {/* Sélecteur de méthode de paiement — deux options côte à côte */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-3">
              2 façons de payer — à vous de choisir
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Option 1 : Carte bancaire (paiement total) */}
              <button
                type="button"
                onClick={() => setSelectedMethod("card")}
                aria-pressed={selectedMethod === "card"}
                className={`relative text-left rounded-xl border-2 p-4 transition-all focus:outline-none focus:ring-2 focus:ring-primary/40 ${
                  selectedMethod === "card"
                    ? "border-primary bg-primary/5 shadow-md"
                    : "border-gray-200 hover:border-gray-300 bg-white"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center">
                    <i className="fas fa-credit-card text-blue-600 text-xl mr-3"></i>
                    <span className="font-semibold text-gray-900">
                      Carte bancaire
                    </span>
                  </div>
                  <span
                    className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                      selectedMethod === "card"
                        ? "border-primary bg-primary"
                        : "border-gray-300"
                    }`}
                  >
                    {selectedMethod === "card" && (
                      <i className="fas fa-check text-white text-[10px]"></i>
                    )}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Payez la totalité maintenant, en une seule fois.
                </p>
                <div className="mt-3">
                  <span className="text-2xl font-bold text-gray-900">
                    {baseAmount.toFixed(2)} {currency}
                  </span>
                  <span className="block text-xs text-gray-500 mt-0.5">
                    Aucuns frais supplémentaires
                  </span>
                </div>
              </button>

              {/* Option 2 : Afterpay (paiement en 4 fois) */}
              {afterpayAvailable ? (
                <button
                  type="button"
                  onClick={() => setSelectedMethod("afterpay")}
                  aria-pressed={selectedMethod === "afterpay"}
                  className={`relative text-left rounded-xl border-2 p-4 transition-all focus:outline-none focus:ring-2 focus:ring-primary/40 ${
                    selectedMethod === "afterpay"
                      ? "border-primary bg-primary/5 shadow-md"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
                >
                  <span className="absolute -top-2 left-4 bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full">
                    Étalez vos paiements
                  </span>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center">
                      <span className="w-6 h-6 bg-black text-white font-bold text-sm rounded mr-3 flex items-center justify-center">
                        A
                      </span>
                      <span className="font-semibold text-gray-900">Afterpay</span>
                    </div>
                    <span
                      className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                        selectedMethod === "afterpay"
                          ? "border-primary bg-primary"
                          : "border-gray-300"
                      }`}
                    >
                      {selectedMethod === "afterpay" && (
                        <i className="fas fa-check text-white text-[10px]"></i>
                      )}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    Payez en 4 versements de{" "}
                    <span className="font-semibold text-gray-900">
                      {afterpayInstallmentStr} {currency}
                    </span>
                    , toutes les 2 semaines.
                  </p>
                  <div className="mt-3">
                    <span className="text-2xl font-bold text-gray-900">
                      {afterpayTotalStr} {currency}
                    </span>
                    <span className="block text-xs text-amber-700 mt-0.5">
                      Inclut +{feePercentStr} % de frais Afterpay
                    </span>
                  </div>
                </button>
              ) : (
                <div className="rounded-xl border-2 border-dashed border-gray-200 p-4 flex flex-col items-center justify-center text-center">
                  <span className="w-6 h-6 bg-gray-400 text-white font-bold text-sm rounded mb-2 flex items-center justify-center">
                    A
                  </span>
                  <p className="text-sm text-gray-400">
                    {isLoading
                      ? "Vérification de la disponibilité d'Afterpay…"
                      : "Afterpay n'est pas disponible pour ce montant."}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Panneau Carte bancaire */}
          <div className={selectedMethod === "card" ? "space-y-4" : "hidden"}>
            <div className="bg-gradient-to-r from-primary/10 to-secondary/10 p-4 rounded-xl border">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600 mb-1">
                  Montant à payer par carte
                </p>
                <p className="text-3xl font-bold text-primary">
                  {amount} {currency}
                </p>
              </div>
            </div>

            <div>
              <h4 className="text-base font-semibold text-gray-800 flex items-center">
                <i className="fas fa-credit-card text-blue-600 mr-2"></i>
                Coordonnées de la carte
              </h4>
              <p className="text-sm text-gray-600 mt-1">
                Cartes acceptées : Visa, Mastercard, American Express
              </p>
            </div>

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
          </div>

          {/* Panneau Afterpay — toujours monté pour permettre l'attache du bouton Square */}
          <div className={selectedMethod === "afterpay" && afterpayAvailable ? "space-y-4" : "hidden"}>
            <div>
              <h4 className="text-base font-semibold text-gray-800 flex items-center">
                <span className="w-6 h-6 bg-black text-white font-bold text-sm rounded mr-2 flex items-center justify-center">
                  A
                </span>
                Payer en 4 fois avec Afterpay
              </h4>
              <p className="text-sm text-gray-600 mt-1">
                4 versements de {afterpayInstallmentStr} {currency}, toutes les 2
                semaines, sans intérêt.
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex items-start">
                <i className="fas fa-info-circle text-amber-600 mt-0.5 mr-2"></i>
                <p className="text-amber-900 font-medium">
                  Des frais additionnels de {feePercentStr} % s'appliquent au
                  paiement par Afterpay.
                </p>
              </div>
              <div className="pl-6 space-y-1 text-gray-700">
                <div className="flex justify-between">
                  <span>Sous-total</span>
                  <span className="font-medium">{baseAmount.toFixed(2)} {currency}</span>
                </div>
                <div className="flex justify-between">
                  <span>Frais Afterpay ({feePercentStr} %)</span>
                  <span className="font-medium">+{afterpayFeeStr} {currency}</span>
                </div>
                <div className="flex justify-between border-t border-amber-200 pt-1 mt-1">
                  <span className="font-semibold text-gray-900">Total Afterpay</span>
                  <span className="font-bold text-amber-900">
                    {afterpayTotalStr} {currency}
                  </span>
                </div>
              </div>
            </div>

            <p className="text-sm text-gray-600">
              Cliquez sur le bouton ci-dessous pour finaliser votre paiement en 4
              fois via Afterpay.
            </p>

            <div
              id="afterpay-button"
              ref={afterpayContainerRef}
              className="min-h-[50px]"
            />
          </div>

          {/* Garanties de sécurité */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t">
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
