import apiService from './api';

// Le SDK Square In-App Payments est un module natif : il ne fonctionne que dans
// un build natif (development build / EAS), pas dans Expo Go. On le charge de
// façon paresseuse pour que le reste de l'app reste utilisable dans Expo Go.
type SquareSdk = typeof import('react-native-square-in-app-payments');

let appIdConfigured = false;

const NATIVE_UNAVAILABLE =
  "Le paiement par carte nécessite un build natif de l'application " +
  '(development build / EAS). Il n’est pas disponible dans Expo Go.';

function toFriendlyError(error: any): Error {
  const message: string = error?.message || '';
  if (
    /native|turbomodule|undefined is not|null is not|RNSQIP|cannot read/i.test(
      message,
    )
  ) {
    return new Error(NATIVE_UNAVAILABLE);
  }
  return error instanceof Error ? error : new Error(String(error));
}

async function ensureConfigured(): Promise<SquareSdk> {
  let sq: SquareSdk;
  try {
    sq = await import('react-native-square-in-app-payments');
  } catch {
    throw new Error(NATIVE_UNAVAILABLE);
  }

  if (!appIdConfigured) {
    const config = await apiService.getSquareConfig();
    if (!config?.applicationId) {
      throw new Error('Configuration de paiement Square indisponible.');
    }
    try {
      sq.SQIPCore.setSquareApplicationId(config.applicationId);
    } catch (error) {
      throw toFriendlyError(error);
    }
    appIdConfigured = true;
  }

  return sq;
}

/**
 * Ouvre la feuille de saisie de carte native de Square, récupère le nonce de
 * carte et le transmet à `processNonce` (qui doit régler le paiement côté
 * backend, ex: POST /api/transfers/:id/pay). La feuille affiche l’état de
 * traitement puis se ferme. La promesse :
 *  - résout quand le paiement backend a réussi,
 *  - rejette avec `Error('CANCELLED')` si l’utilisateur annule,
 *  - rejette avec le message d’erreur sinon.
 */
export async function payWithCard(
  processNonce: (nonce: string) => Promise<void>,
): Promise<void> {
  const sq = await ensureConfigured();

  return new Promise<void>((resolve, reject) => {
    let succeeded = false;

    try {
      sq.SQIPCardEntry.startCardEntryFlow(
        false, // collectPostalCode
        async (cardDetails) => {
          const nonce = cardDetails.nonce;
          if (!nonce) {
            return {
              success: false,
              errorMessage: 'Carte invalide, veuillez réessayer.',
            };
          }
          try {
            await processNonce(nonce);
            succeeded = true;
            return { success: true, onCardEntryComplete: () => resolve() };
          } catch (error: any) {
            return {
              success: false,
              errorMessage: error?.message || 'Le paiement a été refusé.',
            };
          }
        },
        () => {
          if (!succeeded) {
            reject(new Error('CANCELLED'));
          }
        },
      );
    } catch (error) {
      reject(toFriendlyError(error));
    }
  });
}
