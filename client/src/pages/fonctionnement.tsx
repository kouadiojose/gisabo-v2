import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useLanguage } from "@/lib/i18n";

export default function Fonctionnement() {
  const { t } = useLanguage();

  const steps = [
    {
      number: "01",
      title: t("howItWorks.steps.step1Title"),
      description: t("howItWorks.steps.step1Desc"),
      icon: "fas fa-user-plus",
      color: "primary",
    },
    {
      number: "02",
      title: t("howItWorks.steps.step2Title"),
      description: t("howItWorks.steps.step2Desc"),
      icon: "fas fa-list-check",
      color: "secondary",
    },
    {
      number: "03",
      title: t("howItWorks.steps.step3Title"),
      description: t("howItWorks.steps.step3Desc"),
      icon: "fas fa-edit",
      color: "accent",
    },
    {
      number: "04",
      title: t("howItWorks.steps.step4Title"),
      description: t("howItWorks.steps.step4Desc"),
      icon: "fas fa-check-circle",
      color: "green",
    },
    {
      number: "05",
      title: t("howItWorks.steps.step5Title"),
      description: t("howItWorks.steps.step5Desc"),
      icon: "fas fa-credit-card",
      color: "blue",
    },
    {
      number: "06",
      title: t("howItWorks.steps.step6Title"),
      description: t("howItWorks.steps.step6Desc"),
      icon: "fas fa-satellite-dish",
      color: "purple",
    },
  ];

  const features = [
    {
      icon: "fas fa-bolt",
      title: t("howItWorks.features.speedTitle"),
      description: t("howItWorks.features.speedDesc"),
    },
    {
      icon: "fas fa-shield-alt",
      title: t("howItWorks.features.securityTitle"),
      description: t("howItWorks.features.securityDesc"),
    },
    {
      icon: "fas fa-dollar-sign",
      title: t("howItWorks.features.transparencyTitle"),
      description: t("howItWorks.features.transparencyDesc"),
    },
    {
      icon: "fas fa-headset",
      title: t("howItWorks.features.supportTitle"),
      description: t("howItWorks.features.supportDesc"),
    },
  ];

  const getColorClasses = (color: string) => {
    const colorMap: { [key: string]: string } = {
      primary: "bg-primary text-white",
      secondary: "bg-secondary text-white",
      accent: "bg-accent text-white",
      green: "bg-green-500 text-white",
      blue: "bg-blue-500 text-white",
      purple: "bg-purple-500 text-white",
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
              {t("howItWorks.title")}
            </h1>
            <p className="text-xl text-gray-100 mb-8 max-w-3xl mx-auto">
              {t("howItWorks.subtitle")}
            </p>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Process Steps */}
        <section className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 font-poppins mb-4">
              {t("howItWorks.stepsTitle")}
            </h2>
            <p className="text-xl text-gray-600">
              {t("howItWorks.stepsSubtitle")}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <Card
                key={index}
                className="relative overflow-hidden hover:shadow-lg transition-all hover:-translate-y-1"
              >
                <CardContent className="p-8">
                  {/* Step Number */}
                  <div className="absolute top-4 right-4 text-6xl font-bold text-gray-100">
                    {step.number}
                  </div>

                  {/* Icon */}
                  <div
                    className={`w-16 h-16 ${getColorClasses(step.color)} rounded-2xl flex items-center justify-center mb-6 relative z-10`}
                  >
                    <i className={`${step.icon} text-2xl`}></i>
                  </div>

                  {/* Content */}
                  <h3 className="text-xl font-bold text-gray-900 mb-3 font-poppins relative z-10">
                    {step.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed relative z-10">
                    {step.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Key Features */}
        <section className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 font-poppins mb-4">
              {t("howItWorks.whyChooseTitle")}
            </h2>
            <p className="text-xl text-gray-600">
              {t("howItWorks.whyChooseSubtitle")}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="text-center">
                <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <i className={`${feature.icon} text-3xl text-primary`}></i>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3 font-poppins">
                  {feature.title}
                </h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ Quick */}
        <section className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 font-poppins mb-4">
              {t("howItWorks.faqTitle")}
            </h2>
            <p className="text-xl text-gray-600">
              {t("howItWorks.faqSubtitle")}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                question: "Combien de temps prend un transfert ?",
                answer:
                  "La plupart des transferts sont traités instantanément. Le délai maximal est de 24h selon le pays de destination.",
              },
              {
                question: "Quels sont les frais de transfert ?",
                answer:
                  "Nos frais de transfert sont de 0%. Aucun frais caché. Vous payez uniquement le montant que vous envoyez.",
              },
              {
                question: "Comment puis-je suivre ma transaction ?",
                answer:
                  "Vous recevez un numéro de suivi par email et SMS. Vous pouvez aussi consulter votre tableau de bord.",
              },
              {
                question: "Les paiements sont-ils sécurisés ?",
                answer:
                  "Oui, nous utilisons les technologies de sécurité bancaire les plus avancées et sommes partenaires de Square.",
              },
            ].map((faq, index) => (
              <Card key={index} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <h4 className="font-semibold text-gray-900 mb-3">
                    {faq.question}
                  </h4>
                  <p className="text-gray-600">{faq.answer}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-gradient-to-r from-primary to-primary/80 rounded-2xl p-8 text-white text-center">
          <h3 className="text-2xl md:text-3xl font-bold mb-4 font-poppins">
            {t("howItWorks.ctaTitle")}
          </h3>
          <p className="text-xl mb-8 opacity-90">
            {t("howItWorks.ctaSubtitle")}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <Button
                size="lg"
                className="bg-secondary hover:bg-secondary/90 text-white px-8"
              >
                {t("howItWorks.createAccount")}
              </Button>
            </Link>
            <Link href="/contact">
              <Button
                size="lg"
                variant="outline"
                className="border-white text-white hover:bg-white hover:text-primary px-8"
              >
                {t("howItWorks.contactUs")}
              </Button>
            </Link>
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
}
