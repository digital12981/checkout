import { useState, useEffect, useRef } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { getQueryFn } from '@/lib/queryClient';

interface ChatMessage {
  type: 'attendant' | 'user';
  content: string;
  delay: number;
}

export default function Chat() {
  const [, params] = useRoute('/chat/:id');
  const [, setLocation] = useLocation();
  const id = params?.id;

  console.log('Chat component loaded with ID:', id);

  const { data: page, isLoading } = useQuery({
    queryKey: ['/api/payment-pages', id],
    queryFn: getQueryFn({ on401: 'returnNull' }),
    enabled: !!id,
  });

  console.log('Page data in chat:', page);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [showResponseOptions, setShowResponseOptions] = useState(false);
  const [showPaymentOptions, setShowPaymentOptions] = useState(false);
  const [showProceedButton, setShowProceedButton] = useState(false);
  const [userResponded, setUserResponded] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const attendantName = "Ana Clara";
  const profilePhoto = "https://i.ibb.co/G9YY8Q8/Imagem-do-Whats-App-de-2024-11-19-s-21-35-08-1b3f9f74.jpg";

  const chatMessages: ChatMessage[] = [
    { type: 'attendant', content: `Olá! Eu sou a ${attendantName}, coordenadora de RH. Estou aqui para te ajudar com o processo de inscrição para o concurso do INSS.`, delay: 1000 },
    { type: 'attendant', content: 'Para dar continuidade ao seu processo, é necessário realizar o pagamento da taxa de inscrição no valor de R$ 85,00.', delay: 3000 },
    { type: 'attendant', content: 'Gostaria de prosseguir com o pagamento agora?', delay: 2000 }
  ];

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, showResponseOptions, showPaymentOptions, showProceedButton, isTyping]);

  useEffect(() => {
    if (currentMessageIndex < chatMessages.length && !userResponded) {
      const currentMessage = chatMessages[currentMessageIndex];
      const timer = setTimeout(() => {
        setIsTyping(true);
        scrollToBottom();
        
        setTimeout(() => {
          setIsTyping(false);
          setMessages(prev => {
            return [...prev, currentMessage];
          });
          setCurrentMessageIndex(prev => prev + 1);
          
          scrollToBottom();
          
          if (currentMessageIndex === chatMessages.length - 1) {
            setTimeout(() => {
              setShowResponseOptions(true);
              scrollToBottom();
            }, 1000);
          }
        }, 2000);
      }, currentMessageIndex === 0 ? 1000 : currentMessage.delay);

      return () => clearTimeout(timer);
    }
  }, [currentMessageIndex, userResponded, chatMessages]);

  const handleUserResponse = (option: string) => {
    setUserResponded(true);
    setShowResponseOptions(false);
    setShowPaymentOptions(false);
    setShowProceedButton(false);

    const userMessage: ChatMessage = {
      type: 'user',
      content: option === 'sim' ? 'Sim, quero fazer o pagamento da taxa' : 'Não, quero saber mais informações',
      delay: 0
    };
    
    setMessages(prev => [...prev, userMessage]);
    scrollToBottom();
    
    if (option === 'sim') {
      setTimeout(() => {
        const attendantReply: ChatMessage = {
          type: 'attendant',
          content: 'Perfeito! Para o pagamento da taxa, temos duas opções disponíveis:',
          delay: 0
        };
        setMessages(prev => [...prev, attendantReply]);
        scrollToBottom();
        
        setTimeout(() => {
          setShowPaymentOptions(true);
          scrollToBottom();
        }, 1000);
      }, 2000);
    } else if (option === 'pagar') {
      setTimeout(() => {
        const attendantReply: ChatMessage = {
          type: 'attendant',
          content: 'Excelente escolha! O PIX é instantâneo e muito seguro. Vou direcioná-lo para a página de pagamento.',
          delay: 0
        };
        setMessages(prev => [...prev, attendantReply]);
        scrollToBottom();
        
        setTimeout(() => {
          setShowProceedButton(true);
          scrollToBottom();
        }, 1000);
      }, 2000);
    } else {
      setTimeout(() => {
        const attendantReply: ChatMessage = {
          type: 'attendant',
          content: 'Entendo suas dúvidas. A taxa de inscrição é obrigatória conforme o edital do concurso. Ela garante sua participação e cobre os custos administrativos do processo seletivo.',
          delay: 0
        };
        setMessages(prev => [...prev, attendantReply]);
        scrollToBottom();
      }, 1000);
    }
  };

  const handleProceedToPayment = () => {
    setLocation(`/checkout/${id}?fromChat=true`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!page) {
    return <div>Página não encontrada</div>;
  }

  // If chat is disabled, redirect to checkout
  if (!page.chatEnabled) {
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
        {/* Messages */}
        {messages.map((message, index) => (
          <div 
            key={index} 
            style={{
              marginBottom: '16px',
              maxWidth: '75%',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              alignSelf: message.type === 'attendant' ? 'flex-start' : 'flex-end',
              marginLeft: message.type === 'attendant' ? '-10px' : 'auto',
              marginRight: message.type === 'attendant' ? 'auto' : '-10px',
              paddingLeft: message.type === 'attendant' ? '0px' : '0px',
              paddingRight: message.type === 'attendant' ? '0px' : '0px',
              alignItems: message.type === 'attendant' ? 'flex-start' : 'flex-end'
            }}
          >
            <div 
              style={{
                padding: '14px 18px',
                borderRadius: '18px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                marginTop: '4px',
                position: 'relative',
                lineHeight: '1.5',
                backgroundColor: message.type === 'attendant' ? '#044785' : '#d4d4d4',
                borderTopLeftRadius: message.type === 'attendant' ? '2px' : '18px',
                borderTopRightRadius: message.type === 'attendant' ? '18px' : '2px',
                textAlign: message.type === 'attendant' ? 'left' : 'right',
                color: message.type === 'attendant' ? 'white' : '#333',
                minWidth: message.type === 'attendant' ? '200px' : 'auto',
                borderRight: message.type === 'attendant' ? 'none' : '2px solid #999'
              }}
            >
              {message.type === 'attendant' && (
                <div style={{ fontWeight: '600', fontSize: '0.85rem', marginBottom: '2px', color: 'white' }}>
                  {attendantName}
                </div>
              )}
              <div style={{ fontSize: '1rem', margin: '0' }}>
                {message.content}
              </div>
            </div>
          </div>
        ))}

        {/* Typing Indicator */}
        {isTyping && (
          <div 
            style={{
              padding: '10px 12px',
              backgroundColor: '#f1f1f1',
              borderRadius: '18px',
              marginBottom: '16px',
              display: 'inline-block',
              alignSelf: 'flex-start',
              color: '#666',
              maxWidth: '75px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', columnGap: '5px', height: '15px' }}>
              <span style={{ 
                display: 'block', width: '7px', height: '7px', opacity: '0.8', borderRadius: '50%', 
                backgroundColor: '#666', animation: 'loadingFade 1s infinite'
              }}></span>
              <span style={{ 
                display: 'block', width: '7px', height: '7px', opacity: '0.8', borderRadius: '50%', 
                backgroundColor: '#666', animation: 'loadingFade 1s infinite', animationDelay: '0.2s'
              }}></span>
              <span style={{ 
                display: 'block', width: '7px', height: '7px', opacity: '0.8', borderRadius: '50%', 
                backgroundColor: '#666', animation: 'loadingFade 1s infinite', animationDelay: '0.4s'
              }}></span>
            </div>
          </div>
        )}

        {/* Response Options */}
        {showResponseOptions && (
          <div style={{ 
            marginTop: '10px', marginBottom: '20px', display: 'flex', flexDirection: 'column', 
            gap: '12px', paddingLeft: '0px', marginLeft: '-10px', maxWidth: '75%'
          }}>
            <button
              onClick={() => handleUserResponse('sim')}
              style={{
                background: 'linear-gradient(145deg, #e6e6e6, #f8f8f8)',
                border: '1px solid #d0d0d0',
                borderRadius: '12px',
                padding: '16px 20px',
                textAlign: 'left',
                transition: 'all 0.2s ease',
                cursor: 'pointer',
                fontWeight: '500',
                boxShadow: '0 4px 8px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.5), inset 0 -1px 0 rgba(0,0,0,0.1)',
                fontSize: '1.05rem',
                marginBottom: '12px',
                color: '#333'
              }}
            >
              ✅ Sim, quero fazer o pagamento da taxa
            </button>
            <button
              onClick={() => handleUserResponse('nao')}
              style={{
                background: 'linear-gradient(145deg, #e6e6e6, #f8f8f8)',
                border: '1px solid #d0d0d0',
                borderRadius: '12px',
                padding: '16px 20px',
                textAlign: 'left',
                transition: 'all 0.2s ease',
                cursor: 'pointer',
                fontWeight: '500',
                boxShadow: '0 4px 8px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.5), inset 0 -1px 0 rgba(0,0,0,0.1)',
                fontSize: '1.05rem',
                marginBottom: '12px',
                color: '#333'
              }}
            >
              ❌ Não, quero saber mais informações
            </button>
          </div>
        )}

        {/* Payment Options */}
        {showPaymentOptions && (
          <div style={{ 
            marginTop: '10px', marginBottom: '20px', display: 'flex', flexDirection: 'column', 
            gap: '12px', paddingLeft: '0px', marginLeft: '-10px', maxWidth: '75%'
          }}>
            <button
              onClick={() => handleUserResponse('cartao')}
              style={{
                background: 'linear-gradient(145deg, #e6e6e6, #f8f8f8)',
                border: '1px solid #d0d0d0',
                borderRadius: '12px',
                padding: '16px 20px',
                textAlign: 'left',
                transition: 'all 0.2s ease',
                cursor: 'pointer',
                fontWeight: '500',
                boxShadow: '0 4px 8px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.5), inset 0 -1px 0 rgba(0,0,0,0.1)',
                fontSize: '1.05rem',
                marginBottom: '12px',
                color: '#333'
              }}
            >
              💳 Cartão de Crédito/Débito
            </button>
            <button
              onClick={() => handleUserResponse('pix')}
              style={{
                background: 'linear-gradient(145deg, #e6e6e6, #f8f8f8)',
                border: '1px solid #d0d0d0',
                borderRadius: '12px',
                padding: '16px 20px',
                textAlign: 'left',
                transition: 'all 0.2s ease',
                cursor: 'pointer',
                fontWeight: '500',
                boxShadow: '0 4px 8px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.5), inset 0 -1px 0 rgba(0,0,0,0.1)',
                fontSize: '1.05rem',
                marginBottom: '12px',
                color: '#333'
              }}
            >
              🔄 PIX (Instantâneo)
            </button>
          </div>
        )}

        {/* Proceed Button */}
        {showProceedButton && (
          <div style={{ marginBottom: '4px' }}>
            <button
              onClick={handleProceedToPayment}
              style={{
                display: 'block',
                background: `linear-gradient(90deg, ${page.primaryColor || '#044785'} 0%, #FFD700 100%)`,
                color: '#044785',
                border: 'none',
                borderRadius: '30px',
                padding: '14px 24px',
                fontWeight: '600',
                letterSpacing: '0.5px',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 15px rgba(255, 204, 0, 0.3)',
                textTransform: 'uppercase',
                textDecoration: 'none',
                textAlign: 'center',
                marginTop: '10px',
                cursor: 'pointer',
                width: '100%'
              }}
            >
              🚀 Prosseguir com o Pagamento
            </button>
          </div>
        )}
      </div>
    </div>
  );
}