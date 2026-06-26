import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
import apiService from "../services/api";
import { payWithCard } from "../services/payment";
import { useI18n } from "../lib/i18n";

interface TransferFormData {
  recipientName: string;
  recipientPhone: string;
  amount: string;
  destinationCountry: string;
  deliveryMethod: string;
}

interface Country {
  code: string;
  name: string;
  currency: string;
}

export default function TransferScreen() {
  const [formData, setFormData] = useState<TransferFormData>({
    recipientName: "",
    recipientPhone: "",
    amount: "",
    destinationCountry: "",
    deliveryMethod: "mobile",
  });

  const [fees, setFees] = useState(0);
  const [exchangeRate, setExchangeRate] = useState(1);
  const [receivedAmount, setReceivedAmount] = useState(0);
  const [destinationCurrency, setDestinationCurrency] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { t } = useI18n();

  const countries: Country[] = [
    { code: "BI", name: "Burundi", currency: "BIF" },
    { code: "CA", name: "Canada", currency: "CAD" },
  ];

  // Mêmes valeurs que l'app web ("mobile" / "bank") pour des données synchronisées.
  const deliveryMethods = [
    { id: "mobile", label: t("transfer.mobileMoney"), icon: "📱" },
    { id: "bank", label: t("transfer.bankTransfer"), icon: "🏦" },
  ];

  useEffect(() => {
    if (formData.destinationCountry && formData.amount) {
      fetchExchangeRate();
    }
  }, [formData.destinationCountry, formData.amount]);

  const fetchExchangeRate = async () => {
    try {
      const country = countries.find(
        (c) => c.code === formData.destinationCountry,
      );
      if (country) {
        const rateData = await apiService.getExchangeRate(
          "CAD",
          country.currency,
        );
        setExchangeRate(rateData.rate);
        setDestinationCurrency(country.currency);
        calculateTotal(formData.amount, rateData.rate);
      }
    } catch (error) {
      console.error("Failed to fetch exchange rate:", error);
      Alert.alert(t("common.error"), t("transfer.rateError"));
    }
  };

  const calculateTotal = (amount: string, rate: number = exchangeRate) => {
    const numAmount = parseFloat(amount) || 0;
    const calculatedFees = 0; // Frais à zéro, aligné sur l'app web
    const received = numAmount * rate;

    setFees(calculatedFees);
    setReceivedAmount(received);
  };

  const handleAmountChange = (amount: string) => {
    setFormData({ ...formData, amount });
    calculateTotal(amount);
  };

  const handleCountryChange = (countryCode: string) => {
    setFormData({ ...formData, destinationCountry: countryCode });
    const country = countries.find((c) => c.code === countryCode);
    if (country) {
      setDestinationCurrency(country.currency);
    }
  };

  const handleSubmit = () => {
    if (
      !formData.recipientName ||
      !formData.recipientPhone ||
      !formData.amount ||
      !formData.destinationCountry
    ) {
      Alert.alert(t("common.error"), t("transfer.fillRequired"));
      return;
    }

    Alert.alert(
      t("transfer.confirmTitle"),
      t("transfer.confirmMessage", {
        amount: formData.amount,
        name: formData.recipientName,
      }),
      [
        { text: t("common.cancel"), style: "cancel" },
        { text: t("transfer.continue"), onPress: processTransfer },
      ],
    );
  };

  const resetForm = () => {
    setFormData({
      recipientName: "",
      recipientPhone: "",
      amount: "",
      destinationCountry: "",
      deliveryMethod: "mobile",
    });
    setFees(0);
    setReceivedAmount(0);
    setExchangeRate(1);
    setDestinationCurrency("");
  };

  const processTransfer = async () => {
    const country = countries.find(
      (c) => c.code === formData.destinationCountry,
    );

    setSubmitting(true);
    try {
      // 1) Créer le transfert (même payload que le web) -> statut "pending".
      const transfer = await apiService.createTransfer({
        amount: parseFloat(formData.amount),
        currency: "CAD",
        recipientName: formData.recipientName,
        recipientPhone: formData.recipientPhone,
        destinationCountry: country?.name || formData.destinationCountry,
        destinationCurrency: country?.currency || destinationCurrency,
        exchangeRate,
        fees,
        receivedAmount,
        deliveryMethod: formData.deliveryMethod,
      });

      // 2) Paiement par carte via la feuille native Square, puis règlement
      //    côté backend (POST /api/transfers/:id/pay) avec le nonce.
      await payWithCard(async (nonce) => {
        await apiService.payTransfer(transfer.id, nonce, "card");
      });

      Alert.alert(t("transfer.paidTitle"), t("transfer.paidMessage"));
      resetForm();
    } catch (error: any) {
      if (error?.message === "CANCELLED") {
        Alert.alert(t("transfer.cancelledTitle"), t("transfer.cancelledMessage"));
        resetForm();
      } else {
        Alert.alert(t("common.error"), error?.message || t("transfer.paymentFailed"));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t("transfer.title")}</Text>
        <Text style={styles.subtitle}>{t("transfer.subtitle")}</Text>
      </View>

      <View style={styles.form}>
        {/* Recipient Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("transfer.recipientInfo")}</Text>

          <TextInput
            style={styles.input}
            placeholder={t("transfer.recipientNamePlaceholder")}
            value={formData.recipientName}
            onChangeText={(text) =>
              setFormData({ ...formData, recipientName: text })
            }
          />

          <TextInput
            style={styles.input}
            placeholder={t("transfer.phonePlaceholder")}
            value={formData.recipientPhone}
            onChangeText={(text) =>
              setFormData({ ...formData, recipientPhone: text })
            }
            keyboardType="phone-pad"
          />
        </View>

        {/* Amount */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("transfer.amountToSend")}</Text>
          <View style={styles.amountContainer}>
            <TextInput
              style={styles.amountInput}
              placeholder="0.00"
              value={formData.amount}
              onChangeText={handleAmountChange}
              keyboardType="numeric"
            />
            <Text style={styles.currency}>CAD</Text>
          </View>
        </View>

        {/* Destination Country */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("transfer.destinationCountry")}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.countryList}>
              {countries.map((country) => (
                <TouchableOpacity
                  key={country.code}
                  style={[
                    styles.countryButton,
                    formData.destinationCountry === country.code &&
                      styles.countryButtonSelected,
                  ]}
                  onPress={() =>
                    setFormData({
                      ...formData,
                      destinationCountry: country.code,
                    })
                  }
                >
                  <Text style={styles.countryFlag}>{country.code}</Text>
                  <Text style={styles.countryName}>{country.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Delivery Method */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("transfer.deliveryMethod")}</Text>
          {deliveryMethods.map((method) => (
            <TouchableOpacity
              key={method.id}
              style={[
                styles.methodButton,
                formData.deliveryMethod === method.id &&
                  styles.methodButtonSelected,
              ]}
              onPress={() =>
                setFormData({ ...formData, deliveryMethod: method.id })
              }
            >
              <Text style={styles.methodIcon}>{method.icon}</Text>
              <Text style={styles.methodLabel}>{method.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Summary */}
        {formData.amount && (
          <View style={styles.summary}>
            <Text style={styles.summaryTitle}>{t("transfer.summary")}</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{t("transfer.amountSent")}</Text>
              <Text style={styles.summaryValue}>{formData.amount} CAD</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{t("transfer.fees")}</Text>
              <Text style={styles.summaryValue}>{fees.toFixed(2)} CAD</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{t("transfer.totalToPay")}</Text>
              <Text style={styles.summaryValueTotal}>
                {(parseFloat(formData.amount) + fees).toFixed(2)} CAD
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{t("transfer.received")}</Text>
              <Text style={styles.summaryValue}>
                {receivedAmount.toFixed(0)} {destinationCurrency}
              </Text>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          <Text style={styles.submitButtonText}>
            {submitting ? t("transfer.processing") : t("transfer.payTransfer")}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    backgroundColor: "#FF6B35",
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: "#fff",
    opacity: 0.9,
  },
  form: {
    padding: 20,
  },
  section: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 10,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 10,
    backgroundColor: "#f9f9f9",
  },
  amountContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    backgroundColor: "#f9f9f9",
  },
  amountInput: {
    flex: 1,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 20,
    fontWeight: "bold",
  },
  currency: {
    paddingHorizontal: 15,
    fontSize: 16,
    color: "#666",
    fontWeight: "bold",
  },
  countryList: {
    flexDirection: "row",
  },
  countryButton: {
    padding: 15,
    margin: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
    minWidth: 100,
  },
  countryButtonSelected: {
    borderColor: "#FF6B35",
    backgroundColor: "#FFF5F1",
  },
  countryFlag: {
    fontSize: 20,
    marginBottom: 5,
  },
  countryName: {
    fontSize: 12,
    textAlign: "center",
    color: "#333",
  },
  methodButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  methodButtonSelected: {
    borderColor: "#FF6B35",
    backgroundColor: "#FFF5F1",
  },
  methodIcon: {
    fontSize: 20,
    marginRight: 15,
  },
  methodLabel: {
    fontSize: 16,
    color: "#333",
  },
  summary: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 15,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 16,
    color: "#666",
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  summaryValueTotal: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FF6B35",
  },
  submitButton: {
    backgroundColor: "#FF6B35",
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});
