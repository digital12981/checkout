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
        // Scroll when typing starts
        scrollToBottom();
        
        setTimeout(() => {
          setIsTyping(false);
          setMessages(prev => {
            // Prevent duplicate messages by checking if this message already exists
            const messageExists = prev.some(msg => msg.content === currentMessage.content);
            if (messageExists) return prev;
            return [...prev, currentMessage];
          });
          setCurrentMessageIndex(prev => prev + 1);
          
          // Scroll after message appears
          scrollToBottom();
          
          // Show options after last message
          if (currentMessageIndex === chatMessages.length - 1) {
            setTimeout(() => {
              setShowResponseOptions(true);
              // Scroll for options
              scrollToBottom();
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
    // Scroll for user message
    scrollToBottom();
    
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
            // Scroll after payment options appear
            scrollToBottom();
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
            // Scroll after proceed button appears
            scrollToBottom();
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

  // Simple and reliable scroll - based on working HTML example
  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  };

  // Simple scroll trigger - matches working HTML pattern
  useEffect(() => {
    scrollToBottom();
  }, [messages, showResponseOptions, showPaymentOptions, showProceedButton, isTyping]);

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
      style={{ 
        fontFamily: 'Sora, sans-serif',
        backgroundColor: '#fff',
        color: '#333',
        lineHeight: '1.6',
        height: '100vh',
        maxHeight: '100vh',
        overflow: 'hidden',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%'
      }}
    >
      {/* Brand Header */}
      <div 
        style={{ 
          background: `linear-gradient(90deg, ${page.primaryColor || '#044785'} 0%, #666666 100%)`,
          color: 'white',
          padding: '12px 20px',
          position: 'relative',
          borderRadius: '0px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.08)'
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {page.showLogo && page.logoUrl && (
            <img 
              src={page.logoUrl} 
              alt="Logo" 
              style={{ height: '32px' }}
            />
          )}
        </div>
      </div>

      {/* Attendant Info */}
      <div 
        style={{ 
          background: `linear-gradient(90deg, ${page.primaryColor || '#044785'} 0%, #666666 100%)`,
          color: 'white',
          padding: '12px 20px',
          position: 'relative',
          borderRadius: '12px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
          margin: '0',
          borderTopLeftRadius: '0',
          borderTopRightRadius: '0'
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center' }}>
          <div style={{ position: 'relative', marginRight: '15px', flexShrink: 0 }}>
            <img 
              src={profilePhoto}
              style={{ 
                width: '46px', 
                height: '46px', 
                borderRadius: '50%', 
                objectFit: 'cover',
                border: `2px solid ${page.primaryColor || '#044785'}`,
                boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
              }}
              alt={attendantName}
            />
            <span 
              style={{ 
                position: 'absolute',
                bottom: '0',
                right: '0',
                width: '14px',
                height: '14px',
                borderRadius: '50%',
                backgroundColor: '#28a745',
                border: '2px solid white'
              }}
            />
          </div>
          <div style={{ flex: '1' }}>
            <h2 style={{ 
              margin: '0', 
              fontWeight: '600', 
              fontSize: '1.1rem' 
            }}>{attendantName}</h2>
            <p style={{ 
              margin: '0', 
              fontSize: '0.85rem', 
              opacity: '0.8' 
            }}>Coordenadora de RH</p>
          </div>
        </div>
      </div>

      {/* Chat Container */}
      <div 
        ref={chatContainerRef}
        style={{ 
          overflowY: 'auto',
          padding: '10px 20px',
          scrollBehavior: 'smooth',
          display: 'flex',
          flexDirection: 'column',
          height: window.innerWidth > 576 ? 'calc(100vh - 140px)' : '55vh',
          backgroundColor: '#fff'
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