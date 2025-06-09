import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { formatCpf } from "@/lib/utils";

export default function CheckoutHtml() {
  const [, params] = useRoute("/checkout/:id");
  const [location] = useLocation();
  const [pixPayment, setPixPayment] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const pageQuery = useQuery({
    queryKey: [`/api/payment-pages/${params?.id}`],
    enabled: !!params?.id,
  });

  const page = pageQuery.data;

  // Check for skip form parameter
  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  const shouldSkipForm = (page as any)?.skipForm || urlParams.get('skip') === 'true';

  const createPaymentMutation = useMutation({
    mutationFn: async (customerData: any) => {
      const response = await fetch("/api/pix-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentPageId: parseInt(params?.id || "0"),
          ...customerData,
          amount: (page as any)?.price?.toString(),
        }),
      });
      return response.json();
    },
    onSuccess: (payment) => {
      setPixPayment(payment);
    },
  });

  // Auto-submit for skip form
  useEffect(() => {
    if (shouldSkipForm && page && !pixPayment && !isLoading) {
      setIsLoading(true);
      createPaymentMutation.mutate({
        customerName: "Cliente Direto",
        customerEmail: "cliente@exemplo.com",
        customerCpf: "00000000000",
        customerPhone: "(11) 99999-9999",
      });
    }
  }, [shouldSkipForm, page, pixPayment, isLoading]);

  if (pageQuery.isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Carregando...</div>;
  }

  if (!page) {
    return <div className="flex items-center justify-center min-h-screen">Página não encontrada</div>;
  }

  // Debug logging
  console.log("Page data received:", page);
  console.log("PreviewHtml exists:", !!(page as any).previewHtml);
  console.log("PreviewHtml content:", (page as any).previewHtml);

  // If we have saved HTML, use it EXACTLY as is
  if ((page as any).previewHtml && (page as any).previewHtml.trim()) {
    let finalHtml = (page as any).previewHtml;

    // Replace FORM_PLACEHOLDER with actual content
    if (pixPayment) {
      // PIX Payment View
      const pixContent = `
        <div class="space-y-6 text-center">
          <div class="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          <h2 class="text-xl font-semibold text-gray-900 mb-2">PIX Gerado com Sucesso!</h2>
          <p class="text-gray-600 mb-6">Escaneie o QR Code ou copie o código PIX</p>

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
              <button onclick="copyPixCode()" class="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700">
                Copiar Código PIX
              </button>
            </div>
          </div>

          <div class="text-sm text-gray-500">
            <p>Valor: R$ ${parseFloat((page as any).price).toFixed(2).replace('.', ',')}</p>
            <p>O pagamento será confirmado automaticamente</p>
          </div>

          <script>
            function copyPixCode() {
              navigator.clipboard.writeText('${pixPayment.pixCode || ''}').then(() => {
                alert('Código PIX copiado!');
              });
            }
          </script>
        </div>
      `;
      
      finalHtml = finalHtml.replace('<!-- FORM_PLACEHOLDER -->', pixContent);
    } else {
      // Customer Form View
      const formContent = `
        <form id="checkout-form" class="space-y-4" onsubmit="handleFormSubmit(event)">
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
                   class="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                   oninput="formatCpfInput(this)" />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
            <input type="tel" name="customerPhone" required placeholder="(11) 99999-9999"
                   class="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                   oninput="formatPhoneInput(this)" />
          </div>
          
          <button type="submit" class="w-full bg-green-600 text-white py-3 px-6 rounded-md font-semibold hover:bg-green-700 transition-colors disabled:opacity-50" 
                  id="submit-btn">
            Pagar com PIX
          </button>
        </form>

        <script>
          function formatCpfInput(input) {
            let value = input.value.replace(/\\D/g, '');
            if (value.length <= 11) {
              value = value.replace(/(\\d{3})(\\d)/, '$1.$2');
              value = value.replace(/(\\d{3})(\\d)/, '$1.$2');
              value = value.replace(/(\\d{3})(\\d{1,2})$/, '$1-$2');
            }
            input.value = value;
          }

          function formatPhoneInput(input) {
            let value = input.value.replace(/\\D/g, '');
            if (value.length <= 11) {
              value = value.replace(/(\\d{2})(\\d)/, '($1) $2');
              value = value.replace(/(\\d{4,5})(\\d{4})$/, '$1-$2');
            }
            input.value = value;
          }

          async function handleFormSubmit(event) {
            event.preventDefault();
            const submitBtn = document.getElementById('submit-btn');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Processando...';

            const formData = new FormData(event.target);
            
            try {
              const response = await fetch('/api/pix-payments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  paymentPageId: ${(page as any).id},
                  customerName: formData.get('customerName'),
                  customerEmail: formData.get('customerEmail'),
                  customerCpf: formData.get('customerCpf').replace(/\\D/g, ''),
                  customerPhone: formData.get('customerPhone'),
                  amount: '${(page as any).price}'
                })
              });
              
              if (response.ok) {
                window.location.reload();
              } else {
                throw new Error('Erro ao processar pagamento');
              }
            } catch (error) {
              alert('Erro ao processar pagamento. Tente novamente.');
              submitBtn.disabled = false;
              submitBtn.textContent = 'Pagar com PIX';
            }
          }
        </script>
      `;
      
      finalHtml = finalHtml.replace('<!-- FORM_PLACEHOLDER -->', formContent);
    }

    // Return the exact HTML with no React wrapper
    return <div dangerouslySetInnerHTML={{ __html: finalHtml }} />;
  }

  // Fallback if no HTML is saved
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
        <h2 className="text-xl font-semibold mb-4">Template não encontrado</h2>
        <p className="text-gray-600 mb-4">
          Esta página ainda não possui um template HTML definido.
        </p>
        <a 
          href={`/pages/html-edit/${params?.id}`}
          className="inline-block bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
        >
          Criar Template
        </a>
      </div>
    </div>
  );
}