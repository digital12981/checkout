import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { PaymentPage } from "@shared/schema";

// Add Font Awesome for icons
if (typeof document !== 'undefined' && !document.querySelector('link[href*="font-awesome"]')) {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css';
  document.head.appendChild(link);
}

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
  const [showResponseOptions, setShowResponseOptions] = useState(false);
  const [showPaymentOptions, setShowPaymentOptions] = useState(false);
  const [showProceedButton, setShowProceedButton] = useState(false);
  const [userResponded, setUserResponded] = useState(false);

  const { data: page, isLoading } = useQuery<PaymentPage>({
    queryKey: [`/api/payment-pages/${id}`],
    enabled: !!id,
  });

  const chatMessages = page?.chatMessages ? JSON.parse(page.chatMessages) : [];
  const attendantName = page?.chatAttendantName || "Atendente";
  const profilePhoto = page?.chatProfilePhoto || "https://i.ibb.co/BHcYZ8tf/assets-task-01jy21c21yewes4neft2x006sh-1750267829-img-1-11zon.webp";

  useEffect(() => {
    if (!page?.chatEnabled || chatMessages.length === 0) {
      setLocation(`/checkout/${id}`);
      return;
    }

    // Only proceed if we haven't finished all messages and user hasn't responded
    if (currentMessageIndex < chatMessages.length && !userResponded) {
      const currentMessage = chatMessages[currentMessageIndex];
      const timer = setTimeout(() => {
        setIsTyping(true);
        
        setTimeout(() => {
          setIsTyping(false);
          setMessages(prev => {
            // Prevent duplicate messages by checking if this message already exists
            const messageExists = prev.some(msg => msg.content === currentMessage.content);
            if (messageExists) return prev;
            return [...prev, currentMessage];
          });
          setCurrentMessageIndex(prev => prev + 1);
          
          // Show options after last message
          if (currentMessageIndex === chatMessages.length - 1) {
            setTimeout(() => {
              setShowResponseOptions(true);
            }, 1000);
          }
        }, 2000);
      }, currentMessageIndex === 0 ? 1000 : currentMessage.delay);

      return () => clearTimeout(timer);
    }
  }, [currentMessageIndex, chatMessages, page?.chatEnabled, id, setLocation, userResponded]);

  const handleOptionSelect = (option: string) => {
    setUserResponded(true);
    setShowResponseOptions(false);
    setShowPaymentOptions(false);
    
    // Add user response message
    const userMessage: ChatMessage = {
      type: 'user',
      content: option === 'sim' ? 'Sim, tenho interesse na vaga' : 
               option === 'nao' ? 'Não tenho interesse' :
               option === 'pagar' ? 'Vou realizar o pagamento' :
               'Desejo desistir da vaga',
      delay: 0
    };
    
    setMessages(prev => [...prev, userMessage]);
    
    // Handle different responses
    if (option === 'sim') {
      setTimeout(() => {
        setIsTyping(true);
        setTimeout(() => {
          setIsTyping(false);
          setMessages(prev => [...prev, {
            type: 'attendant',
            content: 'Perfeito! Para finalizar sua inscrição, você precisa realizar o pagamento da taxa de inscrição no valor de R$ 45,90.',
            delay: 0
          }]);
          
          setTimeout(() => {
            setShowPaymentOptions(true);
          }, 1000);
        }, 2000);
      }, 1000);
    } else if (option === 'pagar') {
      setTimeout(() => {
        setIsTyping(true);
        setTimeout(() => {
          setIsTyping(false);
          setMessages(prev => [...prev, {
            type: 'attendant',
            content: 'Excelente! Clique no botão abaixo para ser direcionado para a página de pagamento seguro.',
            delay: 0
          }]);
          
          setTimeout(() => {
            setShowProceedButton(true);
          }, 1000);
        }, 2000);
      }, 1000);
    } else {
      setTimeout(() => {
        setIsTyping(true);
        setTimeout(() => {
          setIsTyping(false);
          setMessages(prev => [...prev, {
            type: 'attendant',
            content: 'Entendo sua decisão. Obrigada pelo seu tempo. Caso mude de ideia, estaremos aqui.',
            delay: 0
          }]);
        }, 2000);
      }, 1000);
    }
  };

  const handleProceedToPayment = () => {
    setLocation(`/checkout/${id}`);
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
      <div 
        className="px-4 md:px-8 py-3"
        style={{ 
          backgroundColor: '#f3f4f6 !important',
          background: '#f3f4f6 !important',
          color: '#374151'
        }}
      >
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
              <h2 style={{ color: '#374151' }} className="text-lg font-semibold">{attendantName}</h2>
              <p style={{ color: '#6b7280' }} className="text-sm">Coordenadora de RH</p>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Container */}
      <main className="container mx-auto px-4 py-2">
        <div className="max-w-6xl mx-auto">
          <div className="overflow-hidden">
            <div 
              className="chat-container overflow-y-auto scroll-smooth p-4 flex flex-col"
              style={{ height: 'calc(100vh - 200px)', minHeight: '400px' }}
            >
              {messages.map((message, index) => (
                <div 
                  key={index} 
                  className={`message-bubble mb-4 ${message.type === 'attendant' ? 'incoming-message' : 'outgoing-message'}`}
                  style={{ 
                    alignSelf: message.type === 'attendant' ? 'flex-start' : 'flex-end',
                    maxWidth: '75%',
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    marginLeft: message.type === 'attendant' ? '-20px' : 'auto',
                    paddingLeft: message.type === 'attendant' ? '0px' : '0px'
                  }}
                >
                  <div 
                    className="message-content px-4 py-3 rounded-lg"
                    style={message.type === 'attendant' ? {
                      backgroundColor: page.primaryColor || '#044785',
                      color: 'white',
                      borderTopLeftRadius: '2px',
                      minWidth: '200px',
                      textAlign: 'left'
                    } : {
                      backgroundColor: '#d4d4d4',
                      color: '#333',
                      borderTopRightRadius: '2px',
                      borderRight: '2px solid #999',
                      textAlign: 'right'
                    }}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {message.content}
                    </p>
                  </div>
                </div>
              ))}

              {isTyping && (
                <div 
                  className="message-bubble incoming-message mb-4"
                  style={{ 
                    alignSelf: 'flex-start',
                    maxWidth: '70px',
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    marginLeft: '-20px',
                    paddingLeft: '0px'
                  }}
                >
                  <div 
                    className="message-content px-4 py-3 rounded-lg"
                    style={{
                      backgroundColor: page.primaryColor || '#044785',
                      borderTopLeftRadius: '2px',
                      minWidth: '70px'
                    }}
                  >
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                  </div>
                </div>
              )}

              {showResponseOptions && (
                <div 
                  className="chat-options max-w-[75%] flex flex-col gap-3 mt-4 mb-5"
                  style={{ marginLeft: '-20px', paddingLeft: '0px' }}
                >
                  <button 
                    className="option-button w-full text-left px-5 py-4 rounded-lg font-medium text-gray-800 transition-all duration-200 transform hover:-translate-y-0.5 hover:shadow-lg"
                    style={{
                      background: 'linear-gradient(145deg, #e6e6e6, #f8f8f8)',
                      border: '1px solid #d0d0d0',
                      boxShadow: '0 4px 8px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.5), inset 0 -1px 0 rgba(0,0,0,0.1)'
                    }}
                    onClick={() => handleOptionSelect('sim')}
                  >
                    <i className="fas fa-check-circle text-green-600 mr-3"></i>
                    Sim, tenho interesse na vaga
                  </button>
                  <button 
                    className="option-button w-full text-left px-5 py-4 rounded-lg font-medium text-gray-800 transition-all duration-200 transform hover:-translate-y-0.5 hover:shadow-lg"
                    style={{
                      background: 'linear-gradient(145deg, #e6e6e6, #f8f8f8)',
                      border: '1px solid #d0d0d0',
                      boxShadow: '0 4px 8px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.5), inset 0 -1px 0 rgba(0,0,0,0.1)'
                    }}
                    onClick={() => handleOptionSelect('nao')}
                  >
                    <i className="fas fa-times-circle text-red-600 mr-3"></i>
                    Não tenho interesse
                  </button>
                </div>
              )}

              {showPaymentOptions && (
                <div 
                  className="chat-options max-w-[75%] flex flex-col gap-3 mt-4 mb-5"
                  style={{ marginLeft: '-20px', paddingLeft: '0px' }}
                >
                  <button 
                    className="option-button w-full text-left px-5 py-4 rounded-lg font-medium text-gray-800 transition-all duration-200 transform hover:-translate-y-0.5 hover:shadow-lg"
                    style={{
                      background: 'linear-gradient(145deg, #e6e6e6, #f8f8f8)',
                      border: '1px solid #d0d0d0',
                      boxShadow: '0 4px 8px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.5), inset 0 -1px 0 rgba(0,0,0,0.1)'
                    }}
                    onClick={() => handleOptionSelect('pagar')}
                  >
                    <i className="fas fa-credit-card text-blue-600 mr-3"></i>
                    Vou realizar o pagamento
                  </button>
                  <button 
                    className="option-button w-full text-left px-5 py-4 rounded-lg font-medium text-gray-800 transition-all duration-200 transform hover:-translate-y-0.5 hover:shadow-lg"
                    style={{
                      background: 'linear-gradient(145deg, #e6e6e6, #f8f8f8)',
                      border: '1px solid #d0d0d0',
                      boxShadow: '0 4px 8px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.5), inset 0 -1px 0 rgba(0,0,0,0.1)'
                    }}
                    onClick={() => handleOptionSelect('desistir')}
                  >
                    <i className="fas fa-times-circle text-red-600 mr-3"></i>
                    Desejo desistir da vaga
                  </button>
                </div>
              )}

              {showProceedButton && (
                <div className="text-center pt-4">
                  <button
                    onClick={handleProceedToPayment}
                    className="bg-gradient-to-r from-blue-600 to-yellow-400 text-white px-8 py-3 rounded-full font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
                  >
                    <i className="fas fa-arrow-right mr-2"></i>
                    Prosseguir para Pagamento
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}