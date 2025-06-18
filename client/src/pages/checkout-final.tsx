import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { formatCpf, formatPhone } from "@/lib/utils";
import UnifiedTemplateRenderer from "@/components/unified-template-renderer";

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

  return (
    <UnifiedTemplateRenderer
      page={page}
      customElements={customElements}
      isEditor={false}
    >
      {!pixPayment ? (
        // Form Step - código EXATO do editor
        <div className="p-6 space-y-4">
          {/* Status Compacto com Cronômetro - IGUAL AO EDITOR */}
          <div className="bg-amber-50 border border-amber-300 rounded-md p-3 mb-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <svg className="animate-spin h-4 w-4 mr-2 text-amber-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-sm font-medium text-amber-600">Aguardando Pagamento...</span>
            </div>
            <div className="text-lg font-bold font-mono text-amber-700">{formatTime(timeLeft)}</div>
          </div>

          <div className="text-lg font-semibold text-gray-900">
            {page.skipForm ? "Processando Pagamento..." : "Complete seus dados"}
          </div>
          
          {!page.skipForm && (
            <>
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
                  className="w-full text-white py-3 px-6 rounded-md font-semibold flex items-center justify-center gap-2"
                  style={{ backgroundColor: page.accentColor }}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                  </svg>
                  {createPaymentMutation.isPending ? 'Processando...' : (page.customButtonText || "Pagar com PIX")} - R$ {page.price}
                </button>
              </form>
            </>
          )}
        </div>
      ) : (
        // Payment Step
        <div className="p-6 text-center space-y-6">
          {/* Status Compacto com Cronômetro - IGUAL AO EDITOR */}
          <div className="bg-amber-50 border border-amber-300 rounded-md p-3 mb-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <svg className="animate-spin h-4 w-4 mr-2 text-amber-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-sm font-medium text-amber-600">Aguardando Pagamento...</span>
            </div>
            <div className="text-lg font-bold font-mono text-amber-700">{formatTime(timeLeft)}</div>
          </div>

          <h2 className="text-2xl font-bold" style={{ color: page.primaryColor }}>
            Pagamento PIX
          </h2>

          {pixPayment.pixQrCode && (
            <div>
              <img 
                src={pixPayment.pixQrCode} 
                alt="QR Code PIX" 
                className="mx-auto mb-4 max-w-xs"
              />
            </div>
          )}

          {pixPayment.pixCode && (
            <div>
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
    </UnifiedTemplateRenderer>
  );
}