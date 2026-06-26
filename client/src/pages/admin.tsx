import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Trash2, Edit3, Plus, Save, X } from "lucide-react";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";

interface ExchangeRate {
  id: number;
  fromCurrency: string;
  toCurrency: string;
  rate: string;
  createdAt: string;
  updatedAt: string;
}

interface Service {
  id: number;
  name: string;
  slug: string;
  shortDescription: string;
  fullDescription: string;
  imageUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Product {
  id: number;
  name: string;
  description: string;
  price: string;
  currency: string;
  categoryId: number;
  imageUrl?: string;
  inStock: boolean;
}

// Helper functions for admin authentication
const getAdminToken = (): string | null => {
  return localStorage.getItem("admin_token");
};

const getAdminAuthHeaders = () => {
  const token = getAdminToken();
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
};

const isAdminAuthenticated = (): boolean => {
  return !!getAdminToken();
};

export default function Admin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const authenticated = isAdminAuthenticated();
  
  const [editingRate, setEditingRate] = useState<ExchangeRate | null>(null);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [newRate, setNewRate] = useState({ fromCurrency: "", toCurrency: "", rate: "" });
  const [newService, setNewService] = useState({ 
    name: "", 
    slug: "", 
    shortDescription: "", 
    fullDescription: "", 
    imageUrl: "", 
    isActive: true 
  });
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [newProduct, setNewProduct] = useState({ 
    name: "", 
    description: "", 
    price: "", 
    currency: "EUR", 
    categoryId: 1, 
    imageUrl: "", 
    inStock: true 
  });
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedProductImageFile, setSelectedProductImageFile] = useState<File | null>(null);
  const [productImagePreview, setProductImagePreview] = useState<string>("");

  // Fetch data
  const { data: exchangeRates = [] } = useQuery<ExchangeRate[]>({
    queryKey: ["/api/admin/exchange-rates"],
    enabled: authenticated,
  });

  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ["/api/admin/services"],
    enabled: authenticated,
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
    enabled: authenticated,
  });

  // Mutations for Exchange Rates
  const createRateMutation = useMutation({
    mutationFn: async (rate: typeof newRate) => {
      const response = await fetch("/api/admin/exchange-rates", {
        method: "POST",
        headers: { ...getAdminAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(rate),
      });
      if (!response.ok) throw new Error("Failed to create rate");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/exchange-rates"] });
      setNewRate({ fromCurrency: "", toCurrency: "", rate: "" });
      toast({ title: "Taux de change créé avec succès" });
    },
  });

  const updateRateMutation = useMutation({
    mutationFn: async ({ id, ...rate }: ExchangeRate) => {
      const response = await fetch(`/api/admin/exchange-rates/${id}`, {
        method: "PUT",
        headers: { ...getAdminAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(rate),
      });
      if (!response.ok) throw new Error("Failed to update rate");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/exchange-rates"] });
      setEditingRate(null);
      toast({ title: "Taux de change mis à jour" });
    },
  });

  const deleteRateMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/admin/exchange-rates/${id}`, {
        method: "DELETE",
        headers: getAdminAuthHeaders(),
      });
      if (!response.ok) throw new Error("Failed to delete rate");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/exchange-rates"] });
      toast({ title: "Taux de change supprimé" });
    },
  });

  // Fonction pour télécharger une image
  const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('image', file);
    
    const response = await fetch("/api/admin/upload-service-image", {
      method: "POST",
      headers: getAdminAuthHeaders(),
      body: formData,
    });
    
    if (!response.ok) throw new Error("Failed to upload image");
    const result = await response.json();
    return result.imageUrl;
  };

  // Mutations for Services
  const createServiceMutation = useMutation({
    mutationFn: async (service: typeof newService) => {
      let finalService = { ...service };
      
      // Si un fichier image est sélectionné, le télécharger d'abord
      if (selectedImageFile) {
        const imageUrl = await uploadImage(selectedImageFile);
        finalService.imageUrl = imageUrl;
      }
      
      const response = await fetch("/api/admin/services", {
        method: "POST",
        headers: { ...getAdminAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(finalService),
      });
      if (!response.ok) throw new Error("Failed to create service");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/services"] });
      setNewService({ 
        name: "", 
        slug: "", 
        shortDescription: "", 
        fullDescription: "", 
        imageUrl: "", 
        isActive: true 
      });
      setSelectedImageFile(null);
      setImagePreview("");
      toast({ title: "Service créé avec succès" });
    },
  });

  const updateServiceMutation = useMutation({
    mutationFn: async ({ id, ...service }: Service) => {
      let finalService = { ...service };
      
      // Si un nouveau fichier image est sélectionné, le télécharger d'abord
      if (selectedImageFile) {
        const imageUrl = await uploadImage(selectedImageFile);
        finalService.imageUrl = imageUrl;
      }
      
      const response = await fetch(`/api/admin/services/${id}`, {
        method: "PUT",
        headers: { ...getAdminAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(finalService),
      });
      if (!response.ok) throw new Error("Failed to update service");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/services"] });
      setEditingService(null);
      toast({ title: "Service mis à jour" });
    },
  });

  const deleteServiceMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/admin/services/${id}`, {
        method: "DELETE",
        headers: getAdminAuthHeaders(),
      });
      if (!response.ok) throw new Error("Failed to delete service");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/services"] });
      toast({ title: "Service supprimé" });
    },
  });

  // Mutations for Products
  const createProductMutation = useMutation({
    mutationFn: async (product: typeof newProduct) => {
      let finalProduct = { ...product };
      
      // Si un fichier image est sélectionné, le télécharger d'abord
      if (selectedProductImageFile) {
        const imageUrl = await uploadImage(selectedProductImageFile);
        finalProduct.imageUrl = imageUrl;
      }
      
      const response = await fetch("/api/admin/products", {
        method: "POST",
        headers: { ...getAdminAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(finalProduct),
      });
      if (!response.ok) throw new Error("Failed to create product");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setNewProduct({ 
        name: "", 
        description: "", 
        price: "", 
        currency: "EUR", 
        categoryId: 1, 
        imageUrl: "", 
        inStock: true 
      });
      setSelectedProductImageFile(null);
      setProductImagePreview("");
      toast({ title: "Produit créé avec succès" });
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: async ({ id, ...product }: Product) => {
      let finalProduct = { ...product };
      
      // Si un nouveau fichier image est sélectionné, le télécharger d'abord
      if (selectedProductImageFile) {
        const imageUrl = await uploadImage(selectedProductImageFile);
        finalProduct.imageUrl = imageUrl;
      }
      
      const response = await fetch(`/api/admin/products/${id}`, {
        method: "PUT",
        headers: { ...getAdminAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(finalProduct),
      });
      if (!response.ok) throw new Error("Failed to update product");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setEditingProduct(null);
      setSelectedProductImageFile(null);
      setProductImagePreview("");
      toast({ title: "Produit modifié avec succès" });
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/admin/products/${id}`, {
        method: "DELETE",
        headers: getAdminAuthHeaders(),
      });
      if (!response.ok) throw new Error("Failed to delete product");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "Produit supprimé" });
    },
  });

  // Fonction pour gérer le changement d'image de produit
  const handleProductImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Erreur",
          description: "L'image ne doit pas dépasser 5MB",
          variant: "destructive",
        });
        return;
      }
      
      setSelectedProductImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setProductImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  if (!authenticated) {
    setLocation("/admin-login");
    return null;
  }

  const [activeSection, setActiveSection] = useState("services");

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg">
        <div className="p-6 border-b">
          <h1 className="text-xl font-bold text-gray-900">Administration</h1>
          <p className="text-sm text-gray-600">Panneau de gestion</p>
        </div>
        <nav className="mt-6">
          <div className="px-6 space-y-2">
            <button
              onClick={() => setActiveSection("services")}
              className={`w-full text-left px-4 py-2 rounded-lg flex items-center gap-3 transition-colors ${
                activeSection === "services" 
                  ? "bg-orange-100 text-orange-600 font-medium" 
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Settings className="h-4 w-4" />
              Services
            </button>
            <button
              onClick={() => setActiveSection("products")}
              className={`w-full text-left px-4 py-2 rounded-lg flex items-center gap-3 transition-colors ${
                activeSection === "products" 
                  ? "bg-orange-100 text-orange-600 font-medium" 
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Package className="h-4 w-4" />
              Produits
            </button>
            <button
              onClick={() => setActiveSection("exchange-rates")}
              className={`w-full text-left px-4 py-2 rounded-lg flex items-center gap-3 transition-colors ${
                activeSection === "exchange-rates" 
                  ? "bg-orange-100 text-orange-600 font-medium" 
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <TrendingUp className="h-4 w-4" />
              Taux de Change
            </button>
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-8">{activeSection === "exchange-rates" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Taux de Change</h2>
                <p className="text-gray-600">Gérez les taux de change pour les transferts</p>
              </div>

              <div className="grid gap-6">
              {/* Add New Rate */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="h-5 w-5" />
                    Ajouter un Taux de Change
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <Label htmlFor="fromCurrency">Devise Source</Label>
                      <Input
                        id="fromCurrency"
                        placeholder="EUR"
                        value={newRate.fromCurrency}
                        onChange={(e) => setNewRate({ ...newRate, fromCurrency: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="toCurrency">Devise Destination</Label>
                      <Input
                        id="toCurrency"
                        placeholder="BIF"
                        value={newRate.toCurrency}
                        onChange={(e) => setNewRate({ ...newRate, toCurrency: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="rate">Taux</Label>
                      <Input
                        id="rate"
                        type="number"
                        step="0.000001"
                        placeholder="2850.50"
                        value={newRate.rate}
                        onChange={(e) => setNewRate({ ...newRate, rate: e.target.value })}
                      />
                    </div>
                    <div className="flex items-end">
                      <Button 
                        onClick={() => createRateMutation.mutate(newRate)}
                        disabled={!newRate.fromCurrency || !newRate.toCurrency || !newRate.rate}
                        className="w-full"
                      >
                        Ajouter
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Existing Rates */}
              <Card>
                <CardHeader>
                  <CardTitle>Taux de Change Existants</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {exchangeRates.map((rate) => (
                      <div key={rate.id} className="flex items-center justify-between p-4 border rounded-lg">
                        {editingRate?.id === rate.id ? (
                          <div className="flex items-center gap-4 flex-1">
                            <Input
                              value={editingRate.fromCurrency}
                              onChange={(e) => setEditingRate({ ...editingRate, fromCurrency: e.target.value })}
                              className="w-20"
                            />
                            <span>→</span>
                            <Input
                              value={editingRate.toCurrency}
                              onChange={(e) => setEditingRate({ ...editingRate, toCurrency: e.target.value })}
                              className="w-20"
                            />
                            <Input
                              value={editingRate.rate}
                              onChange={(e) => setEditingRate({ ...editingRate, rate: e.target.value })}
                              type="number"
                              step="0.000001"
                              className="w-32"
                            />
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => updateRateMutation.mutate(editingRate)}>
                                <Save className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => setEditingRate(null)}>
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-4">
                              <Badge variant="outline">{rate.fromCurrency}</Badge>
                              <span>→</span>
                              <Badge variant="outline">{rate.toCurrency}</Badge>
                              <span className="font-mono text-lg">{rate.rate}</span>
                              <span className="text-sm text-gray-500">
                                Mis à jour: {new Date(rate.updatedAt).toLocaleDateString('fr-FR')}
                              </span>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => setEditingRate(rate)}>
                                <Edit3 className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="destructive" 
                                onClick={() => deleteRateMutation.mutate(rate.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
            </div>
          )}

          {activeSection === "services" && (
            <div className="grid gap-6">
              {/* Add New Service */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="h-5 w-5" />
                    Ajouter un Service
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="serviceName">Nom du Service</Label>
                        <Input
                          id="serviceName"
                          value={newService.name}
                          onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="serviceSlug">Slug</Label>
                        <Input
                          id="serviceSlug"
                          value={newService.slug}
                          onChange={(e) => setNewService({ ...newService, slug: e.target.value })}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="shortDesc">Description Courte</Label>
                      <Input
                        id="shortDesc"
                        value={newService.shortDescription}
                        onChange={(e) => setNewService({ ...newService, shortDescription: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="fullDesc">Description Complète</Label>
                      <Textarea
                        id="fullDesc"
                        value={newService.fullDescription}
                        onChange={(e) => setNewService({ ...newService, fullDescription: e.target.value })}
                        rows={4}
                      />
                    </div>
                    <div>
                      <Label htmlFor="imageUrl">URL de l'Image</Label>
                      <Input
                        id="imageUrl"
                        value={newService.imageUrl}
                        onChange={(e) => setNewService({ ...newService, imageUrl: e.target.value })}
                      />
                    </div>
                    <Button 
                      onClick={() => createServiceMutation.mutate(newService)}
                      disabled={!newService.name || !newService.slug}
                    >
                      Ajouter le Service
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Existing Services */}
              <Card>
                <CardHeader>
                  <CardTitle>Services Existants</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    {services.map((service) => (
                      <div key={service.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg">{service.name}</h3>
                            <p className="text-sm text-gray-600 mb-2">{service.shortDescription}</p>
                            <Badge variant={service.isActive ? "default" : "secondary"}>
                              {service.isActive ? "Actif" : "Inactif"}
                            </Badge>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => setEditingService(service)}>
                              <Edit3 className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive" 
                              onClick={() => deleteServiceMutation.mutate(service.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeSection === "products" && (
            <div className="grid gap-6">
              {/* Add New Product */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="h-5 w-5" />
                    Ajouter un Nouveau Produit
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="productName">Nom du Produit</Label>
                        <Input
                          id="productName"
                          placeholder="Ex: Café Burundi Premium"
                          value={newProduct.name}
                          onChange={(e) =>
                            setNewProduct({ ...newProduct, name: e.target.value })
                          }
                        />
                      </div>

                      <div>
                        <Label htmlFor="productDescription">Description</Label>
                        <Textarea
                          id="productDescription"
                          placeholder="Description du produit..."
                          value={newProduct.description}
                          onChange={(e) =>
                            setNewProduct({ ...newProduct, description: e.target.value })
                          }
                          rows={3}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="productPrice">Prix</Label>
                          <Input
                            id="productPrice"
                            type="number"
                            step="0.01"
                            placeholder="25.00"
                            value={newProduct.price}
                            onChange={(e) =>
                              setNewProduct({ ...newProduct, price: e.target.value })
                            }
                          />
                        </div>
                        <div>
                          <Label htmlFor="productCurrency">Devise</Label>
                          <select
                            id="productCurrency"
                            className="w-full h-10 px-3 rounded-md border border-input bg-background"
                            value={newProduct.currency}
                            onChange={(e) =>
                              setNewProduct({ ...newProduct, currency: e.target.value })
                            }
                          >
                            <option value="EUR">EUR</option>
                            <option value="CAD">CAD</option>
                            <option value="CHF">CHF</option>
                            <option value="SEK">SEK</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="productImage">Image du Produit</Label>
                        <div className="mt-2">
                          <input
                            id="productImage"
                            type="file"
                            accept="image/*"
                            onChange={handleProductImageChange}
                            className="hidden"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => document.getElementById('productImage')?.click()}
                            className="w-full"
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            Choisir une Image
                          </Button>
                        </div>
                        {productImagePreview && (
                          <div className="mt-4">
                            <img
                              src={productImagePreview}
                              alt="Aperçu"
                              className="w-full h-32 object-cover rounded-lg border"
                            />
                          </div>
                        )}
                      </div>

                      <Button
                        onClick={() => createProductMutation.mutate(newProduct)}
                        disabled={createProductMutation.isPending || !newProduct.name || !newProduct.price}
                        className="w-full"
                      >
                        {createProductMutation.isPending ? "Création..." : "Créer le Produit"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Products List */}
              <Card>
                <CardHeader>
                  <CardTitle>Produits Existants</CardTitle>
                </CardHeader>
                <CardContent>
                  {products.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">
                      Aucun produit trouvé. Ajoutez votre premier produit ci-dessus.
                    </p>
                  ) : (
                    <div className="grid gap-4">
                      {products.map((product) => (
                        <div key={product.id} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex gap-4">
                              {product.imageUrl && (
                                <img
                                  src={product.imageUrl}
                                  alt={product.name}
                                  className="w-16 h-16 object-cover rounded"
                                />
                              )}
                              <div className="flex-1">
                                <h3 className="font-semibold text-lg">{product.name}</h3>
                                <p className="text-sm text-gray-600 mb-2">{product.description}</p>
                                <div className="flex items-center gap-4">
                                  <span className="font-mono text-lg text-green-600">
                                    {product.price} {product.currency}
                                  </span>
                                  <Badge variant={product.inStock ? "default" : "secondary"}>
                                    {product.inStock ? "En stock" : "Rupture"}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => deleteProductMutation.mutate(product.id)}
                                disabled={deleteProductMutation.isPending}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}