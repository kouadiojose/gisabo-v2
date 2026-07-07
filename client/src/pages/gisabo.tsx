import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { isAuthenticated, getAuthToken } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ExchangeRate } from "@/lib/types";
import { useLanguage } from "@/lib/i18n";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import SquarePayment from "@/components/square-payment";

const countries = [
  { code: "BI", name: "Burundi", currency: "BIF", flag: "🇧🇮" },
];

const sendingCountries = [
  { code: "CA", name: "Canada", currency: "CAD", flag: "🇨🇦" },
  { code: "CH", name: "Suisse", currency: "CHF", flag: "🇨🇭" },
  { code: "SE", name: "Suède", currency: "SEK", flag: "🇸🇪" },
];

export default function Gisabo() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { t } = useLanguage();
  const authenticated = isAuthenticated();

  const [step, setStep] = useState(1); // 1: Formulaire, 2: Récapitulatif, 3: Paiement
  const [transferData, setTransferData] = useState<any>(null);
  const [formData, setFormData] = useState({
    // Détails du bénéficiaire
    recipientFirstName: "",
    recipientLastName: "",
    recipientPhone: "",

    // Détails de la transaction
    sendingCountry: "CA",
    // Burundi est la seule destination disponible : pré-sélectionnée par défaut.
    destinationCountry: "BI",
    sendingCurrency: "CAD",
    receivingCurrency: "",
    amount: "",
    deliveryMethod: "",
    bankName: "",
    accountNumber: "",
    note: "",
  });

  useEffect(() => {
    if (!authenticated) {
      toast({
        title: t("gisabo.loginRequired"),
        description: t("gisabo.loginRequiredDesc"),
        variant: "destructive",
      });
      navigate("/login");
    }
  }, [authenticated, navigate, toast]);

  const selectedDestinationCountry = countries.find(
    (c) => c.code === formData.destinationCountry,
  );
  const selectedSendingCountry = sendingCountries.find(
    (c) => c.code === formData.sendingCountry,
  );

  // Auto-update currencies when countries change
  useEffect(() => {
    if (selectedSendingCountry) {
      setFormData((prev) => ({
        ...prev,
        sendingCurrency: selectedSendingCountry.currency,
      }));
    }
  }, [selectedSendingCountry]);

  useEffect(() => {
    if (selectedDestinationCountry) {
      setFormData((prev) => ({
        ...prev,
        receivingCurrency: selectedDestinationCountry.currency,
      }));
    }
  }, [selectedDestinationCountry]);

  const { data: exchangeRate } = useQuery<ExchangeRate>({
    queryKey: [
      "/api/exchange-rates",
      formData.sendingCurrency,
      formData.receivingCurrency,
    ],
    enabled:
      !!formData.receivingCurrency &&
      !!formData.amount &&
      parseFloat(formData.amount) > 0,
    queryFn: async () => {
      const response = await fetch(
        `/api/exchange-rates?from=${formData.sendingCurrency}&to=${formData.receivingCurrency}`,
      );
      if (!response.ok) throw new Error("Failed to fetch exchange rate");
      return response.json();
    },
  });

  const createTransferMutation = useMutation({
    mutationFn: async (transferData: any) => {
      const token = getAuthToken();
      if (!token) {
        throw new Error(t("gisabo.loginRequiredDesc"));
      }

      const response = await fetch("/api/transfers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(transferData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create transfer");
      }

      return response.json();
    },
    onSuccess: (transfer) => {
      setTransferData(transfer);
      setStep(3);
      queryClient.invalidateQueries({ queryKey: ["/api/transfers"] });
    },
    onError: (error: any) => {
      toast({
        title: t("gisabo.error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const processPaymentMutation = useMutation({
    mutationFn: async ({
      transferId,
      paymentToken,
      paymentMethod,
    }: {
      transferId: number;
      paymentToken: string;
      paymentMethod: "card" | "afterpay";
    }) => {
      const token = getAuthToken();
      if (!token) {
        throw new Error(t("gisabo.loginRequiredPayment"));
      }

      const response = await fetch(`/api/transfers/${transferId}/pay`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ paymentToken, paymentMethod }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Payment failed");
      }

      return response.json();
    },
    onSuccess: (paymentResult) => {
      // Sauvegarder les données du paiement pour la page de succès
      const paymentData = {
        transfer: {
          id: transferData?.id || 0,
          amount: formData.amount,
          currency: formData.sendingCurrency,
          recipientName: `${formData.recipientFirstName} ${formData.recipientLastName}`,
          recipientPhone: formData.recipientPhone,
          destinationCountry: selectedDestinationCountry?.name || "",
          deliveryMethod:
            formData.deliveryMethod === "mobile"
              ? t("gisabo.mobileMoney")
              : t("gisabo.bankAccount"),
        },
        paymentId: paymentResult.paymentId || "",
        timestamp: paymentResult.timestamp || new Date().toISOString(),
      };

      localStorage.setItem("lastPaymentSuccess", JSON.stringify(paymentData));
      navigate("/payment-success");
      queryClient.invalidateQueries({ queryKey: ["/api/transfers"] });
    },
    onError: (error: any) => {
      toast({
        title: t("gisabo.paymentError"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const calculateTransfer = () => {
    const sendAmount = parseFloat(formData.amount) || 0;
    const fees = 0; // Frais à zéro comme demandé
    const rate = exchangeRate?.rate || 1;
    const receivedAmount = sendAmount * rate;

    return {
      sendAmount: sendAmount.toFixed(2),
      fees: fees.toFixed(2),
      total: (sendAmount + fees).toFixed(2),
      rate: rate.toFixed(2),
      receivedAmount: receivedAmount.toLocaleString(),
    };
  };

  const calculation = calculateTransfer();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (step === 1) {
      // Validation étape 1
      if (
        !formData.recipientFirstName ||
        !formData.recipientLastName ||
        !formData.recipientPhone ||
        !formData.destinationCountry ||
        !formData.amount
      ) {
        toast({
          title: t("gisabo.incompleteForm"),
          description: t("gisabo.incompleteFormDesc"),
          variant: "destructive",
        });
        return;
      }

      if (parseFloat(formData.amount) < 1) {
        toast({
          title: t("gisabo.invalidAmount"),
          description: t("gisabo.invalidAmountDesc").replace(
            "{currency}",
            formData.sendingCurrency,
          ),
          variant: "destructive",
        });
        return;
      }

      setStep(2);
    } else if (step === 2) {
      // Créer le transfert
      const transferData = {
        amount: parseFloat(calculation.sendAmount),
        currency: formData.sendingCurrency,
        recipientName: `${formData.recipientFirstName} ${formData.recipientLastName}`,
        recipientPhone: formData.recipientPhone,
        destinationCountry: selectedDestinationCountry?.name || "",
        destinationCurrency: formData.receivingCurrency,
        exchangeRate: parseFloat(calculation.rate),
        fees: parseFloat(calculation.fees),
        receivedAmount: parseFloat(
          calculation.receivedAmount.replace(/,/g, ""),
        ),
        deliveryMethod: formData.deliveryMethod,
      };

      createTransferMutation.mutate(transferData);
    }
  };

  const handlePayment = () => {
    // Intégration Square à faire - pour l'instant simulation
    const mockPaymentToken = `square_payment_${Date.now()}`;

    if (createTransferMutation.data?.id) {
      processPaymentMutation.mutate({
        transferId: createTransferMutation.data.id,
        paymentToken: mockPaymentToken,
        paymentMethod: "card",
      });
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (!authenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold font-poppins mb-4">
              Transfert d'Argent <span className="text-secondary">GISABO</span>
            </h1>
            <p className="text-xl text-gray-100 max-w-3xl mx-auto">
              Service de transfert rapide, sécurisé et abordable vers l'Afrique
            </p>
          </div>

          {/* Progress Steps */}
          <div className="flex justify-center items-center space-x-4 max-w-2xl mx-auto">
            {[
              { num: 1, label: t("gisabo.inputForm") },
              { num: 2, label: t("gisabo.summary") },
              { num: 3, label: t("gisabo.squarePayment") },
            ].map((stepItem, index) => (
              <div key={stepItem.num} className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                    step >= stepItem.num
                      ? "bg-secondary text-white"
                      : "bg-white/20 text-white/60"
                  }`}
                >
                  {step > stepItem.num ? (
                    <i className="fas fa-check"></i>
                  ) : (
                    stepItem.num
                  )}
                </div>
                <span
                  className={`ml-2 text-sm ${step >= stepItem.num ? "text-white" : "text-white/60"}`}
                >
                  {stepItem.label}
                </span>
                {index < 2 && (
                  <div
                    className={`w-8 h-0.5 mx-4 ${step > stepItem.num ? "bg-secondary" : "bg-white/20"}`}
                  ></div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Étape 1: Formulaire de saisie */}
        {step === 1 && (
          <div className="max-w-7xl mx-auto">
            <form onSubmit={handleSubmit}>
              <div className="grid lg:grid-cols-3 gap-8">
                {/* Bloc gauche: Détails du bénéficiaire et de la transaction */}
                <div className="lg:col-span-2 space-y-8">
                  {/* Section Bénéficiaire */}
                  <Card className="shadow-lg">
                    <CardHeader className="bg-primary/5 border-b">
                      <CardTitle className="font-poppins text-xl flex items-center">
                        <i className="fas fa-user-check text-primary mr-3"></i>
                        {t("gisabo.recipientDetails")}
                      </CardTitle>
                      <p className="text-gray-600">
                        {t("gisabo.recipientInfo")}
                      </p>
                    </CardHeader>
                    <CardContent className="p-8">
                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <Label
                            htmlFor="recipientFirstName"
                            className="text-base font-semibold"
                          >
                            {t("gisabo.firstName")} *
                          </Label>
                          <Input
                            id="recipientFirstName"
                            value={formData.recipientFirstName}
                            onChange={(e) =>
                              handleChange("recipientFirstName", e.target.value)
                            }
                            placeholder={t("gisabo.firstNamePlaceholder")}
                            className="mt-2 h-12 text-base"
                            required
                          />
                        </div>
                        <div>
                          <Label
                            htmlFor="recipientLastName"
                            className="text-base font-semibold"
                          >
                            {t("gisabo.lastName")} *
                          </Label>
                          <Input
                            id="recipientLastName"
                            value={formData.recipientLastName}
                            onChange={(e) =>
                              handleChange("recipientLastName", e.target.value)
                            }
                            placeholder={t("gisabo.lastNamePlaceholder")}
                            className="mt-2 h-12 text-base"
                            required
                          />
                        </div>
                      </div>

                      <div className="mt-6">
                        <Label
                          htmlFor="recipientPhone"
                          className="text-base font-semibold"
                        >
                          {t("gisabo.phone")} *
                        </Label>
                        <Input
                          id="recipientPhone"
                          type="tel"
                          value={formData.recipientPhone}
                          onChange={(e) =>
                            handleChange("recipientPhone", e.target.value)
                          }
                          placeholder={t("gisabo.phonePlaceholder")}
                          className="mt-2 h-12 text-base"
                          required
                        />
                        <p className="text-sm text-gray-500 mt-1">
                          Le bénéficiaire recevra une notification sur ce numéro
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Section Transaction */}
                  <Card className="shadow-lg">
                    <CardHeader className="bg-secondary/5 border-b">
                      <CardTitle className="font-poppins text-xl flex items-center">
                        <i className="fas fa-exchange-alt text-secondary mr-3"></i>
                        {t("gisabo.transactionDetails")}
                      </CardTitle>
                      <p className="text-gray-600">
                        {t("gisabo.transferInfo")}
                      </p>
                    </CardHeader>
                    <CardContent className="p-8">
                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <Label
                            htmlFor="sendingCountry"
                            className="text-base font-semibold"
                          >
                            {t("gisabo.sendingCountry")} *
                          </Label>
                          <Select
                            value={formData.sendingCountry}
                            onValueChange={(value) =>
                              handleChange("sendingCountry", value)
                            }
                          >
                            <SelectTrigger className="mt-2 h-12 text-base">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {sendingCountries.map((country) => (
                                <SelectItem
                                  key={country.code}
                                  value={country.code}
                                >
                                  {country.flag} {country.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label
                            htmlFor="destinationCountry"
                            className="text-base font-semibold"
                          >
                            {t("gisabo.destinationCountry")} *
                          </Label>
                          <Select
                            value={formData.destinationCountry}
                            onValueChange={(value) =>
                              handleChange("destinationCountry", value)
                            }
                            disabled
                          >
                            <SelectTrigger className="mt-2 h-12 text-base bg-gray-50 opacity-100 cursor-not-allowed">
                              <SelectValue
                                placeholder={t(
                                  "gisabo.selectCountryPlaceholder",
                                )}
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {countries.map((country) => (
                                <SelectItem
                                  key={country.code}
                                  value={country.code}
                                >
                                  {country.flag} {country.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-6 mt-6">
                        <div>
                          <Label className="text-base font-semibold">
                            {t("gisabo.sendingCurrency")}
                          </Label>
                          <div className="mt-2 h-12 px-4 py-3 bg-gray-50 border rounded-md flex items-center">
                            <span className="text-base font-medium">
                              {formData.sendingCurrency}
                            </span>
                            <span className="text-gray-500 ml-2">
                              ({selectedSendingCountry?.name})
                            </span>
                          </div>
                        </div>
                        <div>
                          <Label className="text-base font-semibold">
                            {t("gisabo.receivingCurrency")}
                          </Label>
                          <div className="mt-2 h-12 px-4 py-3 bg-gray-50 border rounded-md flex items-center">
                            <span className="text-base font-medium">
                              {formData.receivingCurrency ||
                                t("gisabo.selectCountry")}
                            </span>
                            {selectedDestinationCountry && (
                              <span className="text-gray-500 ml-2">
                                ({selectedDestinationCountry.name})
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="mt-6">
                        <Label
                          htmlFor="amount"
                          className="text-base font-semibold"
                        >
                          {t("gisabo.amountToSend")} *
                        </Label>
                        <div className="relative mt-2">
                          <Input
                            id="amount"
                            type="number"
                            step="0.01"
                            min="1"
                            max="1000"
                            placeholder="Ex: 100"
                            value={formData.amount}
                            onChange={(e) =>
                              handleChange("amount", e.target.value)
                            }
                            className="pr-20 h-14 text-xl font-semibold text-center"
                            required
                          />
                          <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                            <span className="text-lg font-semibold text-primary">
                              {formData.sendingCurrency}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          {t("gisabo.amountRange").replace(
                            "{currency}",
                            formData.sendingCurrency,
                          )}
                        </p>
                      </div>

                      <div className="mt-6">
                        <Label className="text-base font-semibold">
                          {t("gisabo.deliveryMethod")} *
                        </Label>
                        <RadioGroup
                          value={formData.deliveryMethod}
                          onValueChange={(value) =>
                            handleChange("deliveryMethod", value)
                          }
                          className="grid grid-cols-2 gap-4 mt-3"
                        >
                          <div className="flex items-center space-x-3">
                            <RadioGroupItem
                              value="mobile"
                              id="mobile"
                              className="mt-0"
                            />
                            <Label
                              htmlFor="mobile"
                              className="cursor-pointer flex-1 border-2 border-gray-200 rounded-xl p-4 hover:border-primary transition-all hover:shadow-md"
                            >
                              <div className="text-center">
                                <i className="fas fa-mobile-alt text-primary text-2xl mb-2 block"></i>
                                <p className="font-semibold text-base mb-1">
                                  {t("gisabo.mobileMoney")}
                                </p>
                                <p className="text-xs text-gray-600">
                                  {t("gisabo.onMobilePhone")}
                                </p>
                              </div>
                            </Label>
                          </div>
                          <div className="flex items-center space-x-3">
                            <RadioGroupItem
                              value="bank"
                              id="bank"
                              className="mt-0"
                            />
                            <Label
                              htmlFor="bank"
                              className="cursor-pointer flex-1 border-2 border-gray-200 rounded-xl p-4 hover:border-primary transition-all hover:shadow-md"
                            >
                              <div className="text-center">
                                <i className="fas fa-university text-primary text-2xl mb-2 block"></i>
                                <p className="font-semibold text-base mb-1">
                                  {t("gisabo.bankAccount")}
                                </p>
                                <p className="text-xs text-gray-600">
                                  {t("gisabo.bankTransfer")}
                                </p>
                              </div>
                            </Label>
                          </div>
                        </RadioGroup>
                      </div>

                      {/* Champs bancaires conditionnels */}
                      {formData.deliveryMethod === "bank" && (
                        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                          <h4 className="font-semibold text-blue-800 mb-4 flex items-center">
                            <i className="fas fa-university text-blue-600 mr-2"></i>
                            Informations bancaires
                          </h4>
                          <div className="grid gap-4">
                            <div>
                              <Label
                                htmlFor="bankName"
                                className="text-base font-semibold"
                              >
                                Nom de la banque *
                              </Label>
                              <Input
                                id="bankName"
                                value={formData.bankName}
                                onChange={(e) =>
                                  handleChange("bankName", e.target.value)
                                }
                                placeholder="Ex: Banque de Crédit de Bujumbura"
                                className="mt-2 h-12 text-base"
                                required={formData.deliveryMethod === "bank"}
                              />
                            </div>
                            <div>
                              <Label
                                htmlFor="accountNumber"
                                className="text-base font-semibold"
                              >
                                Numéro de compte *
                              </Label>
                              <Input
                                id="accountNumber"
                                value={formData.accountNumber}
                                onChange={(e) =>
                                  handleChange("accountNumber", e.target.value)
                                }
                                placeholder="Ex: 1234567890"
                                className="mt-2 h-12 text-base"
                                required={formData.deliveryMethod === "bank"}
                              />
                              <p className="text-sm text-blue-600 mt-1">
                                Saisissez le numéro de compte du bénéficiaire
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="mt-6">
                        <Label
                          htmlFor="note"
                          className="text-base font-semibold"
                        >
                          {t("gisabo.noteOptional")}
                        </Label>
                        <Textarea
                          id="note"
                          value={formData.note}
                          onChange={(e) => handleChange("note", e.target.value)}
                          placeholder="Message personnel pour le bénéficiaire..."
                          className="mt-2 min-h-[80px]"
                          rows={3}
                        />
                        <p className="text-sm text-gray-500 mt-1">
                          {t("gisabo.noteDescription")}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Bloc droit: Résumé partiel du calcul + Bouton */}
                <div className="lg:col-span-1">
                  <div className="sticky top-8">
                    {formData.amount && formData.destinationCountry ? (
                      <Card className="shadow-lg bg-gradient-to-br from-green-50 to-blue-50 border-green-200">
                        <CardHeader className="bg-gradient-to-r from-green-100 to-blue-100 border-b">
                          <CardTitle className="font-poppins text-lg flex items-center">
                            <i className="fas fa-calculator text-green-600 mr-2"></i>
                            {t("gisabo.calculationSummary")}
                          </CardTitle>
                          <p className="text-sm text-gray-600">
                            {t("gisabo.realtimePreview")}
                          </p>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                          <div className="text-center p-4 bg-white rounded-xl shadow-sm">
                            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                              <i className="fas fa-coins text-primary"></i>
                            </div>
                            <p className="text-sm font-medium text-gray-600 mb-1">
                              {t("gisabo.amountEntered")}
                            </p>
                            <p className="text-xl font-bold text-primary">
                              {calculation.sendAmount}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formData.sendingCurrency}
                            </p>
                          </div>

                          <div className="text-center p-4 bg-white rounded-xl shadow-sm">
                            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                              <i className="fas fa-percent text-green-600"></i>
                            </div>
                            <p className="text-sm font-medium text-gray-600 mb-1">
                              {t("gisabo.serviceFees")}
                            </p>
                            <p className="text-xl font-bold text-green-600">
                              {calculation.fees}
                            </p>
                            <p className="text-xs text-green-600">GRATUIT !</p>
                          </div>

                          <div className="text-center p-4 bg-white rounded-xl shadow-sm border-2 border-secondary/20">
                            <div className="w-10 h-10 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                              <i className="fas fa-gift text-secondary"></i>
                            </div>
                            <p className="text-sm font-medium text-gray-600 mb-1">
                              {t("gisabo.amountToReceive")}
                            </p>
                            <p className="text-xl font-bold text-secondary">
                              {calculation.receivedAmount}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formData.receivingCurrency}
                            </p>
                          </div>

                          <div className="p-4 bg-white rounded-xl border border-gray-200">
                            <div className="text-center">
                              <span className="text-base font-semibold text-gray-700 block">
                                {t("gisabo.totalToPay")}
                              </span>
                              <span className="text-2xl font-bold text-primary">
                                {calculation.total} {formData.sendingCurrency}
                              </span>
                            </div>
                          </div>

                          {/* Bouton Continuer */}
                          <Button
                            type="submit"
                            size="lg"
                            className="w-full bg-primary hover:bg-primary-600 text-white py-4 text-base font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
                          >
                            <i className="fas fa-arrow-right mr-2"></i>
                            {t("gisabo.continue")}
                          </Button>
                        </CardContent>
                      </Card>
                    ) : (
                      <Card className="shadow-lg">
                        <CardHeader className="bg-gray-50 border-b">
                          <CardTitle className="font-poppins text-lg flex items-center text-gray-600">
                            <i className="fas fa-info-circle text-gray-400 mr-2"></i>
                            {t("gisabo.calculationSummary")}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                          <div className="text-center text-gray-500">
                            <i className="fas fa-calculator text-4xl mb-4 opacity-30"></i>
                            <p className="text-base mb-4">
                              {t("gisabo.enterAmountInfo")}
                            </p>
                            <p className="text-sm">
                              {t("gisabo.calculationAppear")}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Étape 2: Page de récapitulatif */}
        {step === 2 && (
          <div className="max-w-4xl mx-auto space-y-8">
            <Card className="shadow-lg">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
                <CardTitle className="font-poppins text-2xl flex items-center">
                  <i className="fas fa-clipboard-check text-blue-600 mr-3"></i>
                  {t("gisabo.transferSummary")}
                </CardTitle>
                <p className="text-gray-600 text-lg">
                  {t("gisabo.verifyInfo")}
                </p>
              </CardHeader>
              <CardContent className="p-8 space-y-8">
                {/* Informations du bénéficiaire */}
                <div>
                  <h4 className="font-semibold text-xl text-gray-900 mb-4 flex items-center">
                    <i className="fas fa-user text-primary mr-2"></i>
                    Informations du bénéficiaire
                  </h4>
                  <div className="bg-gradient-to-r from-primary/5 to-primary/10 p-6 rounded-xl border border-primary/20">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                          <i className="fas fa-user text-primary"></i>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Nom complet</p>
                          <p className="font-semibold text-lg">
                            {formData.recipientFirstName}{" "}
                            {formData.recipientLastName}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-secondary/20 rounded-full flex items-center justify-center">
                          <i className="fas fa-phone text-secondary"></i>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Téléphone</p>
                          <p className="font-semibold text-lg">
                            {formData.recipientPhone}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                          <i className="fas fa-map-marker-alt text-green-600"></i>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Destination</p>
                          <p className="font-semibold text-lg">
                            {selectedDestinationCountry?.flag}{" "}
                            {selectedDestinationCountry?.name}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <i
                            className={`fas ${formData.deliveryMethod === "cash" ? "fa-hand-holding-usd" : "fa-mobile-alt"} text-blue-600`}
                          ></i>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">
                            Mode de réception
                          </p>
                          <p className="font-semibold text-lg">
                            {formData.deliveryMethod === "cash"
                              ? t("gisabo.cashWithdrawal")
                              : t("gisabo.mobileMoney")}
                          </p>
                        </div>
                      </div>
                    </div>

                    {formData.note && (
                      <div className="mt-6 p-4 bg-white rounded-lg border">
                        <p className="text-sm text-gray-600 mb-1">
                          Note personnelle
                        </p>
                        <p className="text-gray-800 italic">
                          "{formData.note}"
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <Separator className="my-8" />

                {/* Détails financiers détaillés */}
                <div>
                  <h4 className="font-semibold text-xl text-gray-900 mb-4 flex items-center">
                    <i className="fas fa-calculator text-green-600 mr-2"></i>
                    {t("gisabo.financialDetails")}
                  </h4>

                  <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-xl border border-green-200">
                    <div className="grid md:grid-cols-2 gap-6 mb-6">
                      <div className="space-y-4">
                        <div className="flex justify-between items-center p-3 bg-white rounded-lg shadow-sm">
                          <div className="flex items-center space-x-3">
                            <i className="fas fa-coins text-primary"></i>
                            <span>{t("gisabo.amountToSend")}</span>
                          </div>
                          <span className="font-semibold text-lg">
                            {calculation.sendAmount} {formData.sendingCurrency}
                          </span>
                        </div>

                        <div className="flex justify-between items-center p-3 bg-white rounded-lg shadow-sm">
                          <div className="flex items-center space-x-3">
                            <i className="fas fa-percent text-orange-600"></i>
                            <span>Frais de service</span>
                          </div>
                          <span className="font-semibold text-lg text-orange-600">
                            {calculation.fees} {formData.sendingCurrency}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex justify-between items-center p-3 bg-white rounded-lg shadow-sm">
                          <div className="flex items-center space-x-3">
                            <i className="fas fa-exchange-alt text-blue-600"></i>
                            <span>Taux de change</span>
                          </div>
                          <span className="font-semibold">
                            1 {formData.sendingCurrency} = {calculation.rate}{" "}
                            {formData.receivingCurrency}
                          </span>
                        </div>

                        <div className="flex justify-between items-center p-3 bg-white rounded-lg shadow-sm">
                          <div className="flex items-center space-x-3">
                            <i className="fas fa-clock text-purple-600"></i>
                            <span>Délai de transfert</span>
                          </div>
                          <span className="font-semibold text-green-600">
                            Instantané
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Résumé final */}
                    <div className="border-t border-gray-300 pt-6">
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="p-4 bg-white rounded-xl shadow-md">
                          <div className="text-center">
                            <p className="text-lg font-semibold text-gray-700 mb-2">
                              Total à payer
                            </p>
                            <p className="text-3xl font-bold text-primary">
                              {calculation.total} {formData.sendingCurrency}
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                              Montant + Frais
                            </p>
                          </div>
                        </div>

                        <div className="p-4 bg-gradient-to-r from-secondary/10 to-secondary/20 rounded-xl shadow-md border-2 border-secondary/30">
                          <div className="text-center">
                            <p className="text-lg font-semibold text-gray-700 mb-2">
                              Le bénéficiaire recevra
                            </p>
                            <p className="text-3xl font-bold text-secondary">
                              {calculation.receivedAmount}{" "}
                              {formData.receivingCurrency}
                            </p>
                            <p className="text-sm text-gray-600 mt-1">
                              Montant final après conversion
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Avertissement et conditions */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <i className="fas fa-exclamation-triangle text-yellow-600 mt-1"></i>
                    <div>
                      <p className="font-semibold text-yellow-800 mb-2">
                        Vérification importante
                      </p>
                      <ul className="text-sm text-yellow-700 space-y-1">
                        <li>
                          • Vérifiez que le nom et le numéro de téléphone du
                          bénéficiaire sont corrects
                        </li>
                        <li>
                          • Une fois le paiement effectué, cette transaction ne
                          pourra plus être modifiée
                        </li>
                        <li>
                          • Le bénéficiaire recevra une notification par SMS
                          avec les instructions
                        </li>
                        <li>
                          • En cas de problème, contactez notre service client
                          au +1 (613) 762-6686
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Boutons d'action */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4">
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                size="lg"
                className="px-8 py-3 border-gray-300 hover:bg-gray-50"
              >
                <i className="fas fa-arrow-left mr-2"></i>
                {t("gisabo.backToForm")}
              </Button>

              <div className="text-center">
                <p className="text-sm text-gray-600 mb-3">
                  En continuant, vous acceptez nos conditions d'utilisation
                </p>
                <Button
                  onClick={handleSubmit}
                  disabled={createTransferMutation.isPending}
                  size="lg"
                  className="bg-primary hover:bg-primary-600 text-white px-12 py-4 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
                >
                  {createTransferMutation.isPending ? (
                    <>
                      <i className="fas fa-spinner fa-spin mr-3"></i>
                      Création du transfert...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-credit-card mr-3"></i>
                      {t("gisabo.confirmPayment")}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Étape 3: Paiement Square */}
        {step === 3 && transferData && (
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Résumé final du transfert */}
            <Card className="shadow-lg">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
                <CardTitle className="font-poppins text-xl flex items-center">
                  <i className="fas fa-paper-plane text-blue-600 mr-3"></i>
                  Finalisation du transfert
                </CardTitle>
                <p className="text-gray-600">
                  Confirmez les détails avant le paiement
                </p>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="bg-white p-4 rounded-lg border">
                    <p className="text-sm text-gray-600 mb-1">Bénéficiaire</p>
                    <p className="font-semibold">
                      {formData.recipientFirstName} {formData.recipientLastName}
                    </p>
                    <p className="text-sm text-gray-600">
                      {selectedDestinationCountry?.flag}{" "}
                      {selectedDestinationCountry?.name}
                    </p>
                  </div>

                  <div className="bg-white p-4 rounded-lg border">
                    <p className="text-sm text-gray-600 mb-1">
                      {t("gisabo.deliveryMethod")}
                    </p>
                    <p className="font-semibold">
                      {formData.deliveryMethod === "mobile"
                        ? t("gisabo.mobileMoney")
                        : t("gisabo.bankAccount")}
                    </p>
                    {formData.deliveryMethod === "bank" &&
                      formData.bankName && (
                        <p className="text-sm text-gray-600">
                          {formData.bankName}
                        </p>
                      )}
                  </div>

                  <div className="bg-white p-4 rounded-lg border">
                    <p className="text-sm text-gray-600 mb-1">
                      Montant à recevoir
                    </p>
                    <p className="font-bold text-xl text-secondary">
                      {calculation.receivedAmount} {formData.receivingCurrency}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Composant de paiement Square réel */}
            <SquarePayment
              amount={calculation.total}
              currency={formData.sendingCurrency}
              onPaymentSuccess={(token, paymentMethod) => {
                processPaymentMutation.mutate({
                  transferId: transferData.id,
                  paymentToken: token,
                  paymentMethod,
                });
              }}
              onPaymentError={(error) => {
                toast({
                  title: t("gisabo.paymentError"),
                  description: error,
                  variant: "destructive",
                });
              }}
              isProcessing={processPaymentMutation.isPending}
            />

            {/* Support client */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <i className="fas fa-headset text-yellow-600 mt-1"></i>
                <div>
                  <p className="font-semibold text-yellow-800 mb-1">
                    Besoin d'aide ?
                  </p>
                  <p className="text-sm text-yellow-700">
                    Notre équipe est disponible 24h/24 pour vous assister.
                    Contactez-nous au <strong>+1 (613) 762-6686</strong> ou par
                    email à <strong>gisabonet@gmail.com</strong>
                  </p>
                </div>
              </div>
            </div>

            {/* Bouton retour */}
            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={() => setStep(2)}
                size="lg"
                className="px-8 py-3 border-gray-300 hover:bg-gray-50"
              >
                <i className="fas fa-arrow-left mr-2"></i>
                {t("gisabo.backToSummary")}
              </Button>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
