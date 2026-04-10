import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { isAuthenticated, getAuthHeaders } from "@/lib/auth";
import { Transfer, Order } from "@/lib/types";

export default function DashboardPreview() {
  const authenticated = isAuthenticated();

  const { data: transfers } = useQuery<Transfer[]>({
    queryKey: ["/api/transfers"],
    enabled: authenticated,
    queryFn: async () => {
      const response = await fetch("/api/transfers", {
        headers: getAuthHeaders(),
      });
      if (!response.ok) return [];
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: orders } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
    enabled: authenticated,
    queryFn: async () => {
      const response = await fetch("/api/orders", {
        headers: getAuthHeaders(),
      });
      if (!response.ok) return [];
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
  });

  const safeTransfers = Array.isArray(transfers) ? transfers : [];
  const safeOrders = Array.isArray(orders) ? orders : [];

  const recentTransactions = [
    ...(safeTransfers.slice(0, 2).map(t => ({
      id: t.id,
      type: 'transfer' as const,
      description: `Transaction vers ${t.recipientName}`,
      amount: `-${t.amount} ${t.currency}`,
      status: t.status,
      date: new Date(t.createdAt).toLocaleDateString('fr-FR'),
      icon: 'fas fa-arrow-up',
      iconColor: 'text-green-600',
      bgColor: 'bg-green-100',
    })) || []),
    ...(safeOrders.slice(0, 1).map(o => ({
      id: o.id,
      type: 'order' as const,
      description: 'Achat Marketplace',
      amount: `-${o.total} ${o.currency}`,
      status: o.status,
      date: new Date(o.createdAt).toLocaleDateString('fr-FR'),
      icon: 'fas fa-shopping-cart',
      iconColor: 'text-blue-600',
      bgColor: 'bg-blue-100',
    })) || []),
  ].slice(0, 3);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800';
      case 'pending':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Complété';
      case 'processing':
        return 'En cours';
      case 'pending':
        return 'En attente';
      default:
        return status;
    }
  };

  const totalSent = safeTransfers.reduce((sum, t) => sum + parseFloat(t.amount), 0);
  const transfersThisMonth = safeTransfers.filter(t =>
    new Date(t.createdAt).getMonth() === new Date().getMonth()
  ).length;

  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 font-poppins mb-4">
            Tableau de Bord Personnel
          </h2>
          <p className="text-xl text-gray-600">
            Gérez vos transactions et commandes en toute simplicité
          </p>
        </div>

        {authenticated ? (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Transaction History */}
            <div className="lg:col-span-2">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-gray-900 font-poppins">Historique des Transactions</h3>
                    <Link href="/dashboard">
                      <Button variant="ghost" className="text-primary hover:text-primary-600">
                        Voir tout <i className="fas fa-arrow-right ml-1"></i>
                      </Button>
                    </Link>
                  </div>

                  <div className="space-y-4">
                    {recentTransactions.length > 0 ? (
                      recentTransactions.map((transaction) => (
                        <div key={`${transaction.type}-${transaction.id}`} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                          <div className="flex items-center space-x-4">
                            <div className={`w-10 h-10 ${transaction.bgColor} rounded-lg flex items-center justify-center`}>
                              <i className={`${transaction.icon} ${transaction.iconColor}`}></i>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{transaction.description}</p>
                              <p className="text-sm text-gray-600">{transaction.date}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-gray-900">{transaction.amount}</p>
                            <span className={`inline-block px-2 py-1 text-xs rounded-full ${getStatusColor(transaction.status)}`}>
                              {getStatusText(transaction.status)}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <i className="fas fa-history text-4xl mb-4"></i>
                        <p>Aucune transaction récente</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions & Stats */}
            <div className="space-y-6">
              {/* Quick Stats */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 font-poppins">Statistiques</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-gray-600">Transactions ce mois</span>
                        <span className="font-semibold text-gray-900">{transfersThisMonth}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-primary h-2 rounded-full" style={{ width: `${Math.min(transfersThisMonth * 20, 100)}%` }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-gray-600">Total traité</span>
                        <span className="font-semibold text-primary">€{totalSent.toFixed(2)}</span>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-gray-600">Frais économisés</span>
                        <span className="font-semibold text-green-600">€{(totalSent * 0.02).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 font-poppins">Actions Rapides</h3>
                  <div className="space-y-3">
                    <Link href="/transfer">
                      <Button className="w-full bg-primary hover:bg-primary-600 text-white">
                        <i className="fas fa-paper-plane mr-2"></i>
                        Nouvelle Transaction
                      </Button>
                    </Link>
                    <Link href="/marketplace">
                      <Button className="w-full bg-secondary hover:bg-secondary/90 text-white">
                        <i className="fas fa-shopping-cart mr-2"></i>
                        Explorer Marketplace
                      </Button>
                    </Link>
                    <Button variant="outline" className="w-full border-gray-300 hover:bg-gray-50 text-gray-700">
                      <i className="fas fa-mobile-alt mr-2"></i>
                      Recharge Mobile
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="max-w-md mx-auto">
              <i className="fas fa-user-circle text-6xl text-gray-300 mb-6"></i>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Connectez-vous pour voir votre tableau de bord</h3>
              <p className="text-gray-600 mb-6">
                Accédez à votre historique de transactions, gérez vos transferts et commandes.
              </p>
              <div className="space-y-3">
                <Link href="/login" className="block">
                  <Button className="w-full bg-primary hover:bg-primary-600 text-white">
                    Se connecter
                  </Button>
                </Link>
                <Link href="/register" className="block">
                  <Button variant="outline" className="w-full border-primary text-primary hover:bg-primary hover:text-white">
                    Créer un compte
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
