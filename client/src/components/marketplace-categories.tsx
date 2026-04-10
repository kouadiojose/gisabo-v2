import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Category, Product } from "@/lib/types";

export default function MarketplaceCategories() {
  const { data: categories, isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const { data: products, isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const featuredProducts = Array.isArray(products) ? products.slice(0, 4) : [];

  if (categoriesLoading || productsLoading) {
    return (
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 font-poppins mb-4">
              Catégories Populaires
            </h2>
            <p className="text-xl text-gray-600">
              Explorez nos produits et services africains authentiques
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 md:gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl p-6 animate-pulse">
                <div className="w-12 h-12 bg-gray-200 rounded-lg mb-4"></div>
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  const getCategoryColor = (color: string) => {
    const colorMap: { [key: string]: string } = {
      green: "bg-green-100 group-hover:bg-green-200 text-green-600",
      red: "bg-red-100 group-hover:bg-red-200 text-red-600",
      orange: "bg-orange-100 group-hover:bg-orange-200 text-orange-600",
      blue: "bg-blue-100 group-hover:bg-blue-200 text-blue-600",
      purple: "bg-purple-100 group-hover:bg-purple-200 text-purple-600",
      yellow: "bg-yellow-100 group-hover:bg-yellow-200 text-yellow-600",
    };
    return colorMap[color] || "bg-gray-100 group-hover:bg-gray-200 text-gray-600";
  };

  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 font-poppins mb-4">
            Catégories Populaires
          </h2>
          <p className="text-xl text-gray-600">
            Explorez nos produits et services africains authentiques
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 md:gap-6">
          {Array.isArray(categories) && categories.map((category) => (
            <Link key={category.id} href={`/marketplace?category=${category.id}`}>
              <Card className="hover:shadow-lg transition-all cursor-pointer group hover:-translate-y-1">
                <CardContent className="p-6">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 transition-colors ${getCategoryColor(category.color)}`}>
                    <i className={`${category.icon} text-xl`}></i>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{category.name}</h3>
                  <p className="text-sm text-gray-600">Produits authentiques</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Featured Products */}
        {featuredProducts.length > 0 && (
          <div className="mt-16">
            <h3 className="text-2xl font-bold text-gray-900 mb-8 font-poppins">Produits en Vedette</h3>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredProducts.map((product) => (
                <Card key={product.id} className="shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                  <div className="h-48 bg-gray-200 flex items-center justify-center">
                    {product.imageUrl ? (
                      <img 
                        src={product.imageUrl} 
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <i className="fas fa-image text-gray-400 text-3xl"></i>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <h4 className="font-semibold text-gray-900 mb-2">{product.name}</h4>
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">{product.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-primary">{product.price} {product.currency}</span>
                      <Button
                        size="sm"
                        className="bg-primary hover:bg-primary-600 text-white"
                      >
                        <i className="fas fa-plus mr-1"></i>Ajouter
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="text-center mt-8">
              <Link href="/marketplace">
                <Button variant="outline" className="border-primary text-primary hover:bg-primary hover:text-white">
                  Voir tous les produits
                  <i className="fas fa-arrow-right ml-2"></i>
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
