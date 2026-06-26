import * as SecureStore from 'expo-secure-store';

// URL de l'API. Par défaut l'API de production (Railway). Surchargeable au
// build/dev via la variable d'environnement EXPO_PUBLIC_API_URL (Expo inline
// automatiquement les variables préfixées EXPO_PUBLIC_).
const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_URL ?? 'https://gisabo-v2.up.railway.app'
).replace(/\/+$/, '');

class ApiService {
  private async getAuthToken(): Promise<string | null> {
    return await SecureStore.getItemAsync('authToken');
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const token = await this.getAuthToken();
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers as Record<string, string>,
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      // Le serveur renvoie tantôt du JSON { message }, tantôt du texte brut
      // (ex: 401 "Identifiants invalides"). On extrait un message lisible.
      let message = `Erreur ${response.status}`;
      try {
        const text = await response.text();
        if (text) {
          try {
            const json = JSON.parse(text);
            message = json.message || json.error || text;
          } catch {
            message = text;
          }
        }
      } catch {
        // corps illisible : on garde le message par défaut
      }
      throw new Error(message);
    }

    return response;
  }

  // Auth endpoints
  async login(username: string, password: string) {
    const response = await this.makeRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    return response.json();
  }

  async register(userData: {
    firstName: string;
    lastName: string;
    username: string;
    email: string;
    password: string;
    phone?: string;
  }) {
    const response = await this.makeRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    return response.json();
  }

  async getUser() {
    const response = await this.makeRequest('/api/auth/me');
    return response.json();
  }

  // Transfer endpoints
  async getTransfers() {
    const response = await this.makeRequest('/api/transfers');
    return response.json();
  }

  async createTransfer(transferData: any) {
    const response = await this.makeRequest('/api/transfers', {
      method: 'POST',
      body: JSON.stringify(transferData),
    });
    return response.json();
  }

  async getTransfer(id: number) {
    const response = await this.makeRequest(`/api/transfers/${id}`);
    return response.json();
  }

  // Orders endpoints
  async getOrders() {
    const response = await this.makeRequest('/api/orders');
    return response.json();
  }

  async createOrder(orderData: any) {
    const response = await this.makeRequest('/api/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
    return response.json();
  }

  async getOrderItems(orderId: number) {
    const response = await this.makeRequest(`/api/orders/${orderId}/items`);
    return response.json();
  }

  // Products endpoints
  async getProducts() {
    const response = await this.makeRequest('/api/products');
    return response.json();
  }

  async getProductsByCategory(categoryId: number) {
    const response = await this.makeRequest(`/api/products?categoryId=${categoryId}`);
    return response.json();
  }

  // Categories endpoints
  async getCategories() {
    const response = await this.makeRequest('/api/categories');
    return response.json();
  }

  // Services endpoints
  async getServices() {
    const response = await this.makeRequest('/api/services');
    return response.json();
  }

  // Exchange rates endpoints
  async getExchangeRates() {
    const response = await this.makeRequest('/api/exchange-rates?from=CAD&to=XOF');
    return response.json();
  }

  async getExchangeRate(fromCurrency: string, toCurrency: string) {
    const response = await this.makeRequest(`/api/exchange-rates?from=${fromCurrency}&to=${toCurrency}`);
    return response.json();
  }

  // Payment endpoints
  // Configuration Square pour le mobile (applicationId, locationId).
  async getSquareConfig() {
    const response = await this.makeRequest('/api/square-config');
    return response.json();
  }

  // Règle un transfert déjà créé avec le nonce de carte obtenu via le SDK natif.
  async payTransfer(
    transferId: number,
    paymentToken: string,
    paymentMethod: 'card' | 'afterpay' = 'card',
  ) {
    const response = await this.makeRequest(`/api/transfers/${transferId}/pay`, {
      method: 'POST',
      body: JSON.stringify({ paymentToken, paymentMethod }),
    });
    return response.json();
  }

  // Règle une commande déjà créée avec le nonce de carte.
  async payOrder(orderId: number, paymentToken: string) {
    const response = await this.makeRequest(`/api/orders/${orderId}/pay`, {
      method: 'POST',
      body: JSON.stringify({ paymentToken }),
    });
    return response.json();
  }
}

export const apiService = new ApiService();
export default apiService;