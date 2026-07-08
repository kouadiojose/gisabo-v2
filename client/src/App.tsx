import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/home";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Dashboard from "@/pages/dashboard";
import Marketplace from "@/pages/marketplace";
import Cart from "@/pages/cart";
import Checkout from "@/pages/checkout";
import OrderSuccess from "@/pages/order-success";
import Transfer from "@/pages/transfer";
import Services from "@/pages/services";
import Gisabo from "@/pages/gisabo";
import Fonctionnement from "@/pages/fonctionnement";
import Contact from "@/pages/contact";
import Profile from "@/pages/profile";
import PaymentSuccess from "@/pages/payment-success";
import AdminLogin from "@/pages/admin-login";
import AdminSidebar from "@/pages/admin-sidebar-fixed";
import NotFound from "@/pages/not-found";
import Chatbot from "@/components/chatbot";
import { useEffect } from "react";
import { apiRequest } from "./lib/queryClient";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/marketplace" component={Marketplace} />
      <Route path="/cart" component={Cart} />
      <Route path="/checkout" component={Checkout} />
      <Route path="/order-success" component={OrderSuccess} />
      <Route path="/transfer" component={Transfer} />
      <Route path="/services" component={Services} />
      <Route path="/gisabo" component={Gisabo} />
      <Route path="/fonctionnement" component={Fonctionnement} />
      <Route path="/contact" component={Contact} />
      <Route path="/profile" component={Profile} />
      <Route path="/payment-success" component={PaymentSuccess} />
      <Route path="/admin-login" component={AdminLogin} />
      <Route path="/admin" component={AdminSidebar} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  useEffect(() => {
    // Initialize categories on app start
    apiRequest("POST", "/api/init").catch(() => {
      // Ignore errors for initialization
    });
  }, []);

  useEffect(() => {
    // Analytics visiteurs : une visite comptée une fois par session,
    // hors espace admin, avec un identifiant anonyme persistant.
    try {
      const path = window.location.pathname;
      if (path.startsWith("/admin")) return;
      if (sessionStorage.getItem("gisabo_visit_tracked")) return;

      let visitorId = localStorage.getItem("gisabo_visitor_id");
      if (!visitorId) {
        visitorId =
          (window.crypto?.randomUUID?.() as string) ||
          `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        localStorage.setItem("gisabo_visitor_id", visitorId);
      }

      fetch("/api/track/visit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visitorId,
          path,
          referrer: document.referrer || "",
        }),
      })
        .then(() => sessionStorage.setItem("gisabo_visit_tracked", "1"))
        .catch(() => {
          /* analytics best-effort */
        });
    } catch {
      /* Ignorer toute erreur d'analytics */
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Poppins:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
          rel="stylesheet"
        />
        <Toaster />
        <Router />
        <Chatbot />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
