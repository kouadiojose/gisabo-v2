import { storage } from "./storage";
import { sendAfterpayReminderEmail } from "./emailService";

const DAY = 24 * 60 * 60 * 1000;

/**
 * Parcourt les transferts payés via Afterpay et envoie un rappel par email au
 * client (copie interne en BCC) lorsqu'une des échéances 2, 3 ou 4 approche.
 * Idempotent : un rappel n'est envoyé qu'une fois par échéance (table
 * afterpay_reminders). Enregistré seulement après un envoi réussi → réessai
 * automatique au prochain passage en cas d'échec.
 */
export async function processAfterpayReminders(): Promise<void> {
  try {
    const transfers = await storage.getAfterpayTransfers();
    if (transfers.length === 0) return;
    const now = Date.now();
    let sent = 0;

    for (const tr of transfers) {
      const base = new Date(tr.createdAt).getTime();
      const amountPer = (Number(tr.amount) / 4).toFixed(2);

      // Échéances 2, 3, 4 : +14, +28, +42 jours après le paiement initial
      for (const i of [2, 3, 4]) {
        const due = base + (i - 1) * 14 * DAY;
        const daysUntil = Math.floor((due - now) / DAY);
        // Rappel quand l'échéance est proche (0 à 3 jours) ou juste dépassée
        if (daysUntil > 3 || daysUntil < -1) continue;

        if (await storage.hasAfterpayReminder(tr.id, i)) continue;

        const user = await storage.getUser(tr.userId);
        if (!user?.email) continue;

        const refNumber = `REF-${tr.id.toString().padStart(7, "0")}`;
        const dueDateStr = new Date(due).toLocaleDateString("fr-FR");
        try {
          await sendAfterpayReminderEmail({
            to: user.email,
            firstName: user.firstName,
            refNumber,
            installment: i,
            dueDateStr,
            amountPerInstallment: amountPer,
            deliveryMethod: tr.deliveryMethod,
          });
          await storage.recordAfterpayReminder(tr.id, i);
          sent++;
          console.log(
            `📅 [AFTERPAY] Rappel échéance ${i}/4 envoyé pour ${refNumber}`,
          );
        } catch (e) {
          console.error(
            `🚨 [AFTERPAY] Échec rappel ${refNumber} échéance ${i}:`,
            e,
          );
        }
      }
    }
    if (sent > 0) {
      console.log(`📅 [AFTERPAY] ${sent} rappel(s) d'échéance envoyé(s).`);
    }
  } catch (e) {
    console.error("🚨 [AFTERPAY] processAfterpayReminders:", e);
  }
}
