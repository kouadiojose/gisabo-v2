import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/navbar";
import { Service } from "@/lib/types";
import { useState } from "react";
import { useLanguage } from "@/lib/i18n";

export default function Services() {
  const { t, language } = useLanguage();
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  
  const { data: services, isLoading } = useQuery<Service[]>({
    queryKey: [`/api/services?lang=${language}`],
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-4 font-poppins">
            {t('servicesSection.title')}
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            {t('servicesSection.subtitle')}
          </p>
        </div>

        {/* Services Grid */}
        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <div className="w-full h-48 bg-gray-200 rounded-t-lg"></div>
                <CardContent className="p-6">
                  <div className="h-6 bg-gray-200 rounded w-3/4 mb-3"></div>
                  <div className="h-4 bg-gray-200 rounded mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-5/6 mb-4"></div>
                  <div className="h-10 bg-gray-200 rounded w-24"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : Array.isArray(services) && services.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services
              .filter(service => service.isActive)
              .map((service) => (
                <Card 
                  key={service.id} 
                  className="overflow-hidden hover:shadow-lg transition-shadow duration-300"
                >
                  {/* Image */}
                  {service.imageUrl && (
                    <div className="relative h-48 w-full overflow-hidden">
                      <img
                        src={service.imageUrl}
                        alt={service.name}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect width='400' height='300' fill='%23f3f4f6'/%3E%3Ctext x='200' y='150' text-anchor='middle' dy='0.3em' font-family='Arial, sans-serif' font-size='18' fill='%236b7280'%3EImage non disponible%3C/text%3E%3C/svg%3E";
                        }}
                      />
                    </div>
                  )}
                  
                  <CardContent className="p-6">
                    {/* Nom du service */}
                    <h3 className="text-xl font-semibold text-gray-900 mb-3 font-poppins">
                      {service.name}
                    </h3>
                    
                    {/* Description brève */}
                    <p className="text-gray-600 text-sm leading-relaxed mb-4 line-clamp-3">
                      {service.shortDescription}
                    </p>
                    
                    {/* Bouton Détails */}
                    <Button 
                      onClick={() => setSelectedService(service)}
                      className="bg-primary hover:bg-primary/90 text-white"
                    >
                      {t('servicesSection.details')}
                    </Button>
                  </CardContent>
                </Card>
              ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
              <i className="fas fa-concierge-bell text-3xl text-gray-400"></i>
            </div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-4">
              {t('servicesSection.noServices')}
            </h3>
            <p className="text-gray-600 max-w-md mx-auto">
              {t('servicesSection.noServicesText')}
            </p>
          </div>
        )}

        {/* Modal pour les détails du service */}
        {selectedService && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-gray-900 font-poppins">
                    {selectedService.name}
                  </h2>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedService(null)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </Button>
                </div>
                
                {selectedService.imageUrl && (
                  <div className="mb-6">
                    <img
                      src={selectedService.imageUrl}
                      alt={selectedService.name}
                      className="w-full h-64 object-cover rounded-lg"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect width='400' height='300' fill='%23f3f4f6'/%3E%3Ctext x='200' y='150' text-anchor='middle' dy='0.3em' font-family='Arial, sans-serif' font-size='18' fill='%236b7280'%3EImage non disponible%3C/text%3E%3C/svg%3E";
                      }}
                    />
                  </div>
                )}
                
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">{t('services.description')}</h3>
                    <p className="text-gray-600 leading-relaxed">
                      {selectedService.shortDescription}
                    </p>
                  </div>
                  
                  {selectedService.fullDescription && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">{t('services.fullDetails')}</h3>
                      <p className="text-gray-600 leading-relaxed">
                        {selectedService.fullDescription}
                      </p>
                    </div>
                  )}
                  
                  <div className="border-t pt-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm text-green-600 font-medium">
                        {t('services.available')}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 flex justify-end">
                  <Button
                    onClick={() => setSelectedService(null)}
                    variant="outline"
                  >
                    {t('services.close')}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Contact Section */}
        <div className="mt-20 bg-primary text-white rounded-2xl p-8 md:p-12 text-center">
          <h2 className="text-3xl font-bold mb-4 font-poppins">
            {t('servicesSection.personalizedService')}
          </h2>
          <p className="text-xl mb-8 opacity-90">
            {t('servicesSection.personalizedText')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="tel:+1234567890"
              className="bg-white text-primary px-6 py-3 rounded-lg font-medium hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
            >
              <i className="fas fa-phone"></i>
              {t('servicesSection.callUs')}
            </a>
            <a
              href="mailto:contact@gisabogroup.ca"
              className="border-2 border-white text-white px-6 py-3 rounded-lg font-medium hover:bg-white hover:text-primary transition-colors flex items-center justify-center gap-2"
            >
              <i className="fas fa-envelope"></i>
              {t('servicesSection.writeUs')}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}