import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Calendar, X } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

interface Service {
  id: number;
  name: string;
  slug: string;
  shortDescription: string;
  fullDescription: string;
  imageUrl?: string;
  isActive: boolean;
}

export default function ServicesSection() {
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const { t, language } = useLanguage();

  const { data: services, isLoading } = useQuery<Service[]>({
    queryKey: [`/api/services?lang=${language}`],
  });

  if (isLoading) {
    return (
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {t("servicesSection.title")}
            </h2>
            <p className="text-gray-600 text-lg max-w-3xl mx-auto">
              {t("servicesSection.subtitle")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <div className="h-48 bg-gray-200"></div>
                <CardContent className="p-6">
                  <div className="h-6 bg-gray-200 rounded mb-3"></div>
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="text-center mt-8">
            <p className="text-gray-500">{t("servicesSection.loading")}</p>
          </div>
        </div>
      </section>
    );
  }

  if (!services || !Array.isArray(services) || services.length === 0) {
    return (
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {t("servicesSection.title")}
          </h2>
          <p className="text-gray-600 text-lg mb-8">
            {t("servicesSection.subtitle")}
          </p>
          <div className="bg-gray-50 rounded-lg p-12">
            <Calendar className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <p className="text-gray-500 text-lg">
              {t("servicesSection.comingSoon")}
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-white" id="services">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {t("servicesSection.title")}
          </h2>
          <p className="text-gray-600 text-lg max-w-3xl mx-auto">
            {t("servicesSection.subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {Array.isArray(services) &&
            services
              .filter((service) => service.isActive)
              .map((service) => (
                <Card
                  key={service.id}
                  className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg overflow-hidden"
                >
                  {/* Image en haut qui prend toute la largeur */}
                  <div className="relative h-48 w-full overflow-hidden">
                    {service.imageUrl ? (
                      <img
                        src={service.imageUrl}
                        alt={service.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect width='400' height='300' fill='%23f3f4f6'/%3E%3Ctext x='200' y='150' text-anchor='middle' dy='0.3em' font-family='Arial, sans-serif' font-size='18' fill='%236b7280'%3E${t("servicesSection.imageNotAvailable")}%3C/text%3E%3C/svg%3E`;
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center">
                        <div className="text-center text-gray-500">
                          <Calendar className="mx-auto h-12 w-12 mb-2 text-orange-400" />
                          <p className="text-sm">
                            {t("servicesSection.imageNotAvailable")}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Contenu de la carte */}
                  <CardContent className="p-6 h-auto flex flex-col">
                    <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-orange-600 transition-colors">
                      {service.name}
                    </h3>

                    <p className="text-gray-600 mb-6 leading-relaxed line-clamp-3">
                      {service.shortDescription}
                    </p>

                    <div className="mt-auto">
                      <Button
                        onClick={() => setSelectedService(service)}
                        variant="ghost"
                        className="flex items-center text-orange-600 font-semibold hover:text-orange-700 hover:bg-orange-50 transition-colors p-0"
                      >
                        {t("servicesSection.details")}
                        <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
        </div>

        {/* Modal pour les détails du service */}
        {selectedService && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {selectedService.name}
                  </h2>
                  <Button
                    onClick={() => setSelectedService(null)}
                    variant="ghost"
                    size="sm"
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                <div className="space-y-4">
                  {selectedService.imageUrl && (
                    <div className="w-full h-64 rounded-lg overflow-hidden">
                      <img
                        src={selectedService.imageUrl}
                        alt={selectedService.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect width='400' height='300' fill='%23f3f4f6'/%3E%3Ctext x='200' y='150' text-anchor='middle' dy='0.3em' font-family='Arial, sans-serif' font-size='18' fill='%236b7280'%3E${t("servicesSection.imageNotAvailable")}%3C/text%3E%3C/svg%3E`;
                        }}
                      />
                    </div>
                  )}

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {t("servicesSection.description")}
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      {selectedService.shortDescription}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {t("servicesSection.fullDetails")}
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      {selectedService.fullDescription}
                    </p>
                  </div>

                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-green-800 font-medium">
                      ✓ {t("servicesSection.serviceAvailable")}
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex justify-end">
                  <Button
                    onClick={() => setSelectedService(null)}
                    variant="outline"
                  >
                    {t("servicesSection.close")}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
