import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { formatCpf, formatPhone } from "@/lib/utils";

export default function CheckoutFinal() {
  const [, params] = useRoute("/checkout/:id");
  const [pixPayment, setPixPayment] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(15 * 60);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      setTimeLeft(15 * 60);
    },
    onError: (error: any) => {
      console.error('Payment creation failed:', error);
      alert('Erro ao processar pagamento: ' + error.message);
    }
  });

  useEffect(() => {
    if (pixPayment && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [pixPayment, timeLeft]);

  // Form handling setup - run only once when page loads
  useEffect(() => {
    if (!pixPayment && pageQuery.data) {
      const timeoutId = setTimeout(() => {
        const form = document.querySelector('form[data-react-form]') || document.querySelector('form');
        
        if (form) {
          const handleSubmit = async (event: Event) => {
            event.preventDefault();
            event.stopPropagation();
            
            if (isSubmitting) return;
            setIsSubmitting(true);
            
            const formData = new FormData(form as HTMLFormElement);
            
            try {
              await createPaymentMutation.mutateAsync(formData);
            } catch (error) {
              console.error('Payment submission failed:', error);
            } finally {
              setIsSubmitting(false);
            }
          };

          const handleCpfInput = (event: Event) => {
            const input = event.target as HTMLInputElement;
            input.value = formatCpf(input.value);
          };

          const handlePhoneInput = (event: Event) => {
            const input = event.target as HTMLInputElement;
            input.value = formatPhone(input.value);
          };

          form.addEventListener('submit', handleSubmit);
          
          const cpfInput = form.querySelector('input[name="customerCpf"]');
          const phoneInput = form.querySelector('input[name="customerPhone"]');
          
          if (cpfInput) cpfInput.addEventListener('input', handleCpfInput);
          if (phoneInput) phoneInput.addEventListener('input', handlePhoneInput);
        }
      }, 500);
      
      return () => clearTimeout(timeoutId);
    }
  }, [!!pageQuery.data && !pixPayment]);

  // Timer effect for form page - simplified approach
  useEffect(() => {
    if (!pixPayment && pageQuery.data) {
      const intervalId = setInterval(() => {
        setTimeLeft(prev => {
          const newTime = Math.max(0, prev - 1);
          const minutes = Math.floor(newTime / 60);
          const seconds = newTime % 60;
          const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
          
          // Update DOM element if it exists
          const timerElement = document.getElementById('countdown-timer');
          if (timerElement) {
            timerElement.textContent = formattedTime;
            if (newTime <= 0) {
              timerElement.style.color = '#DC2626';
            }
          }
          
          return newTime;
        });
      }, 1000);
      
      return () => clearInterval(intervalId);
    }
  }, [pixPayment, pageQuery.data]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (pageQuery.isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Carregando...</div>;
  }

  if (pageQuery.error || !pageQuery.data) {
    return <div className="flex items-center justify-center min-h-screen">Página não encontrada</div>;
  }

  const page = pageQuery.data as any;

  // Use the exact previewHtml from database with logo and custom design
  let finalHtml = page.previewHtml;
  
  // Replace the form placeholder with actual form HTML
  if (finalHtml.includes('{{FORM_PLACEHOLDER}}')) {
    const formHtml = `
      <!-- Status Compacto -->
      <div class="bg-amber-50 border border-amber-300 rounded-md p-3 mb-4 text-center">
        <div class="flex items-center justify-center mb-2">
          <svg class="animate-spin h-4 w-4 mr-2 text-amber-500" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span class="text-sm font-medium text-amber-600">Aguardando dados...</span>
        </div>
        <div id="countdown-timer" class="text-lg font-bold font-mono text-amber-700">${formatTime(timeLeft)}</div>
      </div>

      <form data-react-form="true" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Nome completo</label>
          <input type="text" name="customerName" required 
                 class="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input type="email" name="customerEmail" required 
                 class="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">CPF</label>
          <input type="text" name="customerCpf" required maxlength="14" placeholder="000.000.000-00"
                 class="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
          <input type="tel" name="customerPhone" required placeholder="(11) 99999-9999"
                 class="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
        </div>
        
        <button type="submit"
                class="w-full text-white py-3 px-6 rounded-md font-semibold hover:opacity-90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                style="background-color: ${page.accentColor};" ${isSubmitting ? 'disabled' : ''}>
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
          </svg>
          ${isSubmitting ? 'Processando...' : (page.customButtonText || 'Pagar com PIX')}
        </button>
      </form>
    `;
    finalHtml = finalHtml.replace('{{FORM_PLACEHOLDER}}', formHtml);
  }
  
  // Add footer at the very end if missing
  if (!finalHtml.includes('<footer')) {
    finalHtml += `
    
    <!-- Footer -->
    <footer class="w-full py-6 px-6 border-t border-gray-200 bg-gray-50">
      <div class="max-w-md mx-auto text-center">
        <div class="flex items-center justify-center space-x-6 text-sm text-gray-600 mb-3">
          <span class="flex items-center space-x-1">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd" />
            </svg>
            <span>Pagamento Seguro</span>
          </span>
          <span class="flex items-center space-x-1">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
            </svg>
            <span>Processamento Imediato</span>
          </span>
        </div>
        <div class="text-xs text-gray-500">
          Seus dados estão protegidos e a transação é processada com segurança
        </div>
      </div>
    </footer>`;
  }
  
  // If we have a PIX payment, show the payment interface instead
  if (pixPayment) {
    finalHtml = `<div class="min-h-screen w-full" style="background-color: ${page.backgroundColor};">
      <!-- Header -->
      <div class="w-full px-4 py-4 text-white text-center flex flex-col justify-center" style="background-color: ${page.primaryColor}; min-height: ${Math.max(page.headerHeight - 40, 180)}px;">
        ${page.showLogo && page.logoUrl ? `
          <div class="mb-3 flex justify-center">
            <img src="${page.logoUrl}" alt="Logo" class="object-contain rounded" style="width: ${Math.min(page.logoSize, 80)}px; height: ${Math.min(page.logoSize, 80)}px;" />
          </div>
        ` : ''}
        
        <h1 class="text-lg sm:text-xl md:text-2xl font-bold mb-2 leading-tight">Pagamento PIX Gerado</h1>
        <p class="text-sm sm:text-base md:text-lg opacity-90 leading-snug px-2">Escaneie o QR Code ou copie o código PIX para finalizar</p>
      </div>
      
      <!-- Main Content -->
      <div class="flex-1 p-6">
        <!-- Status Compacto -->
        <div class="max-w-md mx-auto mb-6">
          <div class="bg-amber-50 border border-amber-300 rounded-md p-3 text-center">
            <div class="flex items-center justify-center mb-2">
              <svg class="animate-spin h-4 w-4 mr-2 text-amber-500" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span class="text-sm font-medium text-amber-600">Aguardando pagamento...</span>
            </div>
            <div id="payment-timer" class="text-lg font-bold font-mono text-amber-700">${formatTime(timeLeft)}</div>
          </div>
        </div>
        
        <script>
          // Sincronizar cronômetro com React state
          let paymentTimeLeft = ${timeLeft};
          
          function updatePaymentTimer() {
            const timer = document.getElementById('payment-timer');
            if (timer && paymentTimeLeft > 0) {
              const minutes = Math.floor(paymentTimeLeft / 60);
              const seconds = paymentTimeLeft % 60;
              timer.textContent = minutes.toString().padStart(2, '0') + ':' + seconds.toString().padStart(2, '0');
              paymentTimeLeft--;
              
              if (paymentTimeLeft <= 0) {
                timer.textContent = '00:00';
                timer.style.color = '#DC2626';
              }
            }
          }
          
          setInterval(updatePaymentTimer, 1000);
          updatePaymentTimer();
        </script>

        <!-- Payment Status -->
        <div class="max-w-md mx-auto mb-6">
          <div class="bg-white border border-gray-200 rounded-lg p-6">
            <div class="text-center mb-6">
              <div class="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <h2 class="text-xl font-bold mb-2" style="color: ${page.primaryColor};">PIX Gerado com Sucesso</h2>
              <p class="text-gray-600">Valor: <strong>R$ ${page.price}</strong></p>
            </div>

            <div class="bg-white border-2 border-gray-200 rounded-lg p-4 mb-6 text-center">
              <img src="${pixPayment.pixQrCode}" alt="QR Code PIX" class="mx-auto max-w-full h-auto" style="max-width: 200px;" />
            </div>

            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Código PIX (Copiar e Colar)</label>
                <div class="bg-gray-50 border border-gray-300 rounded-md p-3">
                  <div class="text-xs font-mono break-all text-gray-800">${pixPayment.pixCode}</div>
                </div>
                <button onclick="navigator.clipboard.writeText('${pixPayment.pixCode}').then(() => alert('Código PIX copiado para a área de transferência!'))" 
                        class="w-full mt-2 text-white py-2 px-4 rounded-md font-medium hover:opacity-90 transition-colors" 
                        style="background-color: ${page.accentColor};">
                  📋 Copiar Código PIX
                </button>
              </div>

              <div class="bg-blue-50 rounded-md p-4 border border-blue-200">
                <h3 class="font-medium text-blue-900 mb-2">📱 Como pagar:</h3>
                <ol class="text-sm text-blue-800 space-y-1">
                  <li>1. Abra o app do seu banco</li>
                  <li>2. Procure pela opção PIX</li>
                  <li>3. Escaneie o QR Code ou cole o código</li>
                  <li>4. Confirme o pagamento de R$ ${page.price}</li>
                </ol>
              </div>

              <div class="bg-yellow-50 rounded-md p-4 border border-yellow-200">
                <div class="flex items-start">
                  <svg class="w-5 h-5 text-yellow-600 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <div class="text-sm text-yellow-800">
                    <p><strong>Status do Pagamento:</strong> ${pixPayment.status === 'PENDING' ? 'Aguardando Pagamento' : pixPayment.status}</p>
                    <p class="mt-1">A página será atualizada automaticamente após a confirmação do pagamento.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Footer -->
      <footer class="w-full py-6 px-6 border-t border-gray-200 bg-gray-50">
        <div class="max-w-md mx-auto text-center">
          <div class="flex items-center justify-center space-x-6 text-sm text-gray-600 mb-3">
            <span class="flex items-center space-x-1">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd" />
              </svg>
              <span>Pagamento Seguro</span>
            </span>
            <span class="flex items-center space-x-1">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
              </svg>
              <span>PIX Instantâneo</span>
            </span>
          </div>
          <div class="text-xs text-gray-500">
            PIX ID: ${pixPayment.id} • Transação processada com segurança
          </div>
        </div>
      </footer>
      
      <script>
        // Update timer display every second
        setInterval(() => {
          window.location.reload();
        }, 30000); // Refresh every 30 seconds to update timer
      </script>
    </div>`;
  }

  return <div dangerouslySetInnerHTML={{ __html: finalHtml }} />;
}