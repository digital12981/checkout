import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import type { PaymentPage } from "@shared/schema";

interface ChatMessage {
  type: 'attendant' | 'user';
  content: string;
  delay: number;
}

export default function Chat() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(false);

  const { data: page, isLoading } = useQuery<PaymentPage>({
    queryKey: [`/api/payment-pages/${id}`],
    enabled: !!id,
  });

  const chatMessages = page?.chatMessages ? JSON.parse(page.chatMessages) : [];
  const attendantName = page?.chatAttendantName || "Atendente";
  const profilePhoto = page?.chatProfilePhoto || "https://i.ibb.co/BHcYZ8tf/assets-task-01jy21c21yewes4neft2x006sh-1750267829-img-1-11zon.webp";

  useEffect(() => {
    if (!page?.chatEnabled || chatMessages.length === 0) {
      // If chat is disabled or no messages, redirect to checkout
      setLocation(`/checkout/${id}`);
      return;
    }

    // Start the chat sequence
    if (currentMessageIndex < chatMessages.length) {
      const currentMessage = chatMessages[currentMessageIndex];
      const timer = setTimeout(() => {
        setIsTyping(true);
        
        // Show typing indicator for a short time, then show message
        setTimeout(() => {
          setIsTyping(false);
          setMessages(prev => [...prev, currentMessage]);
          setCurrentMessageIndex(prev => prev + 1);
        }, 2000); // Fixed 2 second typing time
      }, currentMessageIndex === 0 ? 1000 : currentMessage.delay);

      return () => clearTimeout(timer);
    }
  }, [currentMessageIndex, chatMessages, page?.chatEnabled, id, setLocation]);

  const handleProceedToPayment = () => {
    console.log("Navigating to checkout from chat...");
    setLocation(`/checkout/${id}?fromChat=true`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  if (!page || !page.chatEnabled) {
    setLocation(`/checkout/${id}`);
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Brand Header */}
      <div 
        className="py-3"
        style={{ backgroundColor: page.primaryColor || '#044785' }}
      >
        <div className="container mx-auto px-4 text-center">
          {page.showLogo && page.logoUrl && (
            <img 
              src={page.logoUrl} 
              alt="Logo" 
              className="h-8 mx-auto object-contain" 
            />
          )}
        </div>
      </div>

      {/* Attendant Info */}
      <div className="bg-gray-100 text-gray-800 px-4 md:px-8 py-3">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center w-full">
            <div className="mr-4 relative">
              <img 
                src={profilePhoto}
                className="w-12 h-12 rounded-full object-cover border-2"
                style={{ borderColor: page.primaryColor || '#044785' }}
                alt={attendantName}
              />
              <span 
                className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white"
                style={{ backgroundColor: '#28a745' }}
              ></span>
            </div>
            <div className="flex-1">
              <h2 className="text-gray-800 text-lg font-semibold">{attendantName}</h2>
              <p className="text-gray-600 text-sm">Coordenadora de RH</p>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Container */}
      <main className="container mx-auto px-4 py-2">
        <div className="max-w-6xl mx-auto">
          <div className="overflow-hidden">
            <div 
              className="p-4 space-y-4 overflow-y-auto"
              style={{ height: 'calc(100vh - 200px)', minHeight: '400px' }}
            >
              {messages.map((message, index) => (
                <div key={index} className="flex justify-start">
                  <div 
                    className="max-w-xs lg:max-w-md px-4 py-3 rounded-lg text-white"
                    style={{ backgroundColor: page.primaryColor || '#044785' }}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {message.content}
                    </p>
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex justify-start">
                  <div 
                    className="px-4 py-3 rounded-lg"
                    style={{ backgroundColor: '#f1f1f1' }}
                  >
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                  </div>
                </div>
              )}

              {currentMessageIndex >= chatMessages.length && !isTyping && (
                <div className="text-center mt-8">
                  <Button 
                    onClick={handleProceedToPayment}
                    className="text-white font-semibold py-3 px-8 rounded-full text-lg"
                    style={{ 
                      background: `linear-gradient(90deg, ${page.primaryColor || '#044785'} 0%, ${page.accentColor || '#FFD700'} 100%)`,
                      boxShadow: '0 4px 15px rgba(255, 204, 0, 0.3)'
                    }}
                  >
                    <Check className="w-5 h-5 mr-2" />
                    Prosseguir para Pagamento
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}