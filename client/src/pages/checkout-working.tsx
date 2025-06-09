import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";

export default function CheckoutWorking() {
  const [, params] = useRoute("/checkout/:id");
  const [pixPayment, setPixPayment] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(15 * 60);

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

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const pageQuery = useQuery({
    queryKey: [`/api/payment-pages/${params?.id}`],
    enabled: !!params?.id,
  });

  const page = pageQuery.data;

  if (pageQuery.isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Carregando...</div>;
  }

  if (!page) {
    return <div className="flex items-center justify-center min-h-screen">Página não encontrada</div>;
  }

  if ((page as any).previewHtml && (page as any).previewHtml.trim()) {
    let finalHtml = (page as any).previewHtml;

    if (pixPayment) {
      // PIX Payment Interface
      const pixContent = `
        <div class="space-y-6 text-center">
          <div class="text-lg font-semibold text-gray-800 mb-4">
            Valor: R$ ${parseFloat((page as any).price).toFixed(2).replace('.', ',')}
          </div>

          <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div class="text-center space-y-2">
              <div class="flex items-center justify-center gap-2 text-yellow-800">
                <span class="text-sm font-medium">Aguardando pagamento...</span>
                <div class="animate-spin h-4 w-4 border-2 border-yellow-600 border-t-transparent rounded-full"></div>
              </div>
              <div class="text-xl font-bold text-yellow-800" id="timer-display">
                Expira em ${formatTime(timeLeft)}
              </div>
            </div>
          </div>

          <div class="text-center mb-6">
            <p class="text-sm text-gray-600 mb-4">Escaneie o QR Code com seu app de pagamento</p>
            <div class="flex justify-center mb-4">
              <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Logo%E2%80%94pix_powered_by_Banco_Central_%28Brazil%2C_2020%29.svg/2560px-Logo%E2%80%94pix_powered_by_Banco_Central_%28Brazil%2C_2020%29.svg.png" alt="PIX Logo" class="h-8 object-contain" />
            </div>
          </div>

          <div class="bg-white border-2 border-gray-200 rounded-lg p-6">
            ${pixPayment.pixQrCode ? `
              <img src="${pixPayment.pixQrCode}" alt="QR Code PIX" class="mx-auto mb-4 rounded border" style="width: 200px; height: 200px;" />
            ` : `
              <div class="w-48 h-48 bg-gray-200 rounded mx-auto mb-4 flex items-center justify-center">
                <span class="text-gray-500">QR Code</span>
              </div>
            `}
            
            <div class="space-y-3">
              <div class="text-sm text-gray-600">Código PIX:</div>
              <div class="bg-gray-50 border rounded p-3 text-sm break-all font-mono">${pixPayment.pixCode || 'Carregando...'}</div>
              <button onclick="copyPixCode()" class="w-full text-white py-2 px-4 shadow-lg transform transition-all duration-150 active:scale-95" style="background-color: #48AD45; border-radius: 4px; box-shadow: 0 4px 8px rgba(72, 173, 69, 0.3), 0 2px 4px rgba(0, 0, 0, 0.1); border: 1px solid rgba(255, 255, 255, 0.2);">
                Copiar Código PIX
              </button>
            </div>
          </div>

          <div class="text-sm text-gray-500">
            <p>Valor: R$ ${parseFloat((page as any).price).toFixed(2).replace('.', ',')}</p>
            <p>O pagamento será confirmado automaticamente</p>
          </div>

          <script>
            let timeLeft = ${timeLeft};
            
            function updateTimer() {
              if (timeLeft > 0) {
                const minutes = Math.floor(timeLeft / 60);
                const seconds = timeLeft % 60;
                const formattedTime = minutes.toString().padStart(2, '0') + ':' + seconds.toString().padStart(2, '0');
                const timerEl = document.getElementById('timer-display');
                if (timerEl) timerEl.textContent = 'Expira em ' + formattedTime;
                timeLeft--;
                setTimeout(updateTimer, 1000);
              } else {
                const timerEl = document.getElementById('timer-display');
                if (timerEl) timerEl.textContent = 'Expirado';
              }
            }
            
            updateTimer();
            
            function copyPixCode() {
              navigator.clipboard.writeText('${pixPayment.pixCode || ''}').then(() => {
                alert('Código PIX copiado!');
              });
            }
          </script>
        </div>
      `;
      
      const formRegex = /<form[^>]*>[\s\S]*?<\/form>/;
      if (formRegex.test(finalHtml)) {
        finalHtml = finalHtml.replace(formRegex, pixContent);
      }
    } else {
      // Customer Form - always show when no payment exists
      const formContent = `
        <script>
          function formatCpf(input) {
            let value = input.value.replace(/[^0-9]/g, '');
            if (value.length > 3) value = value.substring(0,3) + '.' + value.substring(3);
            if (value.length > 7) value = value.substring(0,7) + '.' + value.substring(7);
            if (value.length > 11) value = value.substring(0,11) + '-' + value.substring(11,13);
            input.value = value.substring(0,14);
          }

          function formatPhone(input) {
            let value = input.value.replace(/[^0-9]/g, '');
            if (value.length > 2) value = '(' + value.substring(0,2) + ') ' + value.substring(2);
            if (value.length > 10) value = value.substring(0,10) + '-' + value.substring(10);
            input.value = value.substring(0,15);
          }

          function handleSubmit(event) {
            event.preventDefault();
            
            const submitBtn = document.getElementById('submit-btn');
            const form = event.target;
            const formData = new FormData(form);
            
            submitBtn.disabled = true;
            submitBtn.textContent = 'Processando...';
            
            const data = {
              paymentPageId: ${(page as any).id},
              customerName: formData.get('customerName'),
              customerEmail: formData.get('customerEmail'),
              customerCpf: formData.get('customerCpf').replace(/[^0-9]/g, ''),
              customerPhone: formData.get('customerPhone'),
              amount: '${(page as any).price}'
            };
            
            console.log('Submitting payment data:', data);
            
            fetch('/api/pix-payments', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data)
            })
            .then(response => {
              console.log('Response status:', response.status);
              return response.json();
            })
            .then(result => {
              console.log('Response data:', result);
              if (result.id) {
                console.log('Payment created successfully, reloading page');
                window.location.reload();
              } else {
                throw new Error(result.message || 'Erro ao processar pagamento');
              }
            })
            .catch(error => {
              console.error('Error:', error);
              alert('Erro ao processar pagamento: ' + error.message);
              submitBtn.disabled = false;
              submitBtn.innerHTML = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>${(page as any).customButtonText || 'Pagar com PIX'}';
            });
            
            return false;
          }
        </script>
        
        <form class="space-y-4" onsubmit="return handleSubmit(event)">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Nome completo</label>
            <input type="text" name="customerName" required class="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" name="customerEmail" required class="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">CPF</label>
            <input type="text" name="customerCpf" required maxlength="14" placeholder="000.000.000-00" class="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" oninput="formatCpf(this)" />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
            <input type="tel" name="customerPhone" required placeholder="(11) 99999-9999" class="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" oninput="formatPhone(this)" />
          </div>
          
          <button type="submit" id="submit-btn" class="w-full text-white py-3 px-6 rounded-md font-semibold hover:opacity-90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2" style="background-color: ${(page as any).accentColor || '#10B981'};">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
            </svg>
            ${(page as any).customButtonText || 'Pagar com PIX'}
          </button>
        </form>
      `;
      
      const formRegex = /<form[^>]*>[\s\S]*?<\/form>/;
      if (formRegex.test(finalHtml)) {
        finalHtml = finalHtml.replace(formRegex, formContent);
      }
    }

    return <div dangerouslySetInnerHTML={{ __html: finalHtml }} />;
  }

  return <div className="flex items-center justify-center min-h-screen">Template não encontrado</div>;
}