import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/navbar";

export default function ResetPassword() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const token = new URLSearchParams(window.location.search).get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });
      if (!response.ok) {
        const text = await response.text();
        let msg;
        try {
          msg = JSON.parse(text).message;
        } catch {
          msg = text;
        }
        throw new Error(msg || "Réinitialisation impossible");
      }
      setDone(true);
      toast({
        title: "Mot de passe réinitialisé",
        description: "Vous pouvez maintenant vous connecter.",
      });
      setTimeout(() => navigate("/login"), 2000);
    } catch (error: any) {
      toast({
        title: "Échec",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <Card>
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-lock text-white text-2xl"></i>
              </div>
              <CardTitle className="text-2xl font-bold font-poppins">
                Nouveau mot de passe
              </CardTitle>
              <p className="text-gray-600">Choisissez un nouveau mot de passe</p>
            </CardHeader>
            <CardContent>
              {!token ? (
                <p className="text-center text-red-600">
                  Lien invalide. Veuillez refaire une demande depuis la page de
                  connexion.
                </p>
              ) : done ? (
                <div className="text-center space-y-3">
                  <i className="fas fa-check-circle text-green-600 text-3xl"></i>
                  <p className="text-gray-700">
                    Mot de passe réinitialisé. Redirection vers la connexion…
                  </p>
                  <Link
                    href="/login"
                    className="text-primary hover:text-primary-600 text-sm"
                  >
                    Aller à la connexion
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <Label htmlFor="password">Nouveau mot de passe</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="mt-1"
                      placeholder="••••••••"
                    />
                  </div>
                  <div>
                    <Label htmlFor="confirm">Confirmer le mot de passe</Label>
                    <Input
                      id="confirm"
                      type="password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      required
                      className="mt-1"
                      placeholder="••••••••"
                    />
                    {confirm && password !== confirm && (
                      <p className="text-xs text-red-600 mt-1">
                        Les mots de passe ne correspondent pas.
                      </p>
                    )}
                  </div>
                  <Button
                    type="submit"
                    disabled={
                      isLoading ||
                      password.length < 6 ||
                      password !== confirm
                    }
                    className="w-full bg-primary hover:bg-primary-600 text-white"
                  >
                    {isLoading ? (
                      <>
                        <i className="fas fa-spinner fa-spin mr-2"></i>
                        Réinitialisation…
                      </>
                    ) : (
                      "Réinitialiser le mot de passe"
                    )}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
