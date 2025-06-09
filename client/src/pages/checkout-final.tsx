import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { formatCpf, formatPhone } from "@/lib/utils";

export default function CheckoutFinal() {
  const [, params] = useRoute("/checkout/:id");
  const [pixPayment, setPixPayment] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(15 * 60);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cronômetro funcional de 15 minutos
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft]);

  const pageQuery = useQuery({
    queryKey: [`/api/payment-pages/${params?.id}`],
    enabled: !!params?.id,
  });

  const createPaymentMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      console.log("Form submit event triggered");
      const customerName = formData.get("customerName") as string;
      const customerEmail = formData.get("customerEmail") as string;
      const customerCpf = formData.get("customerCpf") as string;
      const customerPhone = formData.get("customerPhone") as string;

      console.log("Form data extracted:", {
        customerName,
        customerEmail,
        customerCpf,
        customerPhone,
      });

      const paymentData = {
        paymentPageId: parseInt(params?.id || "0"),
        customerName,
        customerEmail,
        customerCpf: customerCpf.replace(/\D/g, ""),
        customerPhone,
        amount: (pageQuery.data as any)?.price || "0",
      };

      console.log("Sending payment data:", paymentData);

      const response = await fetch("/api/create-pix-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(paymentData),
      });

      if (!response.ok) {
        throw new Error("Failed to create payment");
      }

      return response.json();
    },
    onSuccess: (payment: any) => {
      console.log("Payment created successfully:", payment);
      setPixPayment(payment);
    },
    onError: (error) => {
      console.error("Payment creation failed:", error);
      alert("Erro ao processar pagamento. Tente novamente.");
    },
  });

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (pageQuery.isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Carregando...</div>;
  }

  if (pageQuery.error || !pageQuery.data) {
    return <div className="flex items-center justify-center min-h-screen">Página não encontrada</div>;
  }

  const page = pageQuery.data as any;

  // Render payment view if PIX payment exists
  if (pixPayment) {
    return (
      <div className="min-h-screen w-full" style={{ backgroundColor: page.backgroundColor }}>
        {/* Header */}
        <div className="w-full p-6 text-white text-center flex flex-col justify-center" style={{ backgroundColor: page.primaryColor, height: `${page.headerHeight}px` }}>
          {page.showLogo && page.logoUrl && (
            <div className="mb-4 flex justify-center">
              <img src={page.logoUrl} alt="Logo" className="object-contain rounded" style={{ width: `${page.logoSize}px`, height: `${page.logoSize}px` }} />
            </div>
          )}
          <h1 className="text-2xl font-bold mb-2">Pagamento PIX Gerado</h1>
          <p className="text-lg opacity-90">Escaneie o QR Code ou copie o código PIX para finalizar</p>
        </div>
        
        {/* Main Content */}
        <div className="flex-1 p-6">
          {/* Status Compacto */}
          <div className="max-w-md mx-auto mb-6">
            <div className="bg-amber-50 p-3 text-center" style={{ borderRadius: '4px' }}>
              <div className="flex items-center justify-center mb-2">
                <svg className="animate-spin h-4 w-4 mr-2 text-amber-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-sm font-medium text-amber-600">Aguardando pagamento...</span>
              </div>
              <div className="text-lg font-bold font-mono text-amber-700" style={{ color: timeLeft <= 0 ? '#DC2626' : undefined }}>
                {formatTime(timeLeft)}
              </div>
            </div>
          </div>

          {/* Payment Status */}
          <div className="max-w-md mx-auto mb-6">
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                </div>
                <h2 className="text-xl font-bold mb-2" style={{ color: page.primaryColor }}>PIX Gerado com Sucesso</h2>
                <p className="text-gray-600">Valor: <strong>R$ {page.price}</strong></p>
              </div>

              <div className="bg-white border-2 border-gray-200 rounded-lg p-4 mb-6 text-center">
                <img src={pixPayment.pixQrCode} alt="QR Code PIX" className="mx-auto max-w-full h-auto" style={{ maxWidth: '200px' }} />
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Código PIX (Copiar e Colar)</label>
                  <div className="bg-gray-50 border border-gray-300 rounded-md p-3">
                    <div className="text-xs font-mono break-all text-gray-800">{pixPayment.pixCode}</div>
                  </div>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(pixPayment.pixCode).then(() => 
                        alert('Código PIX copiado para a área de transferência!')
                      );
                    }}
                    className="w-full mt-2 text-white py-2 px-4 rounded-md font-medium hover:opacity-90 transition-colors"
                    style={{ backgroundColor: page.accentColor }}
                  >
                    📋 Copiar Código PIX
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <footer className="w-full py-6 px-6 border-t border-gray-200 bg-gray-50">
          <div className="max-w-md mx-auto text-center">
            <div className="text-xs text-gray-500">
              PIX ID: {pixPayment.id} • Transação processada com segurança
            </div>
          </div>
        </footer>
      </div>
    );
  }

  // Form view
  return (
    <div className="min-h-screen w-full overflow-auto" style={{ backgroundColor: page.backgroundColor }}>
      {/* Header */}
      <div className="w-full p-6 text-white text-center flex flex-col justify-center" style={{ backgroundColor: page.primaryColor, height: `${page.headerHeight}px` }}>
        {page.showLogo && page.logoUrl && (
          <div className="mb-4 flex justify-center">
            <img src={page.logoUrl} alt="Logo" className="object-contain rounded" style={{ width: `${page.logoSize}px`, height: `${page.logoSize}px` }} />
          </div>
        )}
        <h1 className="text-2xl font-bold mb-2">{page.customTitle || page.productName}</h1>
        <p className="text-lg opacity-90">{page.customSubtitle || page.productDescription}</p>
      </div>
      
      {/* Main Content */}
      <div className="p-6 relative z-10">
        {/* Form Area */}
        <div className="max-w-md mx-auto mb-6 relative" style={{ pointerEvents: 'auto' }}>
          <div className="bg-white border border-gray-200 rounded-lg p-6 relative z-20" style={{ pointerEvents: 'auto' }}>
            {/* Status Compacto */}
            <div className="bg-amber-50 p-3 mb-4 text-center" style={{ borderRadius: '4px' }}>
              <div className="flex items-center justify-center mb-2">
                <svg className="animate-spin h-4 w-4 mr-2 text-amber-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-sm font-medium text-amber-600">Aguardando pagamento...</span>
              </div>
              <div className="text-lg font-bold font-mono text-amber-700" style={{ color: timeLeft <= 0 ? '#DC2626' : undefined }}>
                {formatTime(timeLeft)}
              </div>
            </div>

            <form 
              onSubmit={async (e) => {
                e.preventDefault();
                if (isSubmitting) return;
                
                setIsSubmitting(true);
                const formData = new FormData(e.currentTarget);
                
                try {
                  await createPaymentMutation.mutateAsync(formData);
                } catch (error) {
                  console.error('Payment submission failed:', error);
                } finally {
                  setIsSubmitting(false);
                }
              }}
              className="space-y-4 relative z-30"
              style={{ pointerEvents: 'auto' }}
            >
              <div className="relative">
                <label htmlFor="customerName" className="block text-sm font-medium text-gray-700 mb-1">Nome completo</label>
                <input 
                  id="customerName"
                  type="text" 
                  name="customerName" 
                  required 
                  autoComplete="name"
                  onFocus={() => console.log('Name field focused')}
                  onClick={() => console.log('Name field clicked')}
                  style={{ zIndex: 20, position: 'relative', pointerEvents: 'auto' }}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white cursor-text" 
                />
              </div>
              
              <div className="relative">
                <label htmlFor="customerEmail" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input 
                  id="customerEmail"
                  type="email" 
                  name="customerEmail" 
                  required 
                  autoComplete="email"
                  style={{ zIndex: 20, position: 'relative' }}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white" 
                />
              </div>
              
              <div className="relative">
                <label htmlFor="customerCpf" className="block text-sm font-medium text-gray-700 mb-1">CPF</label>
                <input 
                  id="customerCpf"
                  type="text" 
                  name="customerCpf" 
                  required 
                  maxLength={14} 
                  placeholder="000.000.000-00"
                  onChange={(e) => e.target.value = formatCpf(e.target.value)}
                  style={{ zIndex: 20, position: 'relative' }}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white" 
                />
              </div>
              
              <div className="relative">
                <label htmlFor="customerPhone" className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                <input 
                  id="customerPhone"
                  type="tel" 
                  name="customerPhone" 
                  required 
                  placeholder="(11) 99999-9999"
                  onChange={(e) => e.target.value = formatPhone(e.target.value)}
                  style={{ zIndex: 20, position: 'relative' }}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white" 
                />
              </div>
              
              <button 
                type="submit"
                disabled={isSubmitting}
                className="w-full text-white py-3 px-6 rounded-md font-semibold hover:opacity-90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ backgroundColor: page.accentColor }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                </svg>
                {isSubmitting ? 'Processando...' : (page.customButtonText || 'Pagar com PIX')}
              </button>
            </form>
          </div>
        </div>
        
        {page.customInstructions && (
          <div className="max-w-md mx-auto mb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="text-sm text-blue-800 whitespace-pre-line">{page.customInstructions}</div>
            </div>
          </div>
        )}
      </div>
      
      {/* Footer */}
      <footer className="w-full py-6 px-6 border-t border-gray-200 bg-gray-50">
        <div className="max-w-md mx-auto text-center">
          <div className="flex items-center justify-center space-x-6 text-sm text-gray-600 mb-3">
            <span className="flex items-center space-x-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              <span>Pagamento Seguro</span>
            </span>
            <span className="flex items-center space-x-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Processamento Imediato</span>
            </span>
          </div>
          <div className="text-xs text-gray-500">
            Seus dados estão protegidos e a transação é processada com segurança
          </div>
        </div>
      </footer>
    </div>
  );
}