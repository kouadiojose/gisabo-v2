import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { setAuthToken } from "@/lib/auth";
import { Link } from "wouter";
import Navbar from "@/components/navbar";

export default function Login() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail }),
      });
      // On considère toujours l'opération réussie (anti-énumération)
      await response.json().catch(() => ({}));
      setForgotSent(true);
    } catch {
      setForgotSent(true);
    } finally {
      setIsLoading(false);
    }
  };

  const finishLogin = (data: any) => {
    setAuthToken(data.token);
    toast({
      title: "Connexion réussie",
      description: `Bienvenue, ${data.user.firstName}!`,
    });
    navigate("/dashboard");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const loginData = {
        username: formData.email,
        password: formData.password
      };
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginData),
      });

      if (!response.ok) {
        const text = await response.text();
        let msg;
        try { msg = JSON.parse(text).message; } catch { msg = text; }
        throw new Error(msg || "Identifiants invalides");
      }

      const data = await response.json();

      // Compte protégé par 2FA : passer à l'étape de saisie du code
      if (data.requires2FA) {
        setPendingToken(data.pendingToken);
        setTwoFactorCode("");
        toast({
          title: "Vérification en deux étapes",
          description: "Entrez le code de votre application d'authentification.",
        });
        return;
      }

      finishLogin(data);
    } catch (error: any) {
      toast({
        title: "Erreur de connexion",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/login/2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pendingToken,
          token: twoFactorCode.replace(/\s/g, ""),
        }),
      });
      if (!response.ok) {
        const text = await response.text();
        let msg;
        try { msg = JSON.parse(text).message; } catch { msg = text; }
        throw new Error(msg || "Code invalide");
      }
      const data = await response.json();
      finishLogin(data);
    } catch (error: any) {
      toast({
        title: "Échec de la vérification",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <Card>
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-globe-africa text-white text-2xl"></i>
              </div>
              <CardTitle className="text-2xl font-bold font-poppins">
                {forgotMode
                  ? "Mot de passe oublié"
                  : pendingToken
                    ? "Vérification en deux étapes"
                    : "Connexion"}
              </CardTitle>
              <p className="text-gray-600">
                {forgotMode
                  ? "Recevez un lien de réinitialisation par email"
                  : pendingToken
                    ? "Entrez le code à 6 chiffres de votre application d'authentification"
                    : "Connectez-vous à votre compte GISABO"}
              </p>
            </CardHeader>

            <CardContent>
              {forgotMode ? (
                forgotSent ? (
                  <div className="text-center space-y-4">
                    <i className="fas fa-paper-plane text-primary text-3xl"></i>
                    <p className="text-gray-700">
                      Si un compte existe pour{" "}
                      <strong>{forgotEmail}</strong>, un email de
                      réinitialisation vient d'être envoyé. Vérifiez votre boîte
                      de réception (et les spams).
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setForgotMode(false);
                        setForgotSent(false);
                        setForgotEmail("");
                      }}
                      className="text-sm text-primary hover:text-primary-600"
                    >
                      ← Retour à la connexion
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleForgot} className="space-y-6">
                    <div>
                      <Label htmlFor="forgotEmail">Adresse email</Label>
                      <Input
                        id="forgotEmail"
                        type="email"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        required
                        autoFocus
                        className="mt-1"
                        placeholder="votre@email.com"
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={isLoading || !forgotEmail}
                      className="w-full bg-primary hover:bg-primary-600 text-white"
                    >
                      {isLoading ? (
                        <>
                          <i className="fas fa-spinner fa-spin mr-2"></i>
                          Envoi…
                        </>
                      ) : (
                        "Envoyer le lien de réinitialisation"
                      )}
                    </Button>
                    <button
                      type="button"
                      onClick={() => setForgotMode(false)}
                      className="w-full text-sm text-gray-600 hover:text-primary"
                    >
                      ← Retour à la connexion
                    </button>
                  </form>
                )
              ) : pendingToken ? (
                <form onSubmit={handleVerify2FA} className="space-y-6">
                  <div>
                    <Label htmlFor="twoFactorCode">Code d'authentification</Label>
                    <Input
                      id="twoFactorCode"
                      name="twoFactorCode"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      value={twoFactorCode}
                      onChange={(e) => setTwoFactorCode(e.target.value)}
                      required
                      autoFocus
                      className="mt-1 text-center tracking-[0.5em] text-lg"
                      placeholder="123456"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={isLoading || twoFactorCode.replace(/\s/g, "").length < 6}
                    className="w-full bg-primary hover:bg-primary-600 text-white"
                  >
                    {isLoading ? (
                      <>
                        <i className="fas fa-spinner fa-spin mr-2"></i>
                        Vérification...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-shield-alt mr-2"></i>
                        Vérifier
                      </>
                    )}
                  </Button>
                  <button
                    type="button"
                    onClick={() => {
                      setPendingToken(null);
                      setTwoFactorCode("");
                    }}
                    className="w-full text-sm text-gray-600 hover:text-primary"
                  >
                    ← Retour à la connexion
                  </button>
                </form>
              ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="email">Adresse email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="mt-1"
                    placeholder="votre@email.com"
                  />
                </div>

                <div>
                  <Label htmlFor="password">Mot de passe</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    className="mt-1"
                    placeholder="••••••••"
                  />
                  <div className="text-right mt-1">
                    <button
                      type="button"
                      onClick={() => setForgotMode(true)}
                      className="text-sm text-primary hover:text-primary-600"
                    >
                      Mot de passe oublié ?
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-primary hover:bg-primary-600 text-white"
                >
                  {isLoading ? (
                    <>
                      <i className="fas fa-spinner fa-spin mr-2"></i>
                      Connexion...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-sign-in-alt mr-2"></i>
                      Se connecter
                    </>
                  )}
                </Button>
              </form>
              )}

              <div className="mt-6 text-center">
                <p className="text-gray-600">
                  Pas encore de compte ?{" "}
                  <Link href="/register" className="text-primary hover:text-primary-600 font-medium">
                    S'inscrire
                  </Link>
                </p>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <i className="fas fa-shield-alt text-primary"></i>
                  <span>Connexion sécurisée avec cryptage SSL</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
