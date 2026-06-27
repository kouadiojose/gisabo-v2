import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

// Screens
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import TransferScreen from './src/screens/TransferScreen';
import MarketplaceScreen from './src/screens/MarketplaceScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import CartScreen from './src/screens/CartScreen';
import TransferDetailScreen from './src/screens/TransferDetailScreen';
import OrderDetailScreen from './src/screens/OrderDetailScreen';

// Contexts
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { CartProvider } from './src/contexts/CartContext';
import { I18nProvider, useI18n } from './src/lib/i18n';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function TabNavigator() {
  const { t } = useI18n();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Dashboard') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Transfer') {
            iconName = focused ? 'send' : 'send-outline';
          } else if (route.name === 'Marketplace') {
            iconName = focused ? 'storefront' : 'storefront-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          } else {
            iconName = 'home-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#1B5E9B',
        tabBarInactiveTintColor: 'gray',
        headerStyle: {
          backgroundColor: '#1B5E9B',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ tabBarLabel: t('nav.dashboard'), title: t('nav.dashboard') }}
      />
      <Tab.Screen
        name="Transfer"
        component={TransferScreen}
        options={{ tabBarLabel: t('nav.transfer'), title: t('nav.transfer') }}
      />
      <Tab.Screen
        name="Marketplace"
        component={MarketplaceScreen}
        options={{ tabBarLabel: t('nav.marketplace'), title: t('nav.marketplace') }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: t('nav.profile'), title: t('nav.profile') }}
      />
    </Tab.Navigator>
  );
}

function AppNavigator() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return null; // Loading screen could be added here
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <Stack.Screen name="Main" component={TabNavigator} />
            <Stack.Screen
              name="Cart"
              component={CartScreen}
              options={{
                headerShown: true,
                title: 'Panier',
                headerStyle: { backgroundColor: '#1B5E9B' },
                headerTintColor: '#fff',
              }}
            />
            <Stack.Screen
              name="TransferDetail"
              component={TransferDetailScreen}
              options={{
                headerShown: true,
                title: 'Détail du transfert',
                headerStyle: { backgroundColor: '#1B5E9B' },
                headerTintColor: '#fff',
              }}
            />
            <Stack.Screen
              name="OrderDetail"
              component={OrderDetailScreen}
              options={{
                headerShown: true,
                title: 'Détail de la commande',
                headerStyle: { backgroundColor: '#1B5E9B' },
                headerTintColor: '#fff',
              }}
            />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <AuthProvider>
        <CartProvider>
          <StatusBar style="auto" />
          <AppNavigator />
        </CartProvider>
      </AuthProvider>
    </I18nProvider>
  );
}