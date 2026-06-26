import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigation = useNavigation<any>();

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    setIsLoading(true);
    const result = await login(username, password);
    setIsLoading(false);

    if (!result.ok) {
      Alert.alert('Erreur', result.error || 'Identifiants incorrects');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>GISABO</Text>
          <Text style={styles.tagline}>Votre pont vers l'Afrique</Text>
        </View>

        {/* Login Form */}
        <View style={styles.formContainer}>
          <Text style={styles.title}>Connexion</Text>
          
          <TextInput
            style={styles.input}
            placeholder="Email ou nom d'utilisateur"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
          />
          
          <TextInput
            style={styles.input}
            placeholder="Mot de passe"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
          />
          
          <TouchableOpacity
            style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            <Text style={styles.loginButtonText}>
              {isLoading ? 'Connexion...' : 'Se connecter'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.registerLink}
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={styles.registerLinkText}>
              Pas encore de compte ?{' '}
              <Text style={styles.registerLinkStrong}>Créer un compte</Text>
            </Text>
          </TouchableOpacity>
        </View>

        {/* Features */}
        <View style={styles.featuresContainer}>
          <View style={styles.feature}>
            <Text style={styles.featureIcon}>💸</Text>
            <Text style={styles.featureText}>Transferts rapides</Text>
          </View>
          <View style={styles.feature}>
            <Text style={styles.featureIcon}>🛡️</Text>
            <Text style={styles.featureText}>Sécurisé</Text>
          </View>
          <View style={styles.feature}>
            <Text style={styles.featureIcon}>🛒</Text>
            <Text style={styles.featureText}>Marketplace</Text>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 50,
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FF6B35',
    marginBottom: 5,
  },
  tagline: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  formContainer: {
    marginBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 30,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 15,
    backgroundColor: '#f9f9f9',
  },
  loginButton: {
    backgroundColor: '#FF6B35',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  registerLink: {
    alignItems: 'center',
    marginTop: 20,
  },
  registerLinkText: {
    color: '#666',
    fontSize: 15,
  },
  registerLinkStrong: {
    color: '#FF6B35',
    fontWeight: 'bold',
  },
  featuresContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
  },
  feature: {
    alignItems: 'center',
  },
  featureIcon: {
    fontSize: 24,
    marginBottom: 5,
  },
  featureText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
});