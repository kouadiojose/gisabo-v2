import { useState } from "react";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/i18n";

export default function Contact() {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
    urgency: "normal",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulation d'envoi du formulaire
    setTimeout(() => {
      toast({
        title: t('contact.toast.title'),
        description: t('contact.toast.description'),
      });
      setIsLoading(false);
      
      // Reset form
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        subject: "",
        message: "",
        urgency: "normal",
      });
    }, 1500);
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const contactMethods = [
    {
      icon: "fas fa-envelope",
      title: t('contact.methods.email.title'),
      description: t('contact.methods.email.description'),
      info: "gisabonet@gmail.com",
      action: "mailto:gisabonet@gmail.com",
      color: "primary"
    },
    {
      icon: "fas fa-phone",
      title: t('contact.methods.phone.title'),
      description: t('contact.methods.phone.description'),
      info: "+1 (613) 762-6686",
      action: "tel:+16137626686",
      color: "secondary"
    },
    {
      icon: "fas fa-comments",
      title: t('contact.methods.chat.title'),
      description: t('contact.methods.chat.description'),
      info: t('contact.methods.chat.info'),
      action: "#",
      color: "accent"
    },
    {
      icon: "fas fa-map-marker-alt",
      title: t('contact.methods.address.title'),
      description: t('contact.methods.address.description'),
      info: t('contact.methods.address.info'),
      action: "#",
      color: "green"
    }
  ];

  const getColorClasses = (color: string) => {
    const colorMap: { [key: string]: string } = {
      primary: "bg-primary text-white",
      secondary: "bg-secondary text-white",
      accent: "bg-accent text-white",
      green: "bg-green-500 text-white",
    };
    return colorMap[color] || "bg-gray-500 text-white";
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold font-poppins mb-4">
              {t('contact.title')}<span className="text-secondary">{t('contact.titleHighlight')}</span>
            </h1>
            <p className="text-xl text-gray-100 mb-8 max-w-3xl mx-auto">
              {t('contact.subtitle')}
            </p>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Contact Methods */}
        <section className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 font-poppins mb-4">
              {t('contact.contactMethodsTitle')}
            </h2>
            <p className="text-xl text-gray-600">
              {t('contact.contactMethodsSubtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {contactMethods.map((method, index) => (
              <Card key={index} className="hover:shadow-lg transition-all hover:-translate-y-1">
                <CardContent className="p-6 text-center">
                  <div className={`w-16 h-16 ${getColorClasses(method.color)} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
                    <i className={`${method.icon} text-2xl`}></i>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2 font-poppins">
                    {method.title}
                  </h3>
                  <p className="text-gray-600 text-sm mb-3">
                    {method.description}
                  </p>
                  <p className="font-semibold text-primary mb-4">
                    {method.info}
                  </p>
                  <a href={method.action}>
                    <Button variant="outline" size="sm" className="border-primary text-primary hover:bg-primary hover:text-white">
                      {t('contact.methods.email.action')}
                    </Button>
                  </a>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Contact Form */}
          <Card>
            <CardHeader>
              <CardTitle className="font-poppins">{t('contact.form.title')}</CardTitle>
              <p className="text-gray-600">
                {t('contact.form.subtitle')}
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">{t('contact.form.firstName')} *</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => handleChange("firstName", e.target.value)}
                      required
                      className="mt-1"
                      placeholder="Jean"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">{t('contact.form.lastName')} *</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => handleChange("lastName", e.target.value)}
                      required
                      className="mt-1"
                      placeholder="Dupont"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email">{t('contact.form.email')} *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    required
                    className="mt-1"
                    placeholder="jean@example.com"
                  />
                </div>

                <div>
                  <Label htmlFor="phone">{t('contact.form.phone')}</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    className="mt-1"
                    placeholder="+1 (514) 123-4567"
                  />
                </div>

                <div>
                  <Label htmlFor="subject">{t('contact.form.subject')} *</Label>
                  <Select value={formData.subject} onValueChange={(value) => handleChange("subject", value)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder={t('contact.form.selectSubject')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="transfer">{t('contact.form.subjects.transfer')}</SelectItem>
                      <SelectItem value="marketplace">{t('contact.form.subjects.marketplace')}</SelectItem>
                      <SelectItem value="account">{t('contact.form.subjects.account')}</SelectItem>
                      <SelectItem value="payment">{t('contact.form.subjects.payment')}</SelectItem>
                      <SelectItem value="technical">{t('contact.form.subjects.technical')}</SelectItem>
                      <SelectItem value="partnership">{t('contact.form.subjects.partnership')}</SelectItem>
                      <SelectItem value="other">{t('contact.form.subjects.other')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="urgency">{t('contact.form.urgency')}</Label>
                  <Select value={formData.urgency} onValueChange={(value) => handleChange("urgency", value)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">{t('contact.form.urgencyLevels.low')}</SelectItem>
                      <SelectItem value="normal">{t('contact.form.urgencyLevels.normal')}</SelectItem>
                      <SelectItem value="high">{t('contact.form.urgencyLevels.high')}</SelectItem>
                      <SelectItem value="urgent">{t('contact.form.urgencyLevels.urgent')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="message">{t('contact.form.message')} *</Label>
                  <Textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => handleChange("message", e.target.value)}
                    required
                    className="mt-1"
                    rows={5}
                    placeholder={t('contact.form.messagePlaceholder')}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-primary hover:bg-primary-600 text-white"
                >
                  {isLoading ? (
                    <>
                      <i className="fas fa-spinner fa-spin mr-2"></i>
                      {t('contact.form.sending')}
                    </>
                  ) : (
                    <>
                      <i className="fas fa-paper-plane mr-2"></i>
                      {t('contact.form.send')}
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Additional Information */}
          <div className="space-y-8">
            {/* Business Hours */}
            <Card>
              <CardHeader>
                <CardTitle className="font-poppins">{t('contact.businessHours.title')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="font-medium">{t('contact.businessHours.monday')}</span>
                  <span className="text-gray-600">8h00 - 20h00</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">{t('contact.businessHours.saturday')}</span>
                  <span className="text-gray-600">9h00 - 18h00</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">{t('contact.businessHours.sunday')}</span>
                  <span className="text-gray-600">10h00 - 16h00</span>
                </div>
                <div className="mt-4 p-3 bg-primary/10 rounded-lg">
                  <p className="text-sm text-primary font-medium">
                    {t('contact.businessHours.emergency')}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* FAQ Quick Links */}
            <Card>
              <CardHeader>
                <CardTitle className="font-poppins">{t('contact.faq.title')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <a href="#" className="block text-primary hover:text-primary-600 font-medium">
                    {t('contact.faq.transfer')}
                  </a>
                  <a href="#" className="block text-primary hover:text-primary-600 font-medium">
                    {t('contact.faq.fees')}
                  </a>
                  <a href="#" className="block text-primary hover:text-primary-600 font-medium">
                    {t('contact.faq.tracking')}
                  </a>
                  <a href="#" className="block text-primary hover:text-primary-600 font-medium">
                    {t('contact.faq.orderIssue')}
                  </a>
                  <a href="#" className="block text-primary hover:text-primary-600 font-medium">
                    {t('contact.faq.createAccount')}
                  </a>
                </div>
              </CardContent>
            </Card>

            {/* Emergency Contact */}
            <Card className="bg-gradient-to-r from-red-50 to-red-100 border-red-200">
              <CardHeader>
                <CardTitle className="font-poppins text-red-800">{t('contact.emergency.title')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-red-700 mb-4">
                  {t('contact.emergency.description')}
                </p>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <i className="fas fa-phone text-red-600"></i>
                    <span className="font-semibold text-red-800">+1 (613) 762-6686</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <i className="fas fa-envelope text-red-600"></i>
                    <span className="font-semibold text-red-800">gisabonet@gmail.com</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Office Locations */}
        <section className="mt-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 font-poppins mb-4">
              {t('contact.offices.title')}
            </h2>
            <p className="text-xl text-gray-600">
              {t('contact.offices.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                city: "Gatineau",
                country: "Canada",
                address: "341 Rue Jules-Bordet, Gatineau, QC, Ottawa",
                phone: "+1 (613) 762-6686",
                email: "gisabonet@gmail.com"
              },
              {
                city: "Ottawa",
                country: "Canada",
                address: "Ottawa, ON",
                phone: "+1 (613) 762-6686",
                email: "gisabonet@gmail.com"
              }
            ].map((office, index) => (
              <Card key={index} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2 font-poppins">
                    {office.city}, {office.country}
                  </h3>
                  <div className="space-y-2 text-gray-600">
                    <div className="flex items-start space-x-2">
                      <i className="fas fa-map-marker-alt text-primary mt-1"></i>
                      <span className="text-sm">{office.address}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <i className="fas fa-phone text-primary"></i>
                      <span className="text-sm">{office.phone}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <i className="fas fa-envelope text-primary"></i>
                      <span className="text-sm">{office.email}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
}