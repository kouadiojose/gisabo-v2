import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Plus, Upload, Edit, Trash2 } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import Navbar from "@/components/navbar";

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

function isAdminAuthenticated(): boolean {
  const token = localStorage.getItem("admin_token");
  return !!token;
}

function getAdminAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem("admin_token");
  if (token) {
    return {
      "Authorization": `Bearer ${token}`,
    };
  }
  return {};
}

export default function SimpleAdmin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const authenticated = isAdminAuthenticated();

  const [newProduct, setNewProduct] = useState({
    name: "",
    description: "",
    price: "",
    currency: "EUR",
    categoryId: 1,
    imageUrl: "",
    inStock: true
  });

  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");

  // Fetch products
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  // Upload image function
  const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("image", file);
    
    const response = await fetch("/api/upload", {
      method: "POST",
      headers: getAdminAuthHeaders(),
      body: formData,
    });
    
    if (!response.ok) throw new Error("Failed to upload image");
    const data = await response.json();
    return data.imageUrl;
  };

  // Create product mutation
  const createProductMutation = useMutation({
    mutationFn: async (product: typeof newProduct) => {
      let finalProduct = { ...product };
      
      if (selectedImageFile) {
        const imageUrl = await uploadImage(selectedImageFile);
        finalProduct.imageUrl = imageUrl;
      }
      
      const headers = {
        "Content-Type": "application/json",
        ...getAdminAuthHeaders(),
      };
      
      const response = await fetch("/api/admin/products", {
        method: "POST",
        headers,
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
      setSelectedImageFile(null);
      setImagePreview("");
      toast({ title: "Produit créé avec succès" });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la création du produit",
        variant: "destructive",
      });
    },
  });

  // Delete product mutation
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

  if (!authenticated) {
    setLocation("/admin-login");
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 font-poppins">
            Gestion des Produits
          </h1>
          <p className="text-gray-600 mt-2">
            Ajoutez et gérez les produits du marketplace
          </p>
        </div>

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
                        onChange={handleImageChange}
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
                    {imagePreview && (
                      <div className="mt-4">
                        <img
                          src={imagePreview}
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {products.map((product) => (
                    <div
                      key={product.id}
                      className="border rounded-lg p-4 space-y-3"
                    >
                      {product.imageUrl && (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full h-32 object-cover rounded"
                        />
                      )}
                      <div>
                        <h3 className="font-semibold">{product.name}</h3>
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {product.description}
                        </p>
                        <p className="text-lg font-bold text-green-600">
                          {product.price} {product.currency}
                        </p>
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
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}