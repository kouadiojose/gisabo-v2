// Script de test pour vérifier la connexion API mobile -> backend
const https = require('https');

const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL || 'https://gisabo-v2.up.railway.app').replace(/\/+$/, '');

// Test de connexion à l'API
async function testApiConnection() {
  console.log('🧪 Test de connexion API mobile -> backend GISABO\n');
  
  const endpoints = [
    '/api/services',
    '/api/categories', 
    '/api/products',
    '/api/exchange-rates?from=CAD&to=BIF'
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`Testing ${endpoint}...`);
      const response = await fetch(API_BASE_URL + endpoint);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ ${endpoint}: ${response.status} - ${Array.isArray(data) ? data.length : 'OK'} items`);
      } else {
        console.log(`❌ ${endpoint}: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.log(`❌ ${endpoint}: Connection failed - ${error.message}`);
    }
  }

  // Test de login avec les credentials existants
  console.log('\n🔐 Test de connexion utilisateur...');
  try {
    const loginResponse = await fetch(API_BASE_URL + '/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'yedjande',
        password: 'test123' // Utilisez votre mot de passe réel
      })
    });

    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      console.log('✅ Login successful - Token:', loginData.token ? 'Present' : 'Missing');
      console.log('✅ User data:', loginData.user ? `${loginData.user.firstName} ${loginData.user.lastName}` : 'Missing');
      
      // Test API avec token
      if (loginData.token) {
        const userResponse = await fetch(API_BASE_URL + '/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${loginData.token}`
          }
        });
        
        if (userResponse.ok) {
          console.log('✅ Authenticated API call successful');
        } else {
          console.log('❌ Authenticated API call failed');
        }
      }
    } else {
      console.log('❌ Login failed:', loginResponse.status, loginResponse.statusText);
    }
  } catch (error) {
    console.log('❌ Login test failed:', error.message);
  }

  console.log('\n📱 Configuration mobile prête !');
  console.log('URL API configurée:', API_BASE_URL);
}

testApiConnection();