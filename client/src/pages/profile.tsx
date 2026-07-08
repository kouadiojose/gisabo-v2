import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, Settings, Shield, CreditCard, History } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { isAuthenticated, getAuthHeaders } from "@/lib/auth";
import { useLocation } from "wouter";
import type { User as UserType } from "@shared/schema";
import AddCardForm from "@/components/add-card-form";

interface PaymentMethodItem {
  id: number;
  brand: string | null;
  last4: string | null;
  expMonth: number | null;
  expYear: number | null;
}
import Navbar from "@/components/navbar";

export default function Profile() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const authenticated = isAuthenticated();
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [twoFactorSetup, setTwoFactorSetup] = useState<{
    qrCode: string;
    secret: string;
  } | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [isDisabling2FA, setIsDisabling2FA] = useState(false);
  const [disableCode, setDisableCode] = useState("");
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: ""
  });

  useEffect(() => {
    if (!authenticated) {
      navigate("/login");
    }
  }, [authenticated, navigate]);

  // Fetch user data. /api/auth/me renvoie { user: {...} } : il faut extraire
  // data.user, sinon tous les champs sont undefined (champs vides + Invalid Date).
  const { data: user, isLoading } = useQuery<UserType>({
    queryKey: ["/api/auth/me"],
    enabled: authenticated,
    queryFn: async () => {
      const headers = getAuthHeaders();
      const response = await fetch("/api/auth/me", { headers: headers || {} });
      if (!response.ok) throw new Error("Failed to fetch user");
      const data = await response.json();
      return data.user;
    },
  });

  // Update form data when user data loads
  useEffect(() => {
    if (user && !isEditing) {
      setFormData({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
        phone: user.phone || ""
      });
    }
  }, [user, isEditing]);

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: Partial<UserType>) => {
      console.log("Sending profile update request with data:", data);
      console.log("Auth headers:", getAuthHeaders());
      console.log("Auth token exists:", !!localStorage.getItem("authToken"));
      
      const response = await apiRequest("PUT", "/api/profile", data);
      return await response.json();
    },
    onSuccess: (updatedUser) => {
      console.log("Profile update successful, received data:", updatedUser);
      
      toast({
        title: t("profile.updateSuccess"),
        description: t("profile.updateSuccessDesc"),
      });
      setIsEditing(false);
      
      // Update local form data immediately with the response from server
      if (updatedUser) {
        const newFormData = {
          firstName: updatedUser.firstName || "",
          lastName: updatedUser.lastName || "",
          email: updatedUser.email || "",
          phone: updatedUser.phone || ""
        };
        console.log("Updating form data to:", newFormData);
        setFormData(newFormData);
      }
      
      // Invalidate and refetch user data
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
    onError: () => {
      toast({
        title: t("common.error"),
        description: t("profile.updateError"),
        variant: "destructive",
      });
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string; confirmPassword: string }) => {
      const token = localStorage.getItem("authToken");
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      
      const response = await fetch("/api/change-password", {
        method: "POST",
        body: JSON.stringify(data),
        headers,
      });
      if (!response.ok) throw new Error("Failed to change password");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: t("profile.security.passwordChanged"),
        description: t("profile.security.passwordChangedDesc"),
      });
      setIsChangingPassword(false);
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.message || t("profile.security.passwordChangeError"),
        variant: "destructive",
      });
    },
  });

  // 2FA — étape 1 : générer le secret + QR code
  const setup2FAMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/2fa/setup");
      return response.json();
    },
    onSuccess: (data) => {
      setTwoFactorSetup({ qrCode: data.qrCode, secret: data.secret });
      setTwoFactorCode("");
    },
    onError: () => {
      toast({
        title: t("common.error"),
        description: t("profile.security.twoFactorError"),
        variant: "destructive",
      });
    },
  });

  // 2FA — étape 2 : vérifier le premier code et activer
  const enable2FAMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await apiRequest("POST", "/api/2fa/enable", { token: code });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: t("profile.security.twoFactorEnabled"),
        description: t("profile.security.twoFactorEnabledDesc"),
      });
      setTwoFactorSetup(null);
      setTwoFactorCode("");
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.message || t("profile.security.twoFactorInvalidCode"),
        variant: "destructive",
      });
    },
  });

  // 2FA — désactivation (nécessite un code valide)
  const disable2FAMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await apiRequest("POST", "/api/2fa/disable", { token: code });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: t("profile.security.twoFactorDisabled"),
        description: t("profile.security.twoFactorDisabledDesc"),
      });
      setIsDisabling2FA(false);
      setDisableCode("");
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.message || t("profile.security.twoFactorInvalidCode"),
        variant: "destructive",
      });
    },
  });

  // Moyens de paiement (cartes enregistrées)
  const { data: paymentMethods } = useQuery<PaymentMethodItem[]>({
    queryKey: ["/api/payment-methods"],
    enabled: authenticated,
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/payment-methods");
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
  });

  const addCardMutation = useMutation({
    mutationFn: async (sourceId: string) => {
      const response = await apiRequest("POST", "/api/payment-methods", {
        sourceId,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: t("profile.payment.cardAdded"),
        description: t("profile.payment.cardAddedDesc"),
      });
      setIsAddingCard(false);
      queryClient.invalidateQueries({ queryKey: ["/api/payment-methods"] });
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.message || t("profile.payment.cardError"),
        variant: "destructive",
      });
    },
  });

  const deleteCardMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/payment-methods/${id}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: t("profile.payment.cardRemoved"),
        description: t("profile.payment.cardRemovedDesc"),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/payment-methods"] });
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.message || t("profile.payment.cardError"),
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    updateProfileMutation.mutate(formData);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (isLoading) {
    return (
      <>
        <Navbar />
        <div className="container mx-auto p-6">
          <div className="text-center">{t("common.loading")}</div>
        </div>
      </>
    );
  }

  if (!user) {
    return (
      <>
        <Navbar />
        <div className="container mx-auto p-6">
          <div className="text-center">{t("common.loginRequired")}</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="flex items-center gap-4 mb-8">
          <Avatar className="h-20 w-20">
            <AvatarFallback className="text-2xl">
              {user.firstName?.[0]}{user.lastName?.[0]}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold">{user.firstName} {user.lastName}</h1>
            <p className="text-muted-foreground">{user.email}</p>
            <Badge variant="outline" className="mt-2">
              {t("profile.memberSince")}{" "}
              {user.createdAt
                ? new Date(user.createdAt).toLocaleDateString()
                : "—"}
            </Badge>
          </div>
        </div>

        <Tabs defaultValue="personal" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="personal" className="flex items-center gap-2">
              <User size={16} />
              {t("profile.tabs.personal")}
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield size={16} />
              {t("profile.tabs.security")}
            </TabsTrigger>
            <TabsTrigger value="payment" className="flex items-center gap-2">
              <CreditCard size={16} />
              {t("profile.tabs.payment")}
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center gap-2">
              <History size={16} />
              {t("profile.tabs.activity")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="personal">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {t("profile.personalInfo.title")}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(!isEditing)}
                  >
                    <Settings size={16} className="mr-2" />
                    {isEditing ? t("common.cancel") : t("profile.edit")}
                  </Button>
                </CardTitle>
                <CardDescription>
                  {t("profile.personalInfo.description")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">{t("profile.firstName")}</Label>
                      <Input
                        id="firstName"
                        name="firstName"
                        value={formData.firstName}
                        onChange={(e) => handleInputChange("firstName", e.target.value)}
                        disabled={!isEditing}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">{t("profile.lastName")}</Label>
                      <Input
                        id="lastName"
                        name="lastName"
                        value={formData.lastName}
                        onChange={(e) => handleInputChange("lastName", e.target.value)}
                        disabled={!isEditing}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">{t("profile.email")}</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">{t("profile.phone")}</Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange("phone", e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                  {isEditing && (
                    <Button type="submit" disabled={updateProfileMutation.isPending}>
                      {updateProfileMutation.isPending ? t("common.loading") : t("profile.save")}
                    </Button>
                  )}
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>{t("profile.security.title")}</CardTitle>
                <CardDescription>
                  {t("profile.security.description")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-3">{t("profile.security.password")}</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {t("profile.security.passwordDesc")}
                  </p>
                  <Button variant="outline" onClick={() => setIsChangingPassword(!isChangingPassword)}>
                    {isChangingPassword ? t("common.cancel") : t("profile.security.changePassword")}
                  </Button>
                  
                  {isChangingPassword && (
                    <form 
                      onSubmit={(e) => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget);
                        const data = {
                          currentPassword: formData.get("currentPassword") as string,
                          newPassword: formData.get("newPassword") as string,
                          confirmPassword: formData.get("confirmPassword") as string,
                        };
                        changePasswordMutation.mutate(data);
                      }}
                      className="mt-4 space-y-4 p-4 border rounded-lg"
                    >
                      <div className="space-y-2">
                        <Label htmlFor="currentPassword">{t("profile.security.currentPassword")}</Label>
                        <Input
                          id="currentPassword"
                          name="currentPassword"
                          type="password"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="newPassword">{t("profile.security.newPassword")}</Label>
                        <Input
                          id="newPassword"
                          name="newPassword"
                          type="password"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">{t("profile.security.confirmPassword")}</Label>
                        <Input
                          id="confirmPassword"
                          name="confirmPassword"
                          type="password"
                          required
                        />
                      </div>
                      <Button type="submit" disabled={changePasswordMutation.isPending}>
                        {changePasswordMutation.isPending ? t("common.loading") : t("profile.security.changePassword")}
                      </Button>
                    </form>
                  )}
                </div>
                
                <Separator />
                
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-lg font-semibold">{t("profile.security.twoFactor")}</h3>
                    {user.twoFactorEnabled && (
                      <Badge className="bg-green-100 text-green-800">
                        {t("profile.security.twoFactorActive")}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    {t("profile.security.twoFactorDesc")}
                  </p>

                  {/* Cas 1 : 2FA déjà activée → possibilité de désactiver */}
                  {user.twoFactorEnabled ? (
                    !isDisabling2FA ? (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsDisabling2FA(true);
                          setDisableCode("");
                        }}
                      >
                        {t("profile.security.disableTwoFactor")}
                      </Button>
                    ) : (
                      <div className="space-y-3 p-4 border rounded-lg max-w-sm">
                        <Label htmlFor="disableCode">
                          {t("profile.security.enterCodeToDisable")}
                        </Label>
                        <Input
                          id="disableCode"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          placeholder="123456"
                          value={disableCode}
                          onChange={(e) => setDisableCode(e.target.value)}
                        />
                        <div className="flex gap-2">
                          <Button
                            variant="destructive"
                            disabled={
                              disableCode.length < 6 || disable2FAMutation.isPending
                            }
                            onClick={() => disable2FAMutation.mutate(disableCode)}
                          >
                            {disable2FAMutation.isPending
                              ? t("common.loading")
                              : t("profile.security.disableTwoFactor")}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => setIsDisabling2FA(false)}
                          >
                            {t("common.cancel")}
                          </Button>
                        </div>
                      </div>
                    )
                  ) : twoFactorSetup ? (
                    /* Cas 2 : configuration en cours → QR + saisie du code */
                    <div className="space-y-4 p-4 border rounded-lg max-w-md">
                      <p className="text-sm">
                        {t("profile.security.scanQr")}
                      </p>
                      <img
                        src={twoFactorSetup.qrCode}
                        alt="QR code 2FA"
                        className="w-44 h-44 border rounded-lg bg-white p-2"
                      />
                      <p className="text-xs text-muted-foreground break-all">
                        {t("profile.security.manualKey")} :{" "}
                        <span className="font-mono">{twoFactorSetup.secret}</span>
                      </p>
                      <div className="space-y-2">
                        <Label htmlFor="twoFactorCode">
                          {t("profile.security.enterCode")}
                        </Label>
                        <Input
                          id="twoFactorCode"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          placeholder="123456"
                          value={twoFactorCode}
                          onChange={(e) => setTwoFactorCode(e.target.value)}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          disabled={
                            twoFactorCode.length < 6 || enable2FAMutation.isPending
                          }
                          onClick={() => enable2FAMutation.mutate(twoFactorCode)}
                        >
                          {enable2FAMutation.isPending
                            ? t("common.loading")
                            : t("profile.security.verifyAndEnable")}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setTwoFactorSetup(null)}
                        >
                          {t("common.cancel")}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* Cas 3 : rien encore → bouton d'activation */
                    <Button
                      variant="outline"
                      disabled={setup2FAMutation.isPending}
                      onClick={() => setup2FAMutation.mutate()}
                    >
                      {setup2FAMutation.isPending
                        ? t("common.loading")
                        : t("profile.security.enableTwoFactor")}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payment">
            <Card>
              <CardHeader>
                <CardTitle>{t("profile.payment.title")}</CardTitle>
                <CardDescription>
                  {t("profile.payment.description")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Liste des cartes enregistrées */}
                {paymentMethods && paymentMethods.length > 0 && (
                  <div className="space-y-3 mb-6">
                    {paymentMethods.map((pm) => (
                      <div
                        key={pm.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <CreditCard
                            size={28}
                            className="text-muted-foreground"
                          />
                          <div>
                            <p className="font-medium">
                              {pm.brand || t("profile.payment.card")} ••••{" "}
                              {pm.last4 || "----"}
                            </p>
                            {pm.expMonth && pm.expYear && (
                              <p className="text-sm text-muted-foreground">
                                {t("profile.payment.expires")}{" "}
                                {String(pm.expMonth).padStart(2, "0")}/
                                {pm.expYear}
                              </p>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          disabled={deleteCardMutation.isPending}
                          onClick={() => deleteCardMutation.mutate(pm.id)}
                        >
                          {t("profile.payment.remove")}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Formulaire d'ajout ou état vide */}
                {isAddingCard ? (
                  <AddCardForm
                    isSubmitting={addCardMutation.isPending}
                    onCancel={() => setIsAddingCard(false)}
                    onToken={(token) => addCardMutation.mutate(token)}
                  />
                ) : (
                  <>
                    {(!paymentMethods || paymentMethods.length === 0) && (
                      <div className="text-center py-8">
                        <CreditCard
                          size={48}
                          className="mx-auto mb-4 text-muted-foreground"
                        />
                        <p className="text-muted-foreground">
                          {t("profile.payment.noMethods")}
                        </p>
                      </div>
                    )}
                    <div
                      className={
                        !paymentMethods || paymentMethods.length === 0
                          ? "text-center"
                          : ""
                      }
                    >
                      <Button
                        className="mt-2"
                        variant="outline"
                        onClick={() => setIsAddingCard(true)}
                      >
                        {t("profile.payment.addMethod")}
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity">
            <Card>
              <CardHeader>
                <CardTitle>{t("profile.activity.title")}</CardTitle>
                <CardDescription>
                  {t("profile.activity.description")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">{t("profile.activity.lastLogin")}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">{t("profile.activity.accountCreated")}</p>
                      <p className="text-sm text-muted-foreground">
                        {user.createdAt
                          ? new Date(user.createdAt).toLocaleDateString()
                          : "—"}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}