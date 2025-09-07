import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useLocation } from "wouter";
import { isAuthenticated, getAuthHeaders } from "@/lib/auth";
import { Transfer, Order, User } from "@/lib/types";
import Navbar from "@/components/navbar";
import { useEffect, useState, useMemo } from "react";
import { CalendarIcon, FilterIcon } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

export default function Dashboard() {
  const [, navigate] = useLocation();
  const authenticated = isAuthenticated();
  const { t } = useLanguage();

  // États pour la gestion des filtres et de l'affichage
  const [showAllTransfers, setShowAllTransfers] = useState(false);
  const [showAllOrders, setShowAllOrders] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    if (!authenticated) {
      navigate("/login");
    }
  }, [authenticated, navigate]);

  const { data: user } = useQuery<User>({
    queryKey: ["/api/auth/me"],
    enabled: authenticated,
    queryFn: async () => {
      const headers = getAuthHeaders();

      const response = await fetch("/api/auth/me", {
        headers: headers || {},
      });
      if (!response.ok) throw new Error("Failed to fetch user");
      const data = await response.json();
      return data.user;
    },
  });

  const { data: transfers, isLoading: transfersLoading } = useQuery<Transfer[]>(
    {
      queryKey: ["/api/transfers"],
      enabled: authenticated,
      queryFn: async () => {
        const headers = getAuthHeaders();
        const response = await fetch("/api/transfers", {
          headers: headers || {},
        });
        if (!response.ok) throw new Error("Failed to fetch transfers");
        return response.json();
      },
    },
  );

  const { data: orders, isLoading: ordersLoading } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
    enabled: authenticated,
    queryFn: async () => {
      const headers = getAuthHeaders();
      const response = await fetch("/api/orders", {
        headers: headers || {},
      });
      if (!response.ok) throw new Error("Failed to fetch orders");
      return response.json();
    },
  });

  // Filtrage et limitation des transactions
  const filteredTransfers = useMemo(() => {
    if (!transfers) return [];

    let filtered = [...transfers];

    // Filtrage par date
    if (dateFrom || dateTo) {
      filtered = filtered.filter((transfer) => {
        const transferDate = new Date(transfer.createdAt);
        const fromDate = dateFrom ? new Date(dateFrom) : null;
        const toDate = dateTo ? new Date(dateTo) : null;

        if (fromDate && transferDate < fromDate) return false;
        if (toDate && transferDate > toDate) return false;
        return true;
      });
    }

    // Tri par date (plus récent en premier)
    filtered.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    // Limitation à 10 si "Voir tout" n'est pas activé
    return showAllTransfers ? filtered : filtered.slice(0, 10);
  }, [transfers, showAllTransfers, dateFrom, dateTo]);

  const filteredOrders = useMemo(() => {
    if (!orders) return [];

    let filtered = [...orders];

    // Filtrage par date
    if (dateFrom || dateTo) {
      filtered = filtered.filter((order) => {
        const orderDate = new Date(order.createdAt);
        const fromDate = dateFrom ? new Date(dateFrom) : null;
        const toDate = dateTo ? new Date(dateTo) : null;

        if (fromDate && orderDate < fromDate) return false;
        if (toDate && orderDate > toDate) return false;
        return true;
      });
    }

    // Tri par date (plus récent en premier)
    filtered.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    // Limitation à 10 si "Voir tout" n'est pas activé
    return showAllOrders ? filtered : filtered.slice(0, 10);
  }, [orders, showAllOrders, dateFrom, dateTo]);

  if (!authenticated) {
    return null;
  }

  const getStatusBadge = (status: string, squarePaymentId?: string) => {
    // Si la commande a un squarePaymentId, elle est payée
    if (squarePaymentId && status === 'processing') {
      return (
        <Badge className="bg-green-100 text-green-800">
          {t('dashboard.status.paid')}
        </Badge>
      );
    }

    const statusConfig = {
      completed: {
        variant: "default" as const,
        label: t('dashboard.status.completed'),
        className: "bg-green-100 text-green-800",
      },
      processing: {
        variant: "secondary" as const,
        label: t('dashboard.status.processing'),
        className: "bg-yellow-100 text-yellow-800",
      },
      pending: {
        variant: "outline" as const,
        label: t('dashboard.status.pending'),
        className: "bg-gray-100 text-gray-800",
      },
      failed: {
        variant: "destructive" as const,
        label: t('dashboard.status.failed'),
        className: "bg-red-100 text-red-800",
      },
    };

    const config =
      statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return (
      <Badge variant={config.variant} className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const totalSent =
    transfers?.reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0;
  const transfersThisMonth =
    transfers?.filter(
      (t) => new Date(t.createdAt).getMonth() === new Date().getMonth(),
    ).length || 0;
  const totalOrders = orders?.length || 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 font-poppins">
            {t('dashboard.title')}
          </h1>
          <p className="text-gray-600 mt-2">
            {t('dashboard.greeting').replace('{name}', user?.firstName || '')}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{t('dashboard.stats.totalSent')}</p>
                  <p className="text-2xl font-bold text-primary">
                    {totalSent.toFixed(2)} CAD
                  </p>
                </div>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <i className="fas fa-paper-plane text-primary text-xl"></i>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">
                    {t('dashboard.stats.monthlyTransfers')}
                  </p>
                  <p className="text-2xl font-bold text-secondary">
                    {transfersThisMonth}
                  </p>
                </div>
                <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center">
                  <i className="fas fa-calendar text-secondary text-xl"></i>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{t('dashboard.stats.orders')}</p>
                  <p className="text-2xl font-bold text-accent">
                    {totalOrders}
                  </p>
                </div>
                <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                  <i className="fas fa-shopping-cart text-accent text-xl"></i>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <Link href="/gisabo">
            <Button className="w-full bg-primary hover:bg-primary-600 text-white h-14">
              <i className="fas fa-paper-plane mr-2"></i>
              {t('dashboard.quickActions.newTransfer')}
            </Button>
          </Link>
          <Link href="/marketplace">
            <Button className="w-full bg-secondary hover:bg-secondary/90 text-white h-14">
              <i className="fas fa-shopping-cart mr-2"></i>
              {t('dashboard.quickActions.exploreMarketplace')}
            </Button>
          </Link>
          <Button variant="outline" className="w-full h-14 border-gray-300">
            <i className="fas fa-mobile-alt mr-2"></i>
            {t('dashboard.quickActions.mobileRecharge')}
          </Button>
        </div>

        {/* Transactions Tabs */}
        <Tabs defaultValue="transfers" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="transfers">{t('dashboard.tabs.transfers')}</TabsTrigger>
            <TabsTrigger value="orders">{t('dashboard.tabs.orders')}</TabsTrigger>
          </TabsList>

          <TabsContent value="transfers">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{t('dashboard.transfers.title')}</span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowFilters(!showFilters)}
                      className="flex items-center gap-2"
                    >
                      <FilterIcon className="h-4 w-4" />
                      {t('dashboard.transfers.filters')}
                    </Button>
                    <Link href="/gisabo">
                      <Button
                        size="sm"
                        className="bg-primary hover:bg-primary-600"
                      >
                        <i className="fas fa-plus mr-2"></i>
                        {t('dashboard.transfers.new')}
                      </Button>
                    </Link>
                  </div>
                </CardTitle>

                {/* Panneau de filtres */}
                {showFilters && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="dateFrom">{t('dashboard.transfers.dateFrom')}</Label>
                        <Input
                          id="dateFrom"
                          type="date"
                          value={dateFrom}
                          onChange={(e) => setDateFrom(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="dateTo">{t('dashboard.transfers.dateTo')}</Label>
                        <Input
                          id="dateTo"
                          type="date"
                          value={dateTo}
                          onChange={(e) => setDateTo(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div className="flex items-end">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setDateFrom("");
                            setDateTo("");
                          }}
                          className="w-full"
                        >
                          {t('dashboard.transfers.reset')}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {transfersLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg animate-pulse"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
                          <div>
                            <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                            <div className="h-3 bg-gray-200 rounded w-24"></div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                          <div className="h-6 bg-gray-200 rounded w-16"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filteredTransfers && filteredTransfers.length > 0 ? (
                  <div className="space-y-4">
                    {filteredTransfers.map((transfer) => (
                      <div
                        key={transfer.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                            <i className="fas fa-arrow-up text-primary"></i>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {t('dashboard.transfers.transferTo').replace('{name}', transfer.recipientName)}
                            </p>
                            <p className="text-sm text-gray-600">
                              {transfer.destinationCountry} •{" "}
                              {new Date(transfer.createdAt).toLocaleDateString(
                                "fr-FR",
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">
                            -{transfer.amount} {transfer.currency}
                          </p>
                          {getStatusBadge(transfer.status)}
                        </div>
                      </div>
                    ))}

                    {/* Bouton "Voir tout" si limité à 10 */}
                    {!showAllTransfers &&
                      transfers &&
                      transfers.length > 10 && (
                        <div className="text-center pt-4">
                          <Button
                            variant="outline"
                            onClick={() => setShowAllTransfers(true)}
                            className="flex items-center gap-2 mx-auto"
                          >
                            {t('dashboard.transfers.viewAll').replace('{count}', transfers.length.toString())}
                          </Button>
                        </div>
                      )}

                    {/* Bouton "Voir moins" si tout est affiché */}
                    {showAllTransfers && transfers && transfers.length > 10 && (
                      <div className="text-center pt-4">
                        <Button
                          variant="outline"
                          onClick={() => setShowAllTransfers(false)}
                          className="flex items-center gap-2 mx-auto"
                        >
                          {t('dashboard.transfers.viewLess')}
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <i className="fas fa-paper-plane text-4xl text-gray-300 mb-4"></i>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {t('dashboard.transfers.noTransfers')}
                    </h3>
                    <p className="text-gray-600 mb-4">
                      {dateFrom || dateTo
                        ? "Aucun transfert ne correspond aux critères de date sélectionnés."
                        : t('dashboard.transfers.noTransfersText')}
                    </p>
                    {!dateFrom && !dateTo && (
                      <Link href="/gisabo">
                        <Button className="bg-primary hover:bg-primary-600">
                          {t('dashboard.quickActions.newTransfer')}
                        </Button>
                      </Link>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{t('dashboard.orders.title')}</span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowFilters(!showFilters)}
                      className="flex items-center gap-2"
                    >
                      <FilterIcon className="h-4 w-4" />
                      {t('dashboard.transfers.filters')}
                    </Button>
                    <Link href="/marketplace">
                      <Button
                        size="sm"
                        className="bg-secondary hover:bg-secondary/90"
                      >
                        <i className="fas fa-plus mr-2"></i>
                        {t('dashboard.transfers.new')}
                      </Button>
                    </Link>
                  </div>
                </CardTitle>

                {/* Panneau de filtres partagé */}
                {showFilters && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="dateFromOrders">{t('dashboard.transfers.dateFrom')}</Label>
                        <Input
                          id="dateFromOrders"
                          type="date"
                          value={dateFrom}
                          onChange={(e) => setDateFrom(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="dateToOrders">{t('dashboard.transfers.dateTo')}</Label>
                        <Input
                          id="dateToOrders"
                          type="date"
                          value={dateTo}
                          onChange={(e) => setDateTo(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div className="flex items-end">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setDateFrom("");
                            setDateTo("");
                          }}
                          className="w-full"
                        >
                          {t('dashboard.transfers.reset')}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {ordersLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg animate-pulse"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
                          <div>
                            <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                            <div className="h-3 bg-gray-200 rounded w-24"></div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                          <div className="h-6 bg-gray-200 rounded w-16"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filteredOrders && filteredOrders.length > 0 ? (
                  <div className="space-y-4">
                    {filteredOrders.map((order) => (
                      <div
                        key={order.id}
                        className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 bg-secondary/10 rounded-lg flex items-center justify-center">
                              <i className="fas fa-shopping-cart text-secondary"></i>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">
                                Commande #{order.id.toString().padStart(6, '0')}
                              </p>
                              <p className="text-sm text-gray-600">
                                {new Date(order.createdAt).toLocaleDateString(
                                  "fr-FR",
                                  {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  }
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-gray-900 text-lg">
                              {parseFloat(order.total).toFixed(2)} {order.currency}
                            </p>
                            {getStatusBadge(order.status, order.squarePaymentId)}
                          </div>
                        </div>
                        
                        {/* Informations supplémentaires */}
                        <div className="ml-14 space-y-2">
                          {order.shippingAddress && (
                            <div className="text-sm text-gray-600">
                              <span className="font-medium">Bénéficiaire:</span> {order.shippingAddress.firstName} {order.shippingAddress.lastName}
                              {order.shippingAddress.phone && (
                                <span className="ml-2">• {order.shippingAddress.phone}</span>
                              )}
                            </div>
                          )}
                          
                          {order.squarePaymentId && (
                            <div className="text-sm text-gray-500">
                              <span className="font-medium">ID Transaction:</span> {order.squarePaymentId.slice(-8)}
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between pt-2">
                            <div className="text-sm text-gray-600">
                              <i className="fas fa-info-circle mr-1"></i>
                              Voir les détails complets
                            </div>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                // Stocker l'ID de commande et naviguer vers la page de succès
                                localStorage.setItem("lastOrderId", order.id.toString());
                                window.location.href = "/order-success";
                              }}
                            >
                              Détails
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Bouton "Voir tout" si limité à 10 */}
                    {!showAllOrders && orders && orders.length > 10 && (
                      <div className="text-center pt-4">
                        <Button
                          variant="outline"
                          onClick={() => setShowAllOrders(true)}
                          className="flex items-center gap-2 mx-auto"
                        >
                          Voir toutes les commandes ({orders.length})
                        </Button>
                      </div>
                    )}

                    {/* Bouton "Voir moins" si tout est affiché */}
                    {showAllOrders && orders && orders.length > 10 && (
                      <div className="text-center pt-4">
                        <Button
                          variant="outline"
                          onClick={() => setShowAllOrders(false)}
                          className="flex items-center gap-2 mx-auto"
                        >
                          Voir les 10 plus récentes
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <i className="fas fa-shopping-cart text-4xl text-gray-300 mb-4"></i>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {dateFrom || dateTo
                        ? "Aucune commande trouvée"
                        : "Aucune commande"}
                    </h3>
                    <p className="text-gray-600 mb-4">
                      {dateFrom || dateTo
                        ? "Aucune commande ne correspond aux critères de date sélectionnés."
                        : "Vous n'avez pas encore passé de commande sur la marketplace."}
                    </p>
                    {!dateFrom && !dateTo && (
                      <Link href="/marketplace">
                        <Button className="bg-secondary hover:bg-secondary/90">
                          Explorer la marketplace
                        </Button>
                      </Link>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
