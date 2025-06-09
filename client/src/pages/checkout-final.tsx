import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { formatCpf, formatPhone } from "@/lib/utils";

export default function CheckoutFinal() {
  const [, params] = useRoute("/checkout/:id");
  const [pixPayment, setPixPayment] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(15 * 60);

  const pageQuery = useQuery({
    queryKey: [`/api/payment-pages/${params?.id}`],
    enabled: !!params?.id,
  });

  const createPaymentMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const data = {
        paymentPageId: parseInt(params?.id || "0"),
        customerName: formData.get('customerName'),
        customerEmail: formData.get('customerEmail'),
        customerCpf: formData.get('customerCpf')?.toString().replace(/[^0-9]/g, ''),
        customerPhone: formData.get('customerPhone'),
        amount: (pageQuery.data as any)?.price?.toString()
      };
      
      console.log('Sending payment data:', data);
      
      const response = await fetch('/api/pix-payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao processar pagamento');
      }
      
      return response.json();
    },
    onSuccess: (payment: any) => {
      console.log('Payment created successfully:', payment);
      setPixPayment(payment);
      setTimeLeft(10 * 60); // 10 minutes for payment
    },
    onError: (error: any) => {
      console.error('Payment creation failed:', error);
      alert('Erro ao processar pagamento: ' + error.message);
    }
  });

  // Simple timer
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // PIX payment status polling
  useEffect(() => {
    if (pixPayment) {
      const timer = setInterval(async () => {
        try {
          const response = await fetch(`/api/pix-payments/${pixPayment.id}`);
          if (response.ok) {
            const updatedPayment = await response.json();
            setPixPayment(updatedPayment);
            if (updatedPayment.status === 'completed') {
              clearInterval(timer);
            }
          }
        } catch (error) {
          console.error('Error polling payment status:', error);
        }
      }, 5000);
      
      return () => clearInterval(timer);
    }
  }, [pixPayment]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (pageQuery.isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  }

  if (!pageQuery.data) {
    return <div className="min-h-screen flex items-center justify-center">Página não encontrada</div>;
  }

  const page = pageQuery.data as any;

  // Render custom elements
  const customElements = page.customElements ? JSON.parse(page.customElements) : [];

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createPaymentMutation.mutate(formData);
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.target.value = formatCpf(e.target.value);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.target.value = formatPhone(e.target.value);
  };

  const renderCustomElement = (element: any) => {
    const styles = element.styles || {};
    
    const baseStyle: React.CSSProperties = {
      color: styles.color || page.textColor,
      backgroundColor: styles.backgroundColor,
      fontWeight: styles.isBold ? 'bold' : styles.fontWeight || 'normal',
      fontSize: styles.fontSize ? `${styles.fontSize}px` : undefined,
      textAlign: styles.textAlign || 'left',
      padding: styles.padding,
      border: styles.border,
      borderRadius: styles.borderRadius ? `${styles.borderRadius}px` : undefined,
      marginBottom: styles.marginBottom,
      marginTop: styles.marginTop,
      lineHeight: styles.lineHeight,
      borderTop: styles.borderTop,
      boxShadow: styles.boxShadow
    };

    if (styles.hasBox && styles.boxColor) {
      baseStyle.backgroundColor = styles.boxColor;
      baseStyle.padding = baseStyle.padding || '12px';
      baseStyle.borderRadius = baseStyle.borderRadius || '8px';
    }

    switch (element.type) {
      case 'text':
        return (
          <div key={element.id} style={baseStyle}>
            {element.content}
          </div>
        );
      case 'image':
        return (
          <div key={element.id} style={baseStyle}>
            <img 
              src={element.content} 
              alt="Custom" 
              style={{ 
                width: styles.imageSize ? `${styles.imageSize}px` : 'auto',
                height: 'auto',
                maxWidth: '100%'
              }}
            />
          </div>
        );
      case 'separator':
        return (
          <hr 
            key={element.id} 
            style={{
              ...baseStyle,
              border: 'none',
              borderTop: styles.border || `1px solid ${page.textColor}`,
              margin: `${styles.marginTop || '20px'} 0 ${styles.marginBottom || '20px'} 0`
            }}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div 
      className="min-h-screen"
      style={{ 
        backgroundColor: page.backgroundColor,
        color: page.textColor,
        fontFamily: 'Inter, sans-serif'
      }}
    >
      {/* Header */}
      <header 
        className="w-full px-4 py-6"
        style={{ 
          backgroundColor: page.primaryColor,
          height: `${page.headerHeight}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: page.logoPosition
        }}
      >
        {page.showLogo && page.logoUrl && (
          <img 
            src={page.logoUrl} 
            alt="Logo" 
            style={{ 
              height: `${page.logoSize}px`,
              maxWidth: '100%',
              objectFit: 'contain'
            }}
          />
        )}
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Custom Elements - Before Content */}
        {customElements
          .filter((el: any) => el.position === 'before')
          .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
          .map(renderCustomElement)}

        {!pixPayment ? (
          // Form Step
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center mb-8">
              <h1 className="text-2xl md:text-3xl font-bold mb-4" style={{ color: page.primaryColor }}>
                {page.customTitle || page.productName}
              </h1>
              <p className="text-gray-600 mb-6">
                {page.customSubtitle || page.productDescription}
              </p>
              <div className="text-3xl font-bold mb-4" style={{ color: page.primaryColor }}>
                R$ {page.price}
              </div>
              
              {/* Timer */}
              <div className="mb-6">
                <div className="text-sm text-gray-500 mb-2">Tempo restante para finalizar:</div>
                <div 
                  className="text-2xl font-mono font-bold"
                  style={{ color: timeLeft <= 60 ? '#DC2626' : page.primaryColor }}
                >
                  {formatTime(timeLeft)}
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Nome Completo</label>
                <input
                  type="text"
                  name="customerName"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Digite seu nome completo"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">E-mail</label>
                <input
                  type="email"
                  name="customerEmail"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Digite seu e-mail"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">CPF</label>
                <input
                  type="text"
                  name="customerCpf"
                  required
                  onChange={handleCpfChange}
                  maxLength={14}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="000.000.000-00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Telefone</label>
                <input
                  type="text"
                  name="customerPhone"
                  required
                  onChange={handlePhoneChange}
                  maxLength={15}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="(11) 99999-9999"
                />
              </div>

              <button
                type="submit"
                disabled={createPaymentMutation.isPending}
                className="w-full py-4 px-6 text-white font-semibold rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
                style={{ backgroundColor: page.primaryColor }}
              >
                {createPaymentMutation.isPending ? 'Processando...' : (page.customButtonText || 'Pagar com PIX')}
              </button>
            </form>
          </div>
        ) : (
          // Payment Step
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <h2 className="text-2xl font-bold mb-6" style={{ color: page.primaryColor }}>
              Pagamento PIX
            </h2>
            
            <div className="mb-6">
              <div className="text-sm text-gray-500 mb-2">Status:</div>
              <div className="text-lg font-semibold" style={{ color: page.primaryColor }}>
                Aguardando Pagamento...
              </div>
            </div>

            <div className="mb-6">
              <div className="text-sm text-gray-500 mb-2">Tempo restante:</div>
              <div 
                className="text-xl font-mono font-bold"
                style={{ color: timeLeft <= 60 ? '#DC2626' : page.primaryColor }}
              >
                {formatTime(timeLeft)}
              </div>
            </div>

            {pixPayment.pixQrCode && (
              <div className="mb-6">
                <img 
                  src={pixPayment.pixQrCode} 
                  alt="QR Code PIX" 
                  className="mx-auto mb-4 max-w-xs"
                />
              </div>
            )}

            {pixPayment.pixCode && (
              <div className="mb-6">
                <div className="text-sm text-gray-500 mb-2">Código PIX (Copia e Cola):</div>
                <div className="bg-gray-100 p-4 rounded-lg text-sm font-mono break-all">
                  {pixPayment.pixCode}
                </div>
                <button
                  onClick={() => navigator.clipboard.writeText(pixPayment.pixCode)}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                >
                  Copiar código
                </button>
              </div>
            )}

            <div className="text-sm text-gray-600">
              {page.customInstructions || 'Escaneie o QR Code ou use o código PIX para efetuar o pagamento.'}
            </div>
          </div>
        )}

        {/* Custom Elements - After Content */}
        {customElements
          .filter((el: any) => el.position === 'after')
          .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
          .map(renderCustomElement)}
      </main>
    </div>
  );
}