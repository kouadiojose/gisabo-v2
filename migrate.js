#!/usr/bin/env node

/**
 * Script de migration automatique pour Gisabo Database
 * Usage: npm run migrate
 */

import { Client } from 'pg';
import fs from 'fs';
import path from 'path';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL n\'est pas définie!');
  console.error('Assure-toi que les variables d\'environnement sont configurées.');
  process.exit(1);
}

const client = new Client({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const migrationSQL = `
-- ===============================================
-- MIGRATION GISABO DATABASE - PRODUCTION
-- ===============================================

SET statement_timeout = 0;
SET lock_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET row_security = off;

-- ===============================================
-- 1. CRÉATION DES TABLES (avec IF NOT EXISTS)
-- ===============================================

-- Suppression des tables existantes en respectant les dépendances
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS transfers CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS services CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS exchange_rates CASCADE;
DROP TABLE IF EXISTS admins CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Table users
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    role TEXT NOT NULL DEFAULT 'user'
);

-- Table admins  
CREATE TABLE IF NOT EXISTS admins (
    id SERIAL PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    last_login TIMESTAMP
);

-- Table categories
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    icon TEXT NOT NULL,
    color TEXT NOT NULL
);

-- Table products
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name_fr TEXT NOT NULL,
    name_en TEXT NOT NULL,
    description_fr TEXT NOT NULL,
    description_en TEXT NOT NULL,
    price DECIMAL NOT NULL,
    currency TEXT NOT NULL DEFAULT 'CAD',
    category_id INTEGER NOT NULL,
    image_url TEXT,
    in_stock BOOLEAN DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- Table services
CREATE TABLE IF NOT EXISTS services (
    id SERIAL PRIMARY KEY,
    name_fr TEXT NOT NULL,
    name_en TEXT NOT NULL,
    short_description_fr TEXT NOT NULL,
    short_description_en TEXT NOT NULL,
    full_description_fr TEXT NOT NULL,
    full_description_en TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    image_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Table orders
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    total DECIMAL NOT NULL,
    currency TEXT NOT NULL DEFAULT 'EUR',
    status TEXT NOT NULL DEFAULT 'pending',
    shipping_address JSONB NOT NULL,
    square_payment_id TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Table order_items
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    price DECIMAL NOT NULL,
    CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(id),
    CONSTRAINT fk_order_items_product FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Table transfers
CREATE TABLE IF NOT EXISTS transfers (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    amount DECIMAL NOT NULL,
    currency TEXT NOT NULL,
    recipient_name TEXT NOT NULL,
    recipient_phone TEXT NOT NULL,
    destination_country TEXT NOT NULL,
    destination_currency TEXT NOT NULL,
    exchange_rate DECIMAL NOT NULL,
    fees DECIMAL NOT NULL,
    received_amount DECIMAL NOT NULL,
    delivery_method TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    square_payment_id TEXT,
    bank_name TEXT,
    account_number TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_transfers_user FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Table exchange_rates
CREATE TABLE IF NOT EXISTS exchange_rates (
    id SERIAL PRIMARY KEY,
    from_currency TEXT NOT NULL,
    to_currency TEXT NOT NULL,
    rate DECIMAL NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
`;

const insertDataSQL = `
-- ===============================================
-- 2. INSERTION DES DONNÉES DE BASE
-- ===============================================

-- Vider les tables avant insertion (pour éviter les doublons)
TRUNCATE TABLE exchange_rates, services, order_items, orders, transfers, products, categories, admins, users RESTART IDENTITY CASCADE;

-- Insertion des utilisateurs
INSERT INTO users (id, username, email, password, first_name, last_name, phone, created_at, role) VALUES
(1, 'yedjande', 'yeoyedjande@gmail.com', '$2b$10$Kfanqsjlr2SoR2yk3pOhPujS8SUKJjIPajRhHpkEV4MDb8iyIMJHe', 'YEO', 'YEDJANDE', '+2250747550417', '2025-05-28 15:07:10.548881', 'user'),
(2, 'jose', 'kouadiojose@gmail.com', '$2b$10$5Vi86/EyLBJtu0Wzqm8km.8HKiwKBZYRnW/Ld/Bw/A0p00Uqp5M6O', 'José', 'Kouadio', NULL, '2025-06-02 03:05:38.193437', 'user'),
(3, 'testuser', 'test@gisabo.com', '$2b$10$bgzyY8EdbLFSJh/EsmF1UuKaTXWP6TOCmwhOal9I3ka9StMqk2SyC', 'Test', 'User', NULL, '2025-06-10 15:43:47.18827', 'user');

-- Insertion des administrateurs
INSERT INTO admins (id, username, email, password, first_name, last_name, role, is_active, created_at, last_login) VALUES
(1, 'admin', 'admin@gisabo.com', '$2b$10$3787AoU6pc3DVrB.SUyaveDNe4GpQtWm4b1rjo6XrRgoaYzAlA/Cy', 'Admin', 'Gisabo', 'admin', true, '2025-05-29 11:46:40.230345', '2025-06-02 15:38:07.112');

-- Insertion des catégories
INSERT INTO categories (id, name, slug, icon, color) VALUES
(1, 'Alimentation', 'food', 'fas fa-seedling', 'green'),
(2, 'Viande & Poisson', 'meat', 'fas fa-fish', 'red'),
(3, 'Épices & Condiments', 'spices', 'fas fa-pepper-hot', 'orange'),
(4, 'Éducation', 'education', 'fas fa-graduation-cap', 'blue'),
(5, 'Téléphonie', 'telecom', 'fas fa-mobile-alt', 'purple'),
(6, 'Transport', 'transport', 'fas fa-bus', 'yellow');

-- Insertion des produits
INSERT INTO products (id, name_fr, name_en, description_fr, description_en, price, currency, category_id, image_url, in_stock, created_at) VALUES
(1, 'Riz', 'Rice', 'Riz de qualité premium pour vos repas', 'High quality rice for your meals', 31.25, 'CAD', 1, '/uploads/products/rice.jpg', true, '2025-05-29 19:44:42.65343'),
(2, 'Haricot', 'Bean', 'Haricots secs de qualité supérieure', 'Premium quality dry beans', 31.25, 'CAD', 1, '/uploads/products/beans.jpg', true, '2025-05-29 20:02:21.093275'),
(3, 'Viande de boucherie', 'Butcher Meat', 'Viande fraîche de boucherie locale', 'Fresh quality meat from local butchers', 31.25, 'CAD', 2, '/uploads/products/meat.jpg', true, '2025-05-29 20:03:04.993207'),
(4, 'Légumes', 'Vegetables', 'Légumes frais variés du marché', 'Fresh mixed vegetables from the market', 12.50, 'CAD', 1, '/uploads/products/vegetables.jpg', true, '2025-06-02 14:27:33.590402'),
(5, 'Petit pois sec', 'Dry peas', 'Petit pois secs de qualité', 'Quality dry peas', 25.00, 'CAD', 1, '/uploads/products/dry-peas.jpg', true, '2025-06-02 14:34:40.909954');

-- Insertion des services
INSERT INTO services (id, name_fr, name_en, short_description_fr, short_description_en, full_description_fr, full_description_en, slug, image_url, is_active, created_at, updated_at) VALUES
(1, 'Paniers ménagers', 'Household Baskets', 'Service de paniers ménagers pour la diaspora africaine', 'Household basket service for African diaspora', 'La Coop. Arcade propose des paniers ménagers personnalisés contenant des produits essentiels pour les familles. Ce service permet d''envoyer des cadeaux en nature plutôt que de l''argent.', 'Coop. Arcade offers personalized household baskets containing essential products for families. This service allows sending gifts in kind rather than money.', 'paniers-menagers', '/uploads/services/baskets.jpg', true, '2025-05-29 13:00:55.461277', '2025-05-29 18:39:06.322'),
(2, 'Aide aux familles', 'Family Assistance', 'Assistance financière et logistique aux familles', 'Financial and logistical assistance to families', 'Grâce à nos partenariats avec les institutions de microfinance et les opérateurs télécoms, nous offrons des services de proximité aux familles dans le besoin.', 'Through our partnerships with microfinance institutions and telecom operators, we offer proximity services to families in need.', 'aide-aux-familles', '/uploads/services/family-aid.jpg', true, '2025-05-29 13:03:27.48239', '2025-05-29 18:41:35.002'),
(3, 'Étudiants internationaux', 'International Students', 'Accompagnement des étudiants internationaux', 'Support for international students', 'Services d''orientation, d''accueil et d''intégration pour les étudiants internationaux. Nous facilitons les démarches administratives et les paiements universitaires.', 'Orientation, reception and integration services for international students. We facilitate administrative procedures and university payments.', 'etudiants-internationaux', '/uploads/services/students.jpg', true, '2025-05-29 13:04:35.787903', '2025-05-29 18:43:47.719'),
(4, 'Tutorat AIDE AU SAVOIR', 'Tutoring HELP TO KNOWLEDGE', 'Programme de tutorat pour l''excellence académique', 'Tutoring program for academic excellence', 'Programme de tutorat personnalisé pour accompagner les étudiants dans leur parcours académique. Nous croyons que l''éducation est la clé du succès.', 'Personalized tutoring program to support students in their academic journey. We believe that education is the key to success.', 'tutorat-aide-au-savoir', '/uploads/services/tutoring.jpg', true, '2025-05-29 13:06:07.926842', '2025-05-29 18:44:08.326'),
(5, 'Organisation d''événements sociaux', 'Social Event Organization', 'Organisation complète d''événements communautaires', 'Complete organization of community events', 'Service complet d''organisation d''événements sociaux et culturels pour la communauté africaine. De la planification à la réalisation, nous vous accompagnons.', 'Complete social and cultural event organization service for the African community. From planning to execution, we support you.', 'organisation-evenements-sociaux', '/uploads/services/events.jpg', true, '2025-05-29 13:19:35.371333', '2025-06-02 12:48:22.062');

-- Insertion des taux de change
INSERT INTO exchange_rates (id, from_currency, to_currency, rate, created_at, updated_at) VALUES
(1, 'CAD', 'XOF', 400.00, '2025-05-29 11:48:35.123', '2025-05-29 11:48:35.123');
`;

const finalSQL = `
-- ===============================================
-- 3. RÉINITIALISATION DES SÉQUENCES
-- ===============================================

SELECT setval('users_id_seq', COALESCE((SELECT MAX(id) FROM users), 1));
SELECT setval('admins_id_seq', COALESCE((SELECT MAX(id) FROM admins), 1));  
SELECT setval('categories_id_seq', COALESCE((SELECT MAX(id) FROM categories), 1));
SELECT setval('products_id_seq', COALESCE((SELECT MAX(id) FROM products), 1));
SELECT setval('services_id_seq', COALESCE((SELECT MAX(id) FROM services), 1));
SELECT setval('exchange_rates_id_seq', COALESCE((SELECT MAX(id) FROM exchange_rates), 1));

-- ===============================================
-- 4. INDEX DE PERFORMANCE
-- ===============================================

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);  
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_transfers_user ON transfers(user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_admins_username ON admins(username);
`;

async function runMigration() {
  try {
    console.log('🚀 Démarrage de la migration Gisabo...');

    // Connexion à la base de données
    console.log('📡 Connexion à la base de données...');
    await client.connect();
    console.log('✅ Connexion établie!');

    // Vérifier si la migration a déjà été exécutée
    try {
      const check = await client.query('SELECT COUNT(*) FROM categories');
      if (parseInt(check.rows[0].count) > 0) {
        console.log('✅ Base de données déjà initialisée, migration ignorée.');
        return;
      }
    } catch (e) {
      // Table n'existe pas encore, on continue avec la migration
      console.log('📦 Base de données vide, lancement de la migration...');
    }

    // Exécution de la migration en étapes séparées
    console.log('🔧 Création des tables...');
    await client.query(migrationSQL);
    console.log('✅ Tables créées!');

    console.log('📝 Insertion des données...');
    await client.query(insertDataSQL);
    console.log('✅ Données insérées!');

    console.log('🔧 Finalisation (séquences et index)...');
    await client.query(finalSQL);
    console.log('✅ Migration finalisée!');

    // Vérification des données
    console.log('📊 Vérification des données...');
    const result = await client.query(`
      SELECT 'users' as table_name, COUNT(*) as count FROM users
      UNION ALL
      SELECT 'admins', COUNT(*) FROM admins
      UNION ALL  
      SELECT 'categories', COUNT(*) FROM categories
      UNION ALL
      SELECT 'products', COUNT(*) FROM products
      UNION ALL
      SELECT 'services', COUNT(*) FROM services
      UNION ALL
      SELECT 'exchange_rates', COUNT(*) FROM exchange_rates
      ORDER BY table_name;
    `);

    console.log('📈 Résumé des données:');
    result.rows.forEach(row => {
      console.log(`   ${row.table_name}: ${row.count} enregistrement(s)`);
    });

    console.log('');
    console.log('🎉 MIGRATION RÉUSSIE!');
    console.log('');
    console.log('🔐 Comptes de test disponibles:');
    console.log('   Admin: admin@gisabo.com');
    console.log('   User 1: yeoyedjande@gmail.com');
    console.log('   User 2: test@gisabo.com');
    console.log('');
    console.log('📦 Données disponibles:');
    console.log('   ✅ 6 catégories de produits');
    console.log('   ✅ 5 produits africains');
    console.log('   ✅ 5 services Gisabo');
    console.log('   ✅ 1 taux de change CAD→XOF');
    console.log('');
    console.log('🚀 Votre marketplace est prête!');

  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error.message);
    console.error('📝 Stack trace:', error.stack);
    
    if (error.message.includes('does not exist')) {
      console.error('💡 Suggestion: Vérifiez que DATABASE_URL est correcte');
    }
    
    if (error.message.includes('connect')) {
      console.error('💡 Suggestion: Vérifiez la connectivité réseau');
    }
    
    if (error.message.includes('permission denied')) {
      console.error('💡 Suggestion: L\'utilisateur de la DB manque de permissions');
    }
    
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Exécution du script
runMigration();