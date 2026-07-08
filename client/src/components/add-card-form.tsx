import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";

declare global {
  interface Window {
    Square: any;
  }
}

interface AddCardFormProps {
  onToken: (token: string) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

/**
 * Saisie de carte via le SDK Square Web Payments. La carte est tokenisée
 * côté client : le numéro ne transite jamais par notre serveur.
 */
export default function AddCardForm({
  onToken,
  onCancel,
  isSubmitting,
}: AddCardFormProps) {
  const { t } = useLanguage();
  const [card, setCard] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tokenizing, setTokenizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;
    let cardInstance: any = null;

    const init = async () => {
      try {
        let attempts = 0;
        while (!window.Square && attempts < 50) {
          await new Promise((r) => setTimeout(r, 100));
          attempts++;
        }
        if (!window.Square) throw new Error("SDK_NOT_LOADED");

        const applicationId = import.meta.env.VITE_SQUARE_APPLICATION_ID;
        const locationId = import.meta.env.VITE_SQUARE_LOCATION_ID;
        if (!applicationId || !locationId) throw new Error("CONFIG_MISSING");

        const payments = window.Square.payments(applicationId, locationId);
        cardInstance = await payments.card();
        if (!mounted) return;
        await cardInstance.attach(containerRef.current);
        setCard(cardInstance);
        setIsLoading(false);
      } catch (e: any) {
        if (!mounted) return;
        setError(t("profile.payment.cardLoadError"));
        setIsLoading(false);
      }
    };

    init();
    return () => {
      mounted = false;
      if (cardInstance) {
        try {
          cardInstance.destroy();
        } catch {
          /* ignore */
        }
      }
    };
  }, [t]);

  const handleSubmit = async () => {
    if (!card || tokenizing) return;
    setTokenizing(true);
    try {
      const result = await card.tokenize();
      if (result.status === "OK") {
        onToken(result.token);
      } else {
        setError(t("profile.payment.cardInvalid"));
        setTokenizing(false);
      }
    } catch {
      setError(t("profile.payment.cardInvalid"));
      setTokenizing(false);
    }
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg max-w-md">
      {isLoading && (
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      )}
      <div ref={containerRef} />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <Button
          onClick={handleSubmit}
          disabled={!card || tokenizing || isSubmitting}
        >
          {tokenizing || isSubmitting
            ? t("common.loading")
            : t("profile.payment.saveCard")}
        </Button>
        <Button variant="outline" onClick={onCancel} disabled={tokenizing}>
          {t("common.cancel")}
        </Button>
      </div>
    </div>
  );
}
