import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";

export default function CheckoutFinal() {
  const [, params] = useRoute("/checkout/:id");
  const [pixPayment, setPixPayment] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(15 * 60);

  const pageQuery = useQuery({
    queryKey: [`/api/payment-pages/${params?.id}`],
    enabled: !!params?.id,
  });

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

  if (pageQuery.isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  }

  if (!pageQuery.data) {
    return <div className="min-h-screen flex items-center justify-center">Página não encontrada</div>;
  }

  const page = pageQuery.data as any;
  console.log("Loading page data:", page);
  console.log("Loaded custom elements:", page.customElements ? JSON.parse(page.customElements) : []);

  // Use the saved preview HTML if it exists
  if (page.previewHtml && page.previewHtml.trim()) {
    console.log("Using generated HTML");
    
    let finalHtml = page.previewHtml;
    
    if (!pixPayment) {
      // Form view - inject form functionality into saved HTML
      const formScript = `
        <script>
          function handleFormSubmit(event) {
            event.preventDefault();
            const form = event.target;
            const formData = new FormData(form);
            
            // Format CPF
            const cpfValue = formData.get('customerCpf')?.toString().replace(/[^0-9]/g, '');
            
            const data = {
              paymentPageId: ${params?.id || 0},
              customerName: formData.get('customerName'),
              customerEmail: formData.get('customerEmail'),
              customerCpf: cpfValue,
              customerPhone: formData.get('customerPhone'),
              amount: '${page.price}'
            };
            
            // Disable form
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) {
              submitBtn.textContent = 'Processando...';
              submitBtn.disabled = true;
            }
            
            fetch('/api/pix-payments', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data)
            })
            .then(response => response.json())
            .then(result => {
              if (result.id) {
                window.location.reload();
              } else {
                throw new Error('Erro ao processar pagamento');
              }
            })
            .catch(error => {
              console.error('Error:', error);
              alert('Erro ao processar pagamento: ' + error.message);
              if (submitBtn) {
                submitBtn.textContent = '${page.customButtonText || "Pagar com PIX"}';
                submitBtn.disabled = false;
              }
            });
            
            return false;
          }
          
          function formatCpf(input) {
            let value = input.value.replace(/\\D/g, '');
            value = value.replace(/(\\d{3})(\\d)/, '$1.$2');
            value = value.replace(/(\\d{3})(\\d)/, '$1.$2');
            value = value.replace(/(\\d{3})(\\d{1,2})$/, '$1-$2');
            input.value = value;
          }
          
          function formatPhone(input) {
            let value = input.value.replace(/\\D/g, '');
            value = value.replace(/(\\d{2})(\\d)/, '($1) $2');
            value = value.replace(/(\\d{5})(\\d)/, '$1-$2');
            input.value = value;
          }
          
          // Timer update
          let timeLeft = ${timeLeft};
          function updateTimer() {
            if (timeLeft > 0) {
              const minutes = Math.floor(timeLeft / 60);
              const seconds = timeLeft % 60;
              const formattedTime = minutes.toString().padStart(2, '0') + ':' + seconds.toString().padStart(2, '0');
              
              // Update all timer elements
              const timerElements = document.querySelectorAll('.timer-display, [class*="timer"]');
              timerElements.forEach(el => {
                if (el.textContent && el.textContent.includes(':')) {
                  el.textContent = formattedTime;
                }
              });
              
              timeLeft--;
              setTimeout(updateTimer, 1000);
            }
          }
          
          // Start timer when page loads
          document.addEventListener('DOMContentLoaded', updateTimer);
          
          // Auto-format inputs
          document.addEventListener('DOMContentLoaded', function() {
            const cpfInputs = document.querySelectorAll('input[name="customerCpf"]');
            cpfInputs.forEach(input => {
              input.addEventListener('input', function() { formatCpf(this); });
            });
            
            const phoneInputs = document.querySelectorAll('input[name="customerPhone"]');
            phoneInputs.forEach(input => {
              input.addEventListener('input', function() { formatPhone(this); });
            });
            
            // Add onsubmit to forms
            const forms = document.querySelectorAll('form');
            forms.forEach(form => {
              form.onsubmit = handleFormSubmit;
            });
          });
        </script>
      `;
      
      finalHtml = finalHtml + formScript;
      
    } else {
      // Payment view - replace form content with payment details
      const pixContent = `
        <div class="p-6 space-y-6">
          <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div class="text-center space-y-2">
              <div class="flex items-center justify-center gap-2 text-yellow-800">
                <span class="text-sm font-medium">Aguardando pagamento...</span>
                <div class="animate-spin h-4 w-4 border-2 border-yellow-600 border-t-transparent rounded-full"></div>
              </div>
              <div class="text-xl font-bold text-yellow-800 timer-display">
                Expira em ${formatTime(timeLeft)}
              </div>
            </div>
          </div>

          <div class="text-center mb-6">
            <div class="text-gray-600 text-sm mb-4">
              Escaneie o QR Code ou copie o código PIX
            </div>
            <div class="flex justify-center mb-4">
              <img 
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Logo%E2%80%94pix_powered_by_Banco_Central_%28Brazil%2C_2020%29.svg/2560px-Logo%E2%80%94pix_powered_by_Banco_Central_%28Brazil%2C_2020%29.svg.png"
                alt="PIX Logo"
                class="h-8 object-contain"
              />
            </div>
          </div>

          <div class="flex justify-center">
            ${pixPayment.pixQrCode ? 
              `<img src="${pixPayment.pixQrCode}" alt="QR Code PIX" class="w-48 h-48 border-2 border-gray-300 rounded-lg" />` :
              `<div class="w-48 h-48 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                 <div class="text-center text-gray-500">
                   <svg class="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m-6-6a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m-6-6a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2"></path>
                   </svg>
                   <p class="text-sm">QR Code PIX</p>
                 </div>
               </div>`
            }
          </div>

          <div class="space-y-3">
            <div class="text-sm font-medium text-gray-700">
              Código PIX Copia e Cola:
            </div>
            <div class="space-y-2">
              <input 
                type="text" 
                value="${pixPayment.pixCode || ''}" 
                class="w-full p-3 border border-gray-300 rounded-md bg-gray-50 text-sm font-mono"
                readonly 
              />
              <button 
                onclick="copyPixCode()"
                class="w-full px-4 py-3 text-white flex items-center justify-center gap-2 shadow-lg transform transition-all duration-150 active:scale-95"
                style="background-color: #48AD45; border-radius: 4px; box-shadow: 0 4px 8px rgba(72, 173, 69, 0.3), 0 2px 4px rgba(0, 0, 0, 0.1); border: 1px solid rgba(255, 255, 255, 0.2)"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                </svg>
                Copiar Código PIX
              </button>
            </div>
          </div>

          <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div class="flex items-start gap-3">
              <svg class="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <div class="text-sm text-blue-800">
                <div class="font-medium mb-1">Instruções:</div>
                <ul class="space-y-1 text-xs">
                  <li>• Abra o app do seu banco</li>
                  <li>• Escolha a opção PIX</li>
                  <li>• Escaneie o QR Code ou cole o código</li>
                  <li>• Confirme o pagamento</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        
        <script>
          let timeLeft = ${timeLeft};
          
          function updateTimer() {
            if (timeLeft > 0) {
              const minutes = Math.floor(timeLeft / 60);
              const seconds = timeLeft % 60;
              const formattedTime = minutes.toString().padStart(2, '0') + ':' + seconds.toString().padStart(2, '0');
              const timerEl = document.querySelector('.timer-display');
              if (timerEl) timerEl.textContent = 'Expira em ' + formattedTime;
              timeLeft--;
              setTimeout(updateTimer, 1000);
            } else {
              const timerEl = document.querySelector('.timer-display');
              if (timerEl) timerEl.textContent = 'Expirado';
            }
          }
          
          updateTimer();
          
          function copyPixCode() {
            navigator.clipboard.writeText('${pixPayment.pixCode || ''}').then(() => {
              alert('Código PIX copiado!');
            }).catch(() => {
              // Fallback for older browsers
              const textArea = document.createElement('textarea');
              textArea.value = '${pixPayment.pixCode || ''}';
              document.body.appendChild(textArea);
              textArea.select();
              document.execCommand('copy');
              document.body.removeChild(textArea);
              alert('Código PIX copiado!');
            });
          }
          
          // Poll payment status
          let pollInterval = setInterval(async () => {
            try {
              const response = await fetch('/api/pix-payments/${pixPayment.id}');
              if (response.ok) {
                const payment = await response.json();
                if (payment.status === 'PAID') {
                  clearInterval(pollInterval);
                  alert('Pagamento confirmado! Obrigado!');
                  // Could redirect to success page here
                }
              }
            } catch (error) {
              console.error('Error polling payment:', error);
            }
          }, 5000);
        </script>
      `;
      
      // Replace form content with payment content
      const formRegex = /<form[^>]*>[\s\S]*?<\/form>/;
      if (formRegex.test(finalHtml)) {
        finalHtml = finalHtml.replace(formRegex, pixContent);
      } else {
        // If no form found, replace the main content area
        const contentRegex = /<div class="p-6[^"]*"[^>]*>[\s\S]*?<\/div>/;
        if (contentRegex.test(finalHtml)) {
          finalHtml = finalHtml.replace(contentRegex, pixContent);
        }
      }
    }

    return <div dangerouslySetInnerHTML={{ __html: finalHtml }} />;
  }

  // Fallback - should not happen with saved templates
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Template não encontrado</h1>
        <p className="text-gray-600">Esta página não possui um template salvo.</p>
      </div>
    </div>
  );
}