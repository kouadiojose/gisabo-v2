import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, Send, X, Loader2 } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatbotProps {
  className?: string;
}

export default function Chatbot({ className }: ChatbotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { t, language } = useLanguage();

  // Messages de bienvenue selon la langue
  const welcomeMessage = {
    fr: "Bonjour ! Je suis Assistant Gisabo, votre assistant virtuel. Comment puis-je vous aider aujourd'hui avec vos transferts d'argent ou le marketplace ?",
    en: "Hello! I'm Assistant Gisabo, your virtual assistant. How can I help you today with your money transfers or marketplace?"
  };

  // Initialiser avec le message de bienvenue
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        id: '1',
        role: 'assistant',
        content: welcomeMessage[language],
        timestamp: new Date()
      }]);
    }
  }, [language]);

  // Charger les suggestions
  useEffect(() => {
    const loadSuggestions = async () => {
      try {
        const response = await fetch("/api/chat/suggestions");
        if (response.ok) {
          const data = await response.json();
          setSuggestions(Array.isArray(data.suggestions) ? data.suggestions : []);
        }
      } catch (error) {
        console.error("Erreur lors du chargement des suggestions:", error);
      }
    };
    loadSuggestions();
  }, []);

  // Auto-scroll vers le bas
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (messageText?: string) => {
    const text = messageText || inputMessage.trim();
    if (!text || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: text,
          conversationHistory: messages.map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        }),
      });

      if (!response.ok) {
        throw new Error("Erreur lors de l'envoi du message");
      }

      const data = await response.json();
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Erreur:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: language === 'fr' 
          ? "Désolé, une erreur s'est produite. Veuillez réessayer."
          : "Sorry, an error occurred. Please try again.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([{
      id: '1',
      role: 'assistant',
      content: welcomeMessage[language],
      timestamp: new Date()
    }]);
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg",
          "bg-blue-600 hover:bg-blue-700 text-white",
          "transition-all duration-200 hover:scale-110",
          className
        )}
        size="icon"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <Card className={cn(
      "fixed bottom-4 right-4 w-96 h-[500px] shadow-xl",
      "flex flex-col z-50 max-w-[calc(100vw-2rem)]",
      "sm:bottom-6 sm:right-6 sm:w-96",
      "max-sm:w-[calc(100vw-2rem)] max-sm:h-[70vh]",
      className
    )}>
      <CardHeader className="flex flex-row items-center justify-between p-4 pb-2">
        <CardTitle className="text-lg font-semibold text-blue-600">
          {t('chatbot.title')}
        </CardTitle>
        <div className="flex gap-2">
          <Button 
            onClick={clearChat}
            variant="ghost" 
            size="sm"
            className="text-xs px-2"
          >
            {t('chatbot.clear')}
          </Button>
          <Button
            onClick={() => setIsOpen(false)}
            variant="ghost"
            size="icon"
            className="h-6 w-6"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-4 pt-0 overflow-hidden">
        <ScrollArea className="flex-1 pr-2">
          <div className="space-y-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex flex-col gap-2 rounded-lg px-3 py-2 text-sm break-words",
                  message.role === 'user'
                    ? "ml-auto max-w-[85%] bg-blue-600 text-white"
                    : "mr-auto max-w-[95%] bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                )}
              >
                <div className="whitespace-pre-wrap leading-relaxed">
                  {message.content}
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="mr-auto max-w-[75%] flex flex-col gap-2 rounded-lg px-3 py-2 text-sm bg-gray-100 dark:bg-gray-800">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-gray-600 dark:text-gray-300">{t('chatbot.typing')}</span>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Suggestions */}
        {messages.length <= 1 && suggestions.length > 0 && (
          <div className="mb-3 border-t pt-3">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 font-medium">
              {t('chatbot.suggestions')}
            </p>
            <div className="space-y-1 max-h-24 overflow-y-auto">
              {suggestions.slice(0, 3).map((suggestion, index) => (
                <Button
                  key={index}
                  onClick={() => sendMessage(suggestion)}
                  variant="outline"
                  size="sm"
                  className="text-xs h-auto py-2 px-3 w-full text-left justify-start border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                  disabled={isLoading}
                >
                  <span className="truncate">{suggestion}</span>
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="flex gap-2">
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={t('chatbot.placeholder')}
            disabled={isLoading}
            className="text-sm"
          />
          <Button
            onClick={() => sendMessage()}
            disabled={!inputMessage.trim() || isLoading}
            size="icon"
            className="shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}