// reCAPTCHA v3 (invisible). Chargé et exécuté uniquement si une clé publique
// est configurée côté serveur (/api/public-config). Sinon, renvoie null et
// l'app fonctionne normalement sans captcha.

let siteKeyPromise: Promise<string> | null = null;
let scriptPromise: Promise<void> | null = null;

function getSiteKey(): Promise<string> {
  if (!siteKeyPromise) {
    siteKeyPromise = fetch("/api/public-config")
      .then((r) => r.json())
      .then((d) => (d && d.recaptchaSiteKey ? String(d.recaptchaSiteKey) : ""))
      .catch(() => "");
  }
  return siteKeyPromise;
}

function loadScript(siteKey: string): Promise<void> {
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("reCAPTCHA script load error"));
      document.head.appendChild(s);
    });
  }
  return scriptPromise;
}

export async function getRecaptchaToken(
  action: string,
): Promise<string | null> {
  try {
    const siteKey = await getSiteKey();
    if (!siteKey) return null; // captcha désactivé
    await loadScript(siteKey);
    const grecaptcha = (window as any).grecaptcha;
    if (!grecaptcha) return null;
    return await new Promise<string | null>((resolve) => {
      grecaptcha.ready(() => {
        grecaptcha
          .execute(siteKey, { action })
          .then((token: string) => resolve(token))
          .catch(() => resolve(null));
      });
    });
  } catch {
    return null;
  }
}
