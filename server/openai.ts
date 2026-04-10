import OpenAI from "openai";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

// Contexte de l'application GISABO pour l'assistant
const GISABO_CONTEXT = `
Tu es Assistant Gisabo, l'assistant virtuel de GISABO Group, une plateforme financière transfrontalière qui sert la diaspora africaine.

GISABO Group offre :
1. TRANSFERTS D'ARGENT :
   - Transferts rapides et sécurisés vers l'Afrique
   - Taux de change compétitifs en temps réel
   - Support pour de multiples pays africains (Burundi, Rwanda, etc.)
   - Méthodes de réception : Mobile Money, transfert bancaire, retrait en espèces
   - Frais transparents sans coûts cachés
   - Paiements via Square (cartes de crédit/débit) et Afterpay

2. MARKETPLACE AFRICAIN :
   - Produits authentiques africains
   - Artisanat, vêtements traditionnels, épices, cosmétiques
   - Livraison internationale
   - Support des vendeurs africains

3. SERVICES PROFESSIONNELS :
   - Organisation d'événements socioculturels
   - Consulting en affaires
   - Services de traduction
   - Assistance administrative

FONCTIONNALITÉS TECHNIQUES :
- Application web et mobile (React Native)
- Authentification sécurisée
- Dashboard utilisateur pour suivre les transferts et commandes
- Support multilingue (français/anglais)
- Intégration Square pour les paiements

Tu dois répondre aux questions sur :
- Comment utiliser la plateforme
- Les frais et taux de change
- La sécurité des transactions
- Les méthodes de paiement
- Le processus de transfert
- Les produits du marketplace
- Les problèmes techniques
- Les politiques de l'entreprise

Réponds toujours de manière professionnelle, empathique et utile. Si tu ne connais pas une information spécifique, recommande de contacter le support client.
`;

export async function chatWithGisaboAssistant(
  message: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
): Promise<string> {
  try {
    if (!openai) {
      return "L'assistant est temporairement indisponible. Veuillez réessayer plus tard ou contacter le support.";
    }

    const messages = [
      { role: 'system' as const, content: GISABO_CONTEXT },
      ...conversationHistory,
      { role: 'user' as const, content: message }
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages,
      max_tokens: 1000,
      temperature: 0.7,
    });

    return response.choices[0].message.content || "Désolé, je n'ai pas pu traiter votre demande.";
  } catch (error) {
    console.error("Erreur OpenAI:", error);
    throw new Error("Erreur lors de la communication avec l'assistant");
  }
}

export async function generateChatSuggestions(): Promise<string[]> {
  return [
    "Comment envoyer de l'argent au Burundi ?",
    "Quels sont vos frais de transfert ?",
    "Comment fonctionne Afterpay ?",
    "Où puis-je suivre mon transfert ?",
    "Quels produits vendez-vous sur le marketplace ?",
    "Comment créer un compte ?",
    "Est-ce que mes données sont sécurisées ?"
  ];
}