import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  Upload, 
  Edit3, 
  Trash2, 
  Settings, 
  Package, 
  TrendingUp,
  LogOut,
  Send,
  ShoppingCart,
  X
} from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";

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

interface AdminTransfer {
  id: number;
  amount: string;
  currency: string;
  recipientName: string;
  destinationCountry: string;
  deliveryMethod: string;
  status: string;
  createdAt: string;
}

interface AdminOrder {
  id: number;
  total: string;
  currency: string;
  status: string;
  shippingAddress?: { firstName?: string; lastName?: string; phone?: string };
  createdAt: string;
}

function isAdminAuthenticated(): boolean {
  const token = localStorage.getItem('adminToken');
  if (!token) return false;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp > Date.now() / 1000;
  } catch {
    return false;
  }
}

function getAdminAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('adminToken');
  if (token) {
    return { 'Authorization': `Bearer ${token}` };
  }
  return {};
}

export default function AdminSidebar() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [activeSection, setActiveSection] = useState("services");

  // State for Services
  const [newService, setNewService] = useState({
    name: "",
    slug: "",
    shortDescription: "",
    fullDescription: "",
    imageUrl: "",
    isActive: true
  });
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");

  // State for Products
  const [newProduct, setNewProduct] = useState({
    name: "",
    slug: "",
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

  // State for Exchange Rates
  const [newRate, setNewRate] = useState({ fromCurrency: "", toCurrency: "", rate: "" });
  const [editingRate, setEditingRate] = useState<ExchangeRate | null>(null);

  // Fetch data
  const { data: exchangeRates } = useQuery<ExchangeRate[]>({
    queryKey: ["/api/admin/exchange-rates"],
    enabled: isAdminAuthenticated(),
  });

  const { data: services } = useQuery<Service[]>({
    queryKey: ["/api/admin/services"],
    enabled: isAdminAuthenticated(),
  });

  const { data: products } = useQuery<Product[]>({
    queryKey: ["/api/products"],
    enabled: isAdminAuthenticated(),
  });

  // Requêtes admin authentifiées avec le token admin (getAdminAuthHeaders).
  const { data: adminTransfers, isLoading: transfersLoading } = useQuery<AdminTransfer[]>({
    queryKey: ["/api/admin/transfers"],
    enabled: isAdminAuthenticated(),
    queryFn: async () => {
      const res = await fetch("/api/admin/transfers", { headers: getAdminAuthHeaders() });
      if (!res.ok) throw new Error("Erreur lors du chargement des transactions");
      return res.json();
    },
  });

  const { data: adminOrders, isLoading: ordersLoading } = useQuery<AdminOrder[]>({
    queryKey: ["/api/admin/orders"],
    enabled: isAdminAuthenticated(),
    queryFn: async () => {
      const res = await fetch("/api/admin/orders", { headers: getAdminAuthHeaders() });
      if (!res.ok) throw new Error("Erreur lors du chargement des commandes");
      return res.json();
    },
  });

  // Upload image function
  const uploadImage = async (file: File): Promise<string> => {
    const token = localStorage.getItem('adminToken');
    const formData = new FormData();
    formData.append('image', file);
    
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch('/api/admin/upload-image', {
      method: 'POST',
      body: formData,
      headers,
    });
    
    if (!response.ok) throw new Error('Failed to upload image');
    const result = await response.json();
    return result.imageUrl;
  };

  // Service mutations
  const createServiceMutation = useMutation({
    mutationFn: async (service: typeof newService) => {
      let finalService = { ...service };
      
      if (selectedImageFile) {
        const imageUrl = await uploadImage(selectedImageFile);
        finalService.imageUrl = imageUrl;
      }
      
      const token = localStorage.getItem('adminToken');
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch("/api/admin/services", {
        method: "POST",
        headers: headers as HeadersInit,
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
      toast({ title: "Service créé" });
    },
  });

  const updateServiceMutation = useMutation({
    mutationFn: async ({ id, ...service }: Service) => {
      let finalService = { ...service };
      
      if (selectedImageFile) {
        const imageUrl = await uploadImage(selectedImageFile);
        finalService.imageUrl = imageUrl;
      }
      
      const response = await fetch(`/api/admin/services/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getAdminAuthHeaders(),
        },
        body: JSON.stringify(finalService),
      });
      
      if (!response.ok) throw new Error("Failed to update service");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/services"] });
      setEditingService(null);
      setSelectedImageFile(null);
      setImagePreview("");
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

  // Product mutations
  const createProductMutation = useMutation({
    mutationFn: async (product: typeof newProduct) => {
      let finalProduct = { ...product };
      
      if (selectedProductImageFile) {
        const imageUrl = await uploadImage(selectedProductImageFile);
        finalProduct.imageUrl = imageUrl;
      }
      
      const response = await fetch("/api/admin/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAdminAuthHeaders(),
        },
        body: JSON.stringify(finalProduct),
      });
      
      if (!response.ok) throw new Error("Failed to create product");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setNewProduct({
        name: "",
        slug: "",
        description: "",
        price: "",
        currency: "EUR",
        categoryId: 1,
        imageUrl: "",
        inStock: true
      });
      setSelectedProductImageFile(null);
      setProductImagePreview("");
      toast({ title: "Produit créé" });
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: async ({ id, ...product }: Product) => {
      let finalProduct = { ...product };
      
      if (selectedProductImageFile) {
        const imageUrl = await uploadImage(selectedProductImageFile);
        finalProduct.imageUrl = imageUrl;
      }
      
      const response = await fetch(`/api/admin/products/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getAdminAuthHeaders(),
        },
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
      toast({ title: "Produit mis à jour" });
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

  // Handle image change
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      
      setSelectedImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

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

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    setLocation('/admin-login');
  };

  if (!isAdminAuthenticated()) {
    setLocation('/admin-login');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-gray-900">Gisabo Admin</h1>
        </div>
        
        <nav className="px-4 space-y-2">
          <button
            onClick={() => setActiveSection("services")}
            className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
              activeSection === "services" 
                ? "bg-blue-50 text-blue-700 border border-blue-200" 
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Settings className="h-5 w-5" />
            Services
          </button>
          
          <button
            onClick={() => setActiveSection("products")}
            className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
              activeSection === "products" 
                ? "bg-blue-50 text-blue-700 border border-blue-200" 
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Package className="h-5 w-5" />
            Produits
          </button>
          
          <button
            onClick={() => setActiveSection("rates")}
            className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
              activeSection === "rates" 
                ? "bg-blue-50 text-blue-700 border border-blue-200" 
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <TrendingUp className="h-5 w-5" />
            Taux de Change
          </button>

          <button
            onClick={() => setActiveSection("transactions")}
            className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
              activeSection === "transactions"
                ? "bg-blue-50 text-blue-700 border border-blue-200"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Send className="h-5 w-5" />
            Transactions
          </button>

          <button
            onClick={() => setActiveSection("orders")}
            className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
              activeSection === "orders"
                ? "bg-blue-50 text-blue-700 border border-blue-200"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <ShoppingCart className="h-5 w-5" />
            Commandes
          </button>
        </nav>

        <div className="absolute bottom-4 left-4 right-4">
          <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            Déconnexion
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8">
        <div className="max-w-6xl mx-auto">
          {/* Services Section */}
          {activeSection === "services" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Services</h2>
                <p className="text-gray-600">Gérez les services offerts par Gisabo</p>
              </div>

              {/* Add New Service */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="h-5 w-5" />
                    {editingService ? "Modifier le Service" : "Ajouter un Nouveau Service"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="serviceName">Nom du Service</Label>
                        <Input
                          id="serviceName"
                          placeholder="Ex: Transfert d'argent"
                          value={editingService ? editingService.name : newService.name}
                          onChange={(e) => {
                            const name = e.target.value;
                            const slug = name
                              .toLowerCase()
                              .normalize('NFD')
                              .replace(/[\u0300-\u036f]/g, '') // remove accents
                              .replace(/[^a-z0-9\s-]/g, '') // keep only letters, numbers, spaces, and hyphens
                              .replace(/\s+/g, '-') // replace spaces with hyphens
                              .replace(/-+/g, '-') // replace multiple hyphens with single
                              .trim();
                            
                            if (editingService) {
                              setEditingService({ ...editingService, name, slug });
                            } else {
                              setNewService({ ...newService, name, slug });
                            }
                          }}
                        />
                      </div>

                      <div>
                        <Label htmlFor="serviceShortDesc">Description Courte</Label>
                        <Textarea
                          id="serviceShortDesc"
                          placeholder="Description courte du service..."
                          value={editingService ? editingService.shortDescription : newService.shortDescription}
                          onChange={(e) => {
                            if (editingService) {
                              setEditingService({ ...editingService, shortDescription: e.target.value });
                            } else {
                              setNewService({ ...newService, shortDescription: e.target.value });
                            }
                          }}
                          rows={2}
                        />
                      </div>

                      <div>
                        <Label htmlFor="serviceFullDesc">Description Complète</Label>
                        <Textarea
                          id="serviceFullDesc"
                          placeholder="Description complète du service..."
                          value={editingService ? editingService.fullDescription : newService.fullDescription}
                          onChange={(e) => {
                            if (editingService) {
                              setEditingService({ ...editingService, fullDescription: e.target.value });
                            } else {
                              setNewService({ ...newService, fullDescription: e.target.value });
                            }
                          }}
                          rows={4}
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="serviceImage">Image du Service</Label>
                        <div className="mt-2 space-y-3">
                          <Input
                            id="serviceImage"
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                          />
                          <p className="text-xs text-gray-500">Max 5MB, formats: JPG, PNG, GIF</p>
                          
                          {imagePreview && (
                            <div className="relative w-32 h-32 rounded-lg overflow-hidden border border-gray-200">
                              <img 
                                src={imagePreview} 
                                alt="Aperçu" 
                                className="w-full h-full object-cover"
                              />
                              <Button
                                size="sm"
                                variant="destructive"
                                className="absolute top-1 right-1 h-6 w-6 p-0"
                                onClick={() => {
                                  setSelectedImageFile(null);
                                  setImagePreview("");
                                }}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                          
                          {editingService?.imageUrl && !imagePreview && (
                            <div className="relative w-32 h-32 rounded-lg overflow-hidden border border-gray-200">
                              <img 
                                src={editingService.imageUrl} 
                                alt="Image actuelle" 
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-3">
                        {editingService ? (
                          <>
                            <Button 
                              onClick={() => updateServiceMutation.mutate(editingService)}
                              disabled={updateServiceMutation.isPending || !editingService.name}
                              className="flex-1"
                            >
                              {updateServiceMutation.isPending ? "Modification..." : "Modifier"}
                            </Button>
                            <Button 
                              variant="outline"
                              onClick={() => {
                                setEditingService(null);
                                setSelectedImageFile(null);
                                setImagePreview("");
                              }}
                            >
                              Annuler
                            </Button>
                          </>
                        ) : (
                          <Button 
                            onClick={() => createServiceMutation.mutate(newService)}
                            disabled={createServiceMutation.isPending || !newService.name}
                            className="flex-1"
                          >
                            {createServiceMutation.isPending ? "Création..." : "Créer le Service"}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Services List */}
              <Card>
                <CardHeader>
                  <CardTitle>Services Existants</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {services?.map((service: Service) => (
                      <div key={service.id} className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg">
                        {service.imageUrl && (
                          <img 
                            src={service.imageUrl} 
                            alt={service.name}
                            className="w-16 h-16 object-cover rounded-lg"
                          />
                        )}
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-gray-900">{service.name}</h3>
                                <Badge variant={service.isActive ? "default" : "secondary"}>
                                  {service.isActive ? "Actif" : "Inactif"}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600 mb-2">{service.shortDescription}</p>
                              <p className="text-xs text-gray-500">Slug: {service.slug}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingService(service);
                                setSelectedImageFile(null);
                                setImagePreview("");
                              }}
                            >
                              <Edit3 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => deleteServiceMutation.mutate(service.id)}
                              disabled={deleteServiceMutation.isPending}
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

          {/* Products Section */}
          {activeSection === "products" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Produits</h2>
                <p className="text-gray-600">Gérez les produits du marketplace</p>
              </div>

              {/* Add New Product */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="h-5 w-5" />
                    {editingProduct ? "Modifier le Produit" : "Ajouter un Nouveau Produit"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="productName">Nom du Produit</Label>
                        <Input
                          id="productName"
                          placeholder="Ex: Café Burundi Premium"
                          value={editingProduct ? editingProduct.name : newProduct.name}
                          onChange={(e) => {
                            const name = e.target.value;
                            const slug = name
                              .toLowerCase()
                              .normalize('NFD')
                              .replace(/[\u0300-\u036f]/g, '')
                              .replace(/[^a-z0-9\s-]/g, '')
                              .replace(/\s+/g, '-')
                              .replace(/-+/g, '-')
                              .trim();
                            
                            if (editingProduct) {
                              setEditingProduct({ ...editingProduct, name });
                            } else {
                              setNewProduct({ ...newProduct, name, slug });
                            }
                          }}
                        />
                      </div>

                      <div>
                        <Label htmlFor="productDescription">Description</Label>
                        <Textarea
                          id="productDescription"
                          placeholder="Description du produit..."
                          value={editingProduct ? editingProduct.description : newProduct.description}
                          onChange={(e) => {
                            if (editingProduct) {
                              setEditingProduct({ ...editingProduct, description: e.target.value });
                            } else {
                              setNewProduct({ ...newProduct, description: e.target.value });
                            }
                          }}
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
                            placeholder="29.99"
                            value={editingProduct ? editingProduct.price : newProduct.price}
                            onChange={(e) => {
                              if (editingProduct) {
                                setEditingProduct({ ...editingProduct, price: e.target.value });
                              } else {
                                setNewProduct({ ...newProduct, price: e.target.value });
                              }
                            }}
                          />
                        </div>
                        <div>
                          <Label htmlFor="productCurrency">Devise</Label>
                          <Input
                            id="productCurrency"
                            placeholder="EUR"
                            value={editingProduct ? editingProduct.currency : newProduct.currency}
                            onChange={(e) => {
                              if (editingProduct) {
                                setEditingProduct({ ...editingProduct, currency: e.target.value });
                              } else {
                                setNewProduct({ ...newProduct, currency: e.target.value });
                              }
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="productImage">Image du Produit</Label>
                        <div className="mt-2 space-y-3">
                          <Input
                            id="productImage"
                            type="file"
                            accept="image/*"
                            onChange={handleProductImageChange}
                            className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                          />
                          <p className="text-xs text-gray-500">Max 5MB, formats: JPG, PNG, GIF</p>
                          
                          {productImagePreview && (
                            <div className="relative w-32 h-32 rounded-lg overflow-hidden border border-gray-200">
                              <img 
                                src={productImagePreview} 
                                alt="Aperçu" 
                                className="w-full h-full object-cover"
                              />
                              <Button
                                size="sm"
                                variant="destructive"
                                className="absolute top-1 right-1 h-6 w-6 p-0"
                                onClick={() => {
                                  setSelectedProductImageFile(null);
                                  setProductImagePreview("");
                                }}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                          
                          {editingProduct?.imageUrl && !productImagePreview && (
                            <div className="relative w-32 h-32 rounded-lg overflow-hidden border border-gray-200">
                              <img 
                                src={editingProduct.imageUrl} 
                                alt="Image actuelle" 
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-3">
                        {editingProduct ? (
                          <>
                            <Button 
                              onClick={() => updateProductMutation.mutate(editingProduct)}
                              disabled={updateProductMutation.isPending || !editingProduct.name}
                              className="flex-1"
                            >
                              {updateProductMutation.isPending ? "Modification..." : "Modifier"}
                            </Button>
                            <Button 
                              variant="outline"
                              onClick={() => {
                                setEditingProduct(null);
                                setSelectedProductImageFile(null);
                                setProductImagePreview("");
                              }}
                            >
                              Annuler
                            </Button>
                          </>
                        ) : (
                          <Button 
                            onClick={() => createProductMutation.mutate(newProduct)}
                            disabled={createProductMutation.isPending || !newProduct.name}
                            className="flex-1"
                          >
                            {createProductMutation.isPending ? "Création..." : "Créer le Produit"}
                          </Button>
                        )}
                      </div>
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
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {products?.map((product: Product) => (
                      <div key={product.id} className="border border-gray-200 rounded-lg p-4">
                        {product.imageUrl && (
                          <img 
                            src={product.imageUrl} 
                            alt={product.name}
                            className="w-full h-32 object-cover rounded-lg mb-3"
                          />
                        )}
                        <div className="space-y-2">
                          <div className="flex items-start justify-between">
                            <h3 className="font-semibold text-gray-900">{product.name}</h3>
                            <Badge variant={product.inStock ? "default" : "secondary"}>
                              {product.inStock ? "En stock" : "Rupture"}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600">{product.description}</p>
                          <p className="font-semibold text-green-600">{product.price} {product.currency}</p>
                          
                          <div className="flex gap-2 pt-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingProduct(product);
                                setSelectedProductImageFile(null);
                                setProductImagePreview("");
                              }}
                            >
                              <Edit3 className="h-4 w-4" />
                            </Button>
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
                </CardContent>
              </Card>
            </div>
          )}

          {/* Exchange Rates Section */}
          {activeSection === "rates" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Taux de Change</h2>
                <p className="text-gray-600">Gérez les taux de change pour les transferts</p>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Taux de Change Actuels</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {exchangeRates?.map((rate: ExchangeRate) => (
                      <div key={rate.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div>
                          <p className="font-semibold">{rate.fromCurrency} → {rate.toCurrency}</p>
                          <p className="text-sm text-gray-600">Taux: {rate.rate}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeSection === "transactions" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Transactions</h2>
                <p className="text-gray-600">Tous les transferts d'argent effectués sur la plateforme</p>
              </div>

              <Card>
                <CardContent className="p-0 overflow-x-auto">
                  {transfersLoading ? (
                    <p className="p-6 text-gray-500">Chargement…</p>
                  ) : !adminTransfers || adminTransfers.length === 0 ? (
                    <p className="p-6 text-gray-500">Aucune transaction pour le moment.</p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-left text-gray-600">
                        <tr>
                          <th className="px-4 py-3">#</th>
                          <th className="px-4 py-3">Date</th>
                          <th className="px-4 py-3">Bénéficiaire</th>
                          <th className="px-4 py-3">Montant</th>
                          <th className="px-4 py-3">Destination</th>
                          <th className="px-4 py-3">Méthode</th>
                          <th className="px-4 py-3">Statut</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adminTransfers.map((tr) => (
                          <tr key={tr.id} className="border-t border-gray-100">
                            <td className="px-4 py-3 font-medium">#{tr.id}</td>
                            <td className="px-4 py-3 whitespace-nowrap">{new Date(tr.createdAt).toLocaleString("fr-FR")}</td>
                            <td className="px-4 py-3">{tr.recipientName}</td>
                            <td className="px-4 py-3 font-semibold">{Number(tr.amount).toFixed(2)} {tr.currency}</td>
                            <td className="px-4 py-3">{tr.destinationCountry}</td>
                            <td className="px-4 py-3">{tr.deliveryMethod}</td>
                            <td className="px-4 py-3"><Badge variant="secondary">{tr.status}</Badge></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {activeSection === "orders" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Commandes</h2>
                <p className="text-gray-600">Tous les achats de produits effectués sur la plateforme</p>
              </div>

              <Card>
                <CardContent className="p-0 overflow-x-auto">
                  {ordersLoading ? (
                    <p className="p-6 text-gray-500">Chargement…</p>
                  ) : !adminOrders || adminOrders.length === 0 ? (
                    <p className="p-6 text-gray-500">Aucune commande pour le moment.</p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-left text-gray-600">
                        <tr>
                          <th className="px-4 py-3">#</th>
                          <th className="px-4 py-3">Date</th>
                          <th className="px-4 py-3">Client</th>
                          <th className="px-4 py-3">Téléphone</th>
                          <th className="px-4 py-3">Total</th>
                          <th className="px-4 py-3">Statut</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adminOrders.map((od) => (
                          <tr key={od.id} className="border-t border-gray-100">
                            <td className="px-4 py-3 font-medium">#{od.id}</td>
                            <td className="px-4 py-3 whitespace-nowrap">{new Date(od.createdAt).toLocaleString("fr-FR")}</td>
                            <td className="px-4 py-3">{[od.shippingAddress?.firstName, od.shippingAddress?.lastName].filter(Boolean).join(" ") || "—"}</td>
                            <td className="px-4 py-3">{od.shippingAddress?.phone || "—"}</td>
                            <td className="px-4 py-3 font-semibold">{Number(od.total).toFixed(2)} {od.currency}</td>
                            <td className="px-4 py-3"><Badge variant="secondary">{od.status}</Badge></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}