import { useState, useEffect, useRef } from "react";
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
  const [typingVisible, setTypingVisible] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
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
        // Force scroll when typing starts
        scrollToBottom(false);
        
        setTimeout(() => {
          setIsTyping(false);
          setMessages(prev => {
            // Prevent duplicate messages by checking if this message already exists
            const messageExists = prev.some(msg => msg.content === currentMessage.content);
            if (messageExists) return prev;
            return [...prev, currentMessage];
          });
          setCurrentMessageIndex(prev => prev + 1);
          
          // Force scroll after message appears
          scrollToBottom(false);
          setTimeout(() => scrollToBottom(false), 100);
          setTimeout(() => scrollToBottom(false), 300);
          
          // Show options after last message
          if (currentMessageIndex === chatMessages.length - 1) {
            setTimeout(() => {
              setShowResponseOptions(true);
              // Force scroll for options
              scrollToBottom(false);
              setTimeout(() => scrollToBottom(false), 200);
              setTimeout(() => scrollToBottom(false), 400);
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
    // Force scroll for user message
    scrollToBottom(false);
    setTimeout(() => scrollToBottom(false), 100);
    
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
          
          // Scroll after message
          setTimeout(() => scrollToBottom(true), 100);
          
          setTimeout(() => {
            setShowPaymentOptions(true);
            // Ensure scroll after payment options appear
            scrollToBottom(false);
            setTimeout(() => scrollToBottom(false), 100);
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
          
          // Scroll after message
          setTimeout(() => scrollToBottom(true), 100);
          
          setTimeout(() => {
            setShowProceedButton(true);
            // Ensure scroll after proceed button appears
            scrollToBottom(false);
            setTimeout(() => scrollToBottom(false), 100);
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
          
          // Scroll after message
          setTimeout(() => scrollToBottom(true), 100);
        }, 2000);
      }, 1000);
    }
  };

  const handleProceedToPayment = () => {
    setLocation(`/checkout/${id}`);
  };

  // Reliable mobile-first scroll function
  const scrollToBottom = (smooth = false) => {
    if (!chatContainerRef.current) return;
    
    const container = chatContainerRef.current;
    
    const doScroll = () => {
      // Simple, direct scroll to bottom - most reliable approach
      container.scrollTop = container.scrollHeight;
    };
    
    // Execute immediately and with multiple fallbacks
    doScroll();
    requestAnimationFrame(doScroll);
    
    // Additional scrolls to handle timing issues
    setTimeout(doScroll, 10);
    setTimeout(doScroll, 50);
    setTimeout(doScroll, 150);
    setTimeout(doScroll, 300);
  };

  // Aggressive auto-scroll system
  useEffect(() => {
    // Immediate scroll when content changes
    scrollToBottom(false);
    
    // Multiple follow-up scrolls to ensure content is visible
    const timeouts = [
      setTimeout(() => scrollToBottom(false), 10),
      setTimeout(() => scrollToBottom(false), 50),
      setTimeout(() => scrollToBottom(false), 100),
      setTimeout(() => scrollToBottom(false), 200),
      setTimeout(() => scrollToBottom(false), 400),
      setTimeout(() => scrollToBottom(false), 600),
      setTimeout(() => scrollToBottom(false), 1000)
    ];
    
    return () => timeouts.forEach(clearTimeout);
  }, [messages, showResponseOptions, showPaymentOptions, showProceedButton, isTyping]);

  // Additional scroll trigger for typing indicator
  useEffect(() => {
    if (isTyping) {
      scrollToBottom(false);
      setTimeout(() => scrollToBottom(false), 100);
    }
  }, [isTyping]);

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
    <div 
      className="w-full"
      style={{ 
        backgroundColor: '#FFFFFF',
        height: '100vh',
        maxHeight: '100vh',
        overflow: 'hidden',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0
      }}
    >
      {/* Brand Header */}
      <div 
        className="py-2 sm:py-3"
        style={{ backgroundColor: page.primaryColor || '#044785' }}
      >
        <div className="container mx-auto px-4 text-center">
          {page.showLogo && page.logoUrl && (
            <img 
              src={page.logoUrl} 
              alt="Logo" 
              className="h-8 sm:h-12 mx-auto object-contain" 
            />
          )}
        </div>
      </div>

      {/* Attendant Info */}
      <div 
        style={{ 
          backgroundColor: '#f3f4f6',
          background: '#f3f4f6',
          color: '#374151',
          padding: window.innerWidth > 768 ? '12px 16px' : '8px 12px',
          borderBottom: '1px solid #e5e7eb'
        }}
      >
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
            <div style={{ marginRight: window.innerWidth > 768 ? '16px' : '12px', position: 'relative' }}>
              <img 
                src={profilePhoto}
                style={{ 
                  width: window.innerWidth > 768 ? '48px' : '40px', 
                  height: window.innerWidth > 768 ? '48px' : '40px', 
                  borderRadius: '50%', 
                  objectFit: 'cover',
                  border: `2px solid ${page.primaryColor || '#044785'}`
                }}
                alt={attendantName}
              />
              <span 
                style={{ 
                  position: 'absolute',
                  bottom: '0',
                  right: '0',
                  width: window.innerWidth > 768 ? '12px' : '10px',
                  height: window.innerWidth > 768 ? '12px' : '10px',
                  borderRadius: '50%',
                  border: '2px solid white',
                  backgroundColor: '#28a745'
                }}
              ></span>
            </div>
            <div style={{ flex: '1' }}>
              <h2 style={{ 
                color: '#374151', 
                fontSize: window.innerWidth > 768 ? '18px' : '16px', 
                fontWeight: '600', 
                margin: '0' 
              }}>{attendantName}</h2>
              <p style={{ 
                color: '#6b7280', 
                fontSize: window.innerWidth > 768 ? '14px' : '12px', 
                margin: '0' 
              }}>Coordenadora de RH</p>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Container */}
      <main 
        className="w-full px-0 flex-1"
        style={{ 
          height: window.innerWidth > 768 ? 'calc(100vh - 150px)' : 'calc(100vh - 120px)',
          maxHeight: window.innerWidth > 768 ? 'calc(100vh - 150px)' : 'calc(100vh - 120px)',
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        <div className="w-full h-full">
          <div className="overflow-hidden h-full">
            <div 
              ref={chatContainerRef}
              className="chat-container overflow-y-auto px-2 sm:px-4 py-2 sm:py-4 flex flex-col"
              style={{ 
                height: window.innerWidth > 768 ? 'calc(100vh - 150px)' : 'calc(100vh - 120px)',
                maxHeight: window.innerWidth > 768 ? 'calc(100vh - 150px)' : 'calc(100vh - 120px)',
                backgroundColor: '#FFFFFF',
                width: '100%',
                overflowY: 'auto',
                overflowX: 'hidden',
                position: 'relative',
                WebkitOverflowScrolling: 'touch'
              }}
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
                    marginLeft: message.type === 'attendant' ? '7px' : 'auto',
                    paddingLeft: message.type === 'attendant' ? '0px' : '0px'
                  }}
                >
                  <div 
                    className="message-content"
                    style={message.type === 'attendant' ? {
                      backgroundColor: page.primaryColor || '#044785',
                      color: 'white',
                      borderRadius: '4px 18px 18px 18px',
                      minWidth: '160px',
                      maxWidth: window.innerWidth > 768 ? '320px' : '280px',
                      textAlign: 'left',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                      position: 'relative',
                      padding: window.innerWidth > 768 ? '12px 16px' : '10px 14px',
                      margin: '2px 0',
                      wordWrap: 'break-word'
                    } : {
                      backgroundColor: '#e5e7eb',
                      color: '#374151',
                      borderRadius: '18px 4px 18px 18px',
                      minWidth: '160px',
                      maxWidth: window.innerWidth > 768 ? '320px' : '280px',
                      textAlign: 'left',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                      position: 'relative',
                      padding: window.innerWidth > 768 ? '12px 16px' : '10px 14px',
                      margin: '2px 0',
                      wordWrap: 'break-word'
                    }}
                  >
                    <p style={{ 
                      fontSize: window.innerWidth > 768 ? '16px' : '15px', 
                      lineHeight: '1.5', 
                      margin: '0',
                      fontWeight: '400',
                      whiteSpace: 'pre-wrap'
                    }}>
                      {message.content}
                    </p>
                  </div>
                </div>
              ))}

              {(isTyping || typingVisible) && (
                <div 
                  className="message-bubble incoming-message mb-3 sm:mb-4"
                  style={{ 
                    alignSelf: 'flex-start',
                    maxWidth: '70px',
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    marginLeft: '7px',
                    paddingLeft: '0px'
                  }}
                >
                  <div 
                    className="message-content"
                    style={{
                      backgroundColor: page.primaryColor || '#044785',
                      borderRadius: '4px 18px 18px 18px',
                      minWidth: '60px',
                      maxWidth: '80px',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                      padding: '8px 12px',
                      margin: '2px 0'
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
                  className="chat-options flex flex-col gap-3 mt-4 mb-5 px-2 sm:px-0"
                  style={{ 
                    marginLeft: '7px', 
                    paddingLeft: '0px',
                    maxWidth: window.innerWidth > 768 ? '75%' : '90%'
                  }}
                >
                  <button 
                    className="option-button w-full text-left px-4 sm:px-5 py-3 sm:py-4 rounded-lg font-medium text-gray-800 transition-all duration-200 transform hover:-translate-y-0.5 hover:shadow-lg"
                    style={{
                      background: 'linear-gradient(145deg, #e6e6e6, #f8f8f8)',
                      border: '1px solid #d0d0d0',
                      boxShadow: '0 4px 8px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.5), inset 0 -1px 0 rgba(0,0,0,0.1)',
                      fontSize: window.innerWidth > 768 ? '15px' : '14px'
                    }}
                    onClick={() => handleOptionSelect('sim')}
                  >
                    <i className="fas fa-check-circle text-green-600 mr-3"></i>
                    Sim, tenho interesse na vaga
                  </button>
                  <button 
                    className="option-button w-full text-left px-4 sm:px-5 py-3 sm:py-4 rounded-lg font-medium text-gray-800 transition-all duration-200 transform hover:-translate-y-0.5 hover:shadow-lg"
                    style={{
                      background: 'linear-gradient(145deg, #e6e6e6, #f8f8f8)',
                      border: '1px solid #d0d0d0',
                      boxShadow: '0 4px 8px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.5), inset 0 -1px 0 rgba(0,0,0,0.1)',
                      fontSize: window.innerWidth > 768 ? '15px' : '14px'
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
                  className="chat-options flex flex-col gap-3 mt-4 mb-5 px-2 sm:px-0"
                  style={{ 
                    marginLeft: '7px', 
                    paddingLeft: '0px',
                    maxWidth: window.innerWidth > 768 ? '75%' : '90%'
                  }}
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