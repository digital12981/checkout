import { useState, useEffect, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { formatCpf, formatPhone } from "@/lib/utils";
import UnifiedTemplateRenderer from "@/components/unified-template-renderer";
import CheckoutLoading from "@/components/checkout-loading";

export default function CheckoutFinal() {
  const [, params] = useRoute("/checkout/:id");
  const [location] = useLocation();
  const [pixPayment, setPixPayment] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(15 * 60);
  const [isProcessingAutoPayment, setIsProcessingAutoPayment] = useState(false);

  const pageQuery = useQuery({
    queryKey: [`/api/payment-pages/${params?.id}`],
    enabled: !!params?.id,
  });

  const [, setLocation] = useLocation();
  const redirectedRef = useRef(false);

  // Handle redirect once when data loads
  useEffect(() => {
    if (!pageQuery.data || pageQuery.isLoading || redirectedRef.current) return;
    
    const page = pageQuery.data as any;
    const fromChat = new URLSearchParams(window.location.search).get('fromChat');
    
    if (page.chatEnabled && !fromChat) {
      redirectedRef.current = true;
      setLocation(`/chat/${params?.id}`);
    }
  }, [pageQuery.data, pageQuery.isLoading]);

  const createPaymentMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/pix-payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error('Erro ao processar pagamento');
      }
      
      return response.json();
    },
    onSuccess: (payment: any) => {
      setPixPayment(payment);
      setIsProcessingAutoPayment(false);
    },
    onError: () => {
      setIsProcessingAutoPayment(false);
    }
  });

  // Auto-process payment when skipForm is enabled and URL has query params
  useEffect(() => {
    if (pageQuery.data && (pageQuery.data as any).skipForm && !pixPayment && !isProcessingAutoPayment) {
      const urlParams = new URLSearchParams(window.location.search);
      const customerName = urlParams.get('name') || urlParams.get('customerName');
      const customerEmail = urlParams.get('email') || urlParams.get('customerEmail');
      const customerCpf = urlParams.get('cpf') || urlParams.get('customerCpf');
      const customerPhone = urlParams.get('phone') || urlParams.get('customerPhone');

      if (customerName && customerEmail && customerCpf) {
        setIsProcessingAutoPayment(true);
        
        const data = {
          paymentPageId: parseInt(params?.id || "0"),
          customerName: customerName || '',
          customerEmail: customerEmail || '',
          customerCpf: customerCpf.replace(/[^0-9]/g, ''),
          customerPhone: customerPhone || '',
          amount: (pageQuery.data as any)?.price?.toString() || '0'
        };
        
        createPaymentMutation.mutate(data);
      }
    }
  }, [pageQuery.data, pixPayment, isProcessingAutoPayment]);

  // Timer countdown
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft]);

  // Poll payment status
  useEffect(() => {
    if (pixPayment?.id) {
      const timer = setInterval(async () => {
        try {
          const response = await fetch(`/api/pix-payments/${pixPayment.id}`);
          if (response.ok) {
            const updatedPayment = await response.json();
            if (updatedPayment.status === 'PAID') {
              setPixPayment(updatedPayment);
              // Redirect to success page or show success message
              alert('Pagamento confirmado!');
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

  if (pageQuery.isLoading || isProcessingAutoPayment) {
    return <CheckoutLoading pageId={params?.id} />;
  }

  if (!pageQuery.data) {
    return <div className="min-h-screen flex items-center justify-center">Página não encontrada</div>;
  }

  const page = pageQuery.data as any;
  console.log("Loading page data:", page);
  console.log("Loaded custom elements:", page.customElements ? JSON.parse(page.customElements) : []);

  // Render custom elements
  const customElements = page.customElements ? JSON.parse(page.customElements) : [];

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const data = {
      paymentPageId: parseInt(params?.id || "0"),
      customerName: formData.get('customerName') || '',
      customerEmail: formData.get('customerEmail') || '',
      customerCpf: formData.get('customerCpf')?.toString().replace(/[^0-9]/g, '') || '',
      customerPhone: formData.get('customerPhone') || '',
      amount: page?.price?.toString() || '0'
    };
    
    createPaymentMutation.mutate(data);
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.target.value = formatCpf(e.target.value);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.target.value = formatPhone(e.target.value);
  };

  return (
    <UnifiedTemplateRenderer
      page={page}
      customElements={customElements}
      isEditor={false}
    >
      {!pixPayment ? (
        // Form Step - usando o template salvo
        <div className="p-6 space-y-4">
          {/* Status Compacto com Cronômetro */}
          <div className="bg-amber-50 border border-amber-300 rounded-md p-3 mb-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <svg className="animate-spin h-4 w-4 mr-2 text-amber-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-sm font-medium text-amber-600">Aguardando Pagamento...</span>
            </div>
            <div className="text-lg font-bold font-mono text-amber-700">{formatTime(timeLeft)}</div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome completo</label>
              <input 
                type="text" 
                name="customerName"
                required
                placeholder="Seu nome completo"
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input 
                type="email" 
                name="customerEmail"
                required
                placeholder="seu@email.com"
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CPF</label>
              <input 
                type="text" 
                name="customerCpf"
                required
                onChange={handleCpfChange}
                maxLength={14}
                placeholder="000.000.000-00"
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
              <input 
                type="tel" 
                name="customerPhone"
                required
                onChange={handlePhoneChange}
                maxLength={15}
                placeholder="(11) 99999-9999"
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <button 
              type="submit"
              disabled={createPaymentMutation.isPending}
              className="w-full text-white py-3 px-6 rounded-md font-semibold flex items-center justify-center"
              style={{ backgroundColor: page.accentColor }}
            >
              {createPaymentMutation.isPending ? 'Processando...' : (page.customButtonText || "Pagar com PIX")}
            </button>
          </form>
        </div>
      ) : (
        // Payment Step - usando o tamanho correto do QR Code
        <div className="p-6 space-y-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center gap-2 text-yellow-800">
                <span className="text-sm font-medium">Aguardando pagamento...</span>
                <div className="animate-spin h-4 w-4 border-2 border-yellow-600 border-t-transparent rounded-full"></div>
              </div>
              <div className="text-xl font-bold text-yellow-800">
                Expira em {formatTime(timeLeft)}
              </div>
            </div>
          </div>

          <div className="text-center mb-6">
            <div className="text-gray-600 text-sm mb-4">
              Escaneie o QR Code ou copie o código PIX
            </div>
            <div className="flex justify-center mb-4">
              <img 
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Logo%E2%80%94pix_powered_by_Banco_Central_%28Brazil%2C_2020%29.svg/2560px-Logo%E2%80%94pix_powered_by_Banco_Central_%28Brazil%2C_2020%29.svg.png"
                alt="PIX Logo"
                className="h-8 object-contain"
              />
            </div>
          </div>

          <div className="flex justify-center">
            {pixPayment.pixQrCode ? (
              <img 
                src={pixPayment.pixQrCode} 
                alt="QR Code PIX" 
                className="w-48 h-48 border-2 border-gray-300 rounded-lg"
              />
            ) : (
              <div className="w-48 h-48 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m-6-6a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m-6-6a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2"></path>
                  </svg>
                  <p className="text-sm">QR Code PIX</p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="text-sm font-medium text-gray-700">
              Código PIX Copia e Cola:
            </div>
            <div className="space-y-2">
              <input 
                type="text" 
                value={pixPayment.pixCode || ''} 
                className="w-full p-3 border border-gray-300 rounded-md bg-gray-50 text-sm font-mono"
                readOnly 
              />
              <button 
                onClick={() => navigator.clipboard.writeText(pixPayment.pixCode || '')}
                className="w-full px-4 py-3 text-white flex items-center justify-center gap-2 shadow-lg transform transition-all duration-150 active:scale-95"
                style={{
                  backgroundColor: '#48AD45',
                  borderRadius: '4px',
                  boxShadow: '0 4px 8px rgba(72, 173, 69, 0.3), 0 2px 4px rgba(0, 0, 0, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)'
                }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                </svg>
                Copiar Código PIX
              </button>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <div className="text-sm text-blue-800">
                <div className="font-medium mb-1">Instruções:</div>
                <ul className="space-y-1 text-xs">
                  <li>• Abra o app do seu banco</li>
                  <li>• Escolha a opção PIX</li>
                  <li>• Escaneie o QR Code ou cole o código</li>
                  <li>• Confirme o pagamento</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </UnifiedTemplateRenderer>
  );
}