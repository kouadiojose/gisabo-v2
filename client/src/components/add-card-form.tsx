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

  // Init une seule fois au montage. (Ne PAS dépendre de `t` : il change
  // d'identité à chaque rendu et ferait ré-attacher la carte en boucle.)
  useEffect(() => {
    let mounted = true;
    let cardInstance: any = null;

    const waitForContainer = async () => {
      let attempts = 0;
      while (attempts < 20 && !containerRef.current) {
        await new Promise((r) => setTimeout(r, 100));
        attempts++;
      }
      return containerRef.current;
    };

    const init = async () => {
      try {
        let attempts = 0;
        while (!window.Square && attempts < 50) {
          await new Promise((r) => setTimeout(r, 100));
          attempts++;
        }
        if (!window.Square) throw new Error("SDK_NOT_LOADED");

        const container = await waitForContainer();
        if (!container || !mounted) return;

        const applicationId = import.meta.env.VITE_SQUARE_APPLICATION_ID;
        const locationId = import.meta.env.VITE_SQUARE_LOCATION_ID;
        if (!applicationId || !locationId) throw new Error("CONFIG_MISSING");

        const payments = window.Square.payments(applicationId, locationId);
        cardInstance = await payments.card();
        if (!mounted) return;
        await cardInstance.attach(container);
        if (!mounted) return;
        setCard(cardInstance);
        setIsLoading(false);
      } catch (e: any) {
        if (!mounted) return;
        setError("load");
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
  }, []);

  const handleSubmit = async () => {
    if (!card || tokenizing) return;
    setTokenizing(true);
    setError(null);
    try {
      const result = await card.tokenize();
      if (result.status === "OK") {
        onToken(result.token);
      } else {
        setError("invalid");
        setTokenizing(false);
      }
    } catch {
      setError("invalid");
      setTokenizing(false);
    }
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg max-w-md">
      {isLoading && (
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      )}
      <div
        ref={containerRef}
        className={`border-2 border-gray-200 rounded-lg p-4 min-h-[120px] ${
          isLoading ? "hidden" : ""
        }`}
        style={{ backgroundColor: "#fff" }}
      />
      {error && (
        <p className="text-sm text-red-600">
          {error === "load"
            ? t("profile.payment.cardLoadError")
            : t("profile.payment.cardInvalid")}
        </p>
      )}
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
