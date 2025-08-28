import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Menu, ChevronDown, User, BarChart3, LogOut } from "lucide-react";
import { isAuthenticated, removeAuthToken } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { getAuthHeaders } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import LanguageSwitcher from "@/components/language-switcher";

export default function Navbar() {
  const [location, navigate] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const authenticated = isAuthenticated();
  const { t } = useLanguage();

  const { data: user } = useQuery({
    queryKey: ["/api/auth/me"],
    enabled: authenticated,
    queryFn: async () => {
      const headers = getAuthHeaders();
      if (!headers.Authorization) return null;

      const response = await fetch("/api/auth/me", {
        headers: headers as Record<string, string>,
      });
      if (!response.ok) return null;
      const data = await response.json();
      return data.user;
    },
  });

  const handleLogout = () => {
    removeAuthToken();
    navigate("/");
    window.location.reload();
  };

  const NavLinks = ({ mobile = false }) => (
    <div
      className={`${mobile ? "flex flex-col space-y-4" : "hidden md:flex items-center space-x-8"}`}
    >
      <Link
        href="/"
        className="text-gray-700 hover:text-primary font-medium transition-colors"
      >
        {t("nav.home")}
      </Link>
      <Link
        href="/marketplace"
        className="text-gray-700 hover:text-primary font-medium transition-colors"
      >
        {t("nav.marketplace")}
      </Link>
      <Link
        href="/services"
        className="text-gray-700 hover:text-primary font-medium transition-colors"
      >
        {t("nav.services")}
      </Link>
      <Link
        href="/gisabo"
        className="text-gray-700 hover:text-primary font-medium transition-colors"
      >
        Gisabo
      </Link>
      <Link
        href="/fonctionnement"
        className="text-gray-700 hover:text-primary font-medium transition-colors"
      >
        {t("nav.howItWorks")}
      </Link>
      <Link
        href="/contact"
        className="text-gray-700 hover:text-primary font-medium transition-colors"
      >
        {t("nav.contact")}
      </Link>
    </div>
  );

  return (
    <nav className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <img
              width="150"
              src="./attached_assets/gisabo_logo.png"
              alt="Gisabo Group"
              className="h-10 w-auto"
            />
            <div></div>
          </Link>

          {/* Desktop Navigation */}
          <NavLinks />

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            <LanguageSwitcher />
            {authenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex items-center space-x-2 text-gray-700 hover:text-primary font-medium px-3 py-2"
                  >
                    <span>
                      {t("nav.welcome")}, {user?.firstName}
                    </span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem asChild>
                    <Link
                      href="/dashboard"
                      className="flex items-center space-x-2 w-full cursor-pointer"
                    >
                      <BarChart3 className="h-4 w-4" />
                      <span>{t("nav.dashboard")}</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link
                      href="/profile"
                      className="flex items-center space-x-2 w-full cursor-pointer"
                    >
                      <User className="h-4 w-4" />
                      <span>{t("nav.profile")}</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Button
                      onClick={handleLogout}
                      variant="ghost"
                      className="text-red-600 hover:text-red-700 font-medium transition-colors flex items-center space-x-2"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>{t("nav.logout")}</span>
                    </Button>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Link href="/login">
                  <Button
                    variant="ghost"
                    className="text-primary hover:text-primary-600 font-medium"
                  >
                    {t("nav.login")}
                  </Button>
                </Link>
                <Link href="/register">
                  <Button className="bg-primary hover:bg-primary-600 text-white font-medium">
                    {t("nav.register")}
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80">
                <div className="flex flex-col space-y-6 mt-6">
                  <NavLinks mobile />

                  {/* Language Switcher for Mobile */}
                  <div className="flex justify-center">
                    <LanguageSwitcher />
                  </div>

                  <div className="border-t pt-6 space-y-4">
                    {authenticated ? (
                      <div className="space-y-4">
                        <p className="text-gray-700 font-medium">
                          {t("nav.welcome")}, {user?.firstName}
                        </p>
                        <div className="space-y-2">
                          <Link href="/dashboard" className="block">
                            <Button
                              variant="outline"
                              className="w-full text-left justify-start text-gray-700 border-gray-300 hover:bg-gray-50"
                              onClick={() => setIsOpen(false)}
                            >
                              <BarChart3 className="h-4 w-4 mr-2" />
                              {t("nav.dashboard")}
                            </Button>
                          </Link>
                          <Link href="/profile" className="block">
                            <Button
                              variant="outline"
                              className="w-full text-left justify-start text-gray-700 border-gray-300 hover:bg-gray-50"
                              onClick={() => setIsOpen(false)}
                            >
                              <User className="h-4 w-4 mr-2" />
                              {t("nav.profile")}
                            </Button>
                          </Link>
                          <Button
                            variant="outline"
                            onClick={() => {
                              handleLogout();
                              setIsOpen(false);
                            }}
                            className="w-full text-left justify-start text-red-600 border-red-300 hover:bg-red-50"
                          >
                            <LogOut className="h-4 w-4 mr-2" />
                            {t("nav.logout")}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <Link href="/login" className="block">
                          <Button
                            variant="outline"
                            className="w-full text-primary border-primary hover:bg-primary hover:text-white"
                            onClick={() => setIsOpen(false)}
                          >
                            {t("nav.login")}
                          </Button>
                        </Link>
                        <Link href="/register" className="block">
                          <Button
                            className="w-full bg-primary hover:bg-primary-600 text-white"
                            onClick={() => setIsOpen(false)}
                          >
                            {t("nav.register")}
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
}
