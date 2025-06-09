import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatCpf, copyToClipboard } from "@/lib/utils";
import { QrCode, Copy, Clock } from "lucide-react";
import UnifiedTemplateRenderer from "@/components/unified-template-renderer";

const customerFormSchema = z.object({
  customerName: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  customerEmail: z.string().email("Email inválido"),
  customerCpf: z.string().min(11, "CPF deve ter 11 dígitos"),
  customerPhone: z.string().min(10, "Telefone deve ter pelo menos 10 dígitos"),
});

type CustomerForm = z.infer<typeof customerFormSchema>;

interface PixPayment {
  id: number;
  pixCode: string;
  pixQrCode: string;
  customerName: string;
  customerEmail: string;
  customerCpf: string;
  customerPhone: string;
  amount: string;
  status: string;
}

interface PaymentPage {
  id: number;
  productName: string;
  productDescription: string;
  price: string;
  customTitle?: string;
  customSubtitle?: string;
  customButtonText?: string;
  customInstructions?: string;
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  logoUrl?: string;
  logoPosition: string;
  logoSize: number;
  headerHeight: number;
  customElements?: string;
  skipForm: boolean;
}

export default function Checkout() {
  const { id: pageId } = useParams<{ id: string }>();
  const [location] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [pixPayment, setPixPayment] = useState<PixPayment | null>(null);
  const [timeLeft, setTimeLeft] = useState(15 * 60); // 15 minutes in seconds

  // Timer functionality
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

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Extract URL parameters for auto-fill
  const urlParams = new URLSearchParams(window.location.search);
  const autoFillData = {
    nome: urlParams.get('nome') || '',
    email: urlParams.get('email') || '',
    cpf: urlParams.get('cpf') || '',
    telefone: urlParams.get('telefone') || ''
  };

  const form = useForm<CustomerForm>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      customerName: autoFillData.nome,
      customerEmail: autoFillData.email,
      customerCpf: autoFillData.cpf,
      customerPhone: autoFillData.telefone,
    },
  });

  const { data: page, isLoading, error } = useQuery<PaymentPage>({
    queryKey: [`/api/payment-pages/${pageId}`],
    enabled: !!pageId,
  });

  const createPaymentMutation = useMutation({
    mutationFn: async (data: CustomerForm) => {
      const response = await fetch("/api/pix-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentPageId: parseInt(pageId!),
          customerName: data.customerName,
          customerEmail: data.customerEmail,
          customerCpf: data.customerCpf,
          customerPhone: data.customerPhone,
        }),
      });

      if (!response.ok) {
        throw new Error("Falha ao criar pagamento PIX");
      }

      return response.json();
    },
    onSuccess: (payment: PixPayment) => {
      setPixPayment(payment);
      toast({
        title: "PIX gerado!",
        description: "Escaneie o QR Code ou copie o código PIX",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao gerar PIX",
        variant: "destructive",
      });
    },
  });

  // Auto-generate PIX for skip form pages
  useEffect(() => {
    console.log('Auto-fill data:', autoFillData);
    console.log('Page skipForm:', page?.skipForm);
    console.log('PIX payment exists:', !!pixPayment);
    
    if (page && page.skipForm && !pixPayment && autoFillData.nome && autoFillData.email && autoFillData.cpf && autoFillData.telefone) {
      console.log('Generating PIX automatically...');
      const formData = {
        customerName: autoFillData.nome,
        customerEmail: autoFillData.email,
        customerCpf: autoFillData.cpf,
        customerPhone: autoFillData.telefone,
      };
      createPaymentMutation.mutate(formData);
    }
  }, [page, autoFillData.nome, autoFillData.email, autoFillData.cpf, autoFillData.telefone, pixPayment]);

  const onSubmit = (data: CustomerForm) => {
    createPaymentMutation.mutate(data);
  };

  const copyPixCode = async () => {
    if (pixPayment?.pixCode) {
      await copyToClipboard(pixPayment.pixCode);
      toast({
        title: "Copiado!",
        description: "Código PIX copiado para a área de transferência",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando página de pagamento...</p>
        </div>
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Página não encontrada</h1>
          <p className="text-gray-600">A página de pagamento solicitada não existe.</p>
        </div>
      </div>
    );
  }

  // Don't render if page data isn't available yet
  if (!page) {
    return null;
  }

  const getCustomStyles = (page: PaymentPage, templateData: any) => {
    if (templateData?.renderSettings) {
      return {
        primaryColor: templateData.renderSettings.primaryColor || "#1f2937",
        accentColor: templateData.renderSettings.accentColor || "#3b82f6",
        backgroundColor: templateData.renderSettings.backgroundColor || "#f9fafb",
        textColor: templateData.renderSettings.textColor || "#1f2937",
      };
    }
    return {
      primaryColor: page.primaryColor || "#1f2937",
      accentColor: page.accentColor || "#3b82f6",
      backgroundColor: page.backgroundColor || "#f9fafb",
      textColor: page.textColor || "#1f2937",
    };
  };

  // Parse template structure if available
  let templateData = null;
  let customElements = [];
  
  if ((page as any).templateStructure) {
    try {
      templateData = JSON.parse((page as any).templateStructure);
      customElements = templateData.customElements || [];
    } catch (error) {
      console.error('Error parsing template structure:', error);
    }
  }
  
  // Use customElements directly from page like in the editor
  try {
    customElements = JSON.parse(page.customElements || "[]");
  } catch (error) {
    console.error('Error parsing custom elements:', error);
    customElements = [];
  }

  const customStyles = getCustomStyles(page, templateData);

  const renderCustomElement = (element: any) => {
    if (element.type === "image") {
      return (
        <div key={element.id} className="mb-4 text-center">
          <img
            src={element.content}
            alt="Custom element"
            className="mx-auto"
            style={{
              width: element.styles?.imageSize || 200,
              borderRadius: element.styles?.borderRadius || 8
            }}
            onError={(e) => {
              e.currentTarget.src = "https://via.placeholder.com/200x100?text=Imagem+não+encontrada";
            }}
          />
        </div>
      );
    }

    const elementStyles = element.styles || {};
    const isFooterElement = element.type?.includes('footer') || element.position === "bottom" || element.position >= 100;
    
    return (
      <div
        key={element.id}
        className={`${elementStyles.hasBox ? 'border' : ''} ${isFooterElement ? 'w-full' : ''}`}
        style={{
          color: elementStyles.color || "#000000",
          backgroundColor: elementStyles.backgroundColor || (elementStyles.hasBox ? elementStyles.boxColor || "#ffffff" : "transparent"),
          borderColor: elementStyles.hasBox ? elementStyles.boxColor || "#e5e7eb" : "transparent",
          fontWeight: elementStyles.fontWeight || (elementStyles.isBold ? "bold" : "normal"),
          fontSize: elementStyles.fontSize ? `${elementStyles.fontSize}px` : "16px",
          textAlign: elementStyles.textAlign || (isFooterElement ? "center" : "left"),
          borderRadius: elementStyles.borderRadius ? `${elementStyles.borderRadius}px` : "4px",
          padding: elementStyles.padding || "8px",
          border: elementStyles.border,
          marginBottom: elementStyles.marginBottom || "16px",
          marginTop: elementStyles.marginTop || (isFooterElement ? "24px" : "0"),
          lineHeight: elementStyles.lineHeight || "1.5",
          borderTop: elementStyles.borderTop,
          boxShadow: elementStyles.boxShadow,
          minHeight: "20px",
          display: "block",
        }}
        dangerouslySetInnerHTML={{ __html: element.content.replace(/\n/g, '<br/>') }}
      />
    );
  };

  // Render form content for the unified renderer
  const formContent = !pixPayment && !page.skipForm ? (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="customerName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome Completo</FormLabel>
              <FormControl>
                <Input placeholder="Digite seu nome completo" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="customerEmail"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="Digite seu email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="customerCpf"
          render={({ field }) => (
            <FormItem>
              <FormLabel>CPF</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Digite seu CPF" 
                  {...field}
                  onChange={(e) => field.onChange(formatCpf(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="customerPhone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Telefone</FormLabel>
              <FormControl>
                <Input placeholder="Digite seu telefone" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button 
          type="submit" 
          className="w-full text-white flex items-center justify-center space-x-2"
          disabled={createPaymentMutation.isPending}
          style={{ backgroundColor: page.accentColor }}
        >
          <QrCode className="w-5 h-5" />
          <span>
            {createPaymentMutation.isPending ? "Gerando PIX..." : (page.customButtonText || "Pagar com PIX")}
          </span>
        </Button>
      </form>
    </Form>
  ) : pixPayment ? (
    <div>
      <div className="text-center mb-6">
        <div className="text-lg font-semibold text-neutral-800 mb-4">
          Valor: {formatCurrency(page.price)}
        </div>
      </div>

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
        <p className="text-sm text-neutral-600 mb-4">
          Escaneie o QR Code com seu app do banco
        </p>
        <div className="flex justify-center mb-4">
          <img 
            src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Logo%E2%80%94pix_powered_by_Banco_Central_%28Brazil%2C_2020%29.svg/2560px-Logo%E2%80%94pix_powered_by_Banco_Central_%28Brazil%2C_2020%29.svg.png"
            alt="PIX Logo"
            className="h-8 object-contain"
          />
        </div>
      </div>

      <div className="text-center mb-6">
        <div className="w-48 h-48 bg-white border-2 border-neutral-200 rounded-lg mx-auto flex items-center justify-center mb-4">
          {pixPayment.pixQrCode ? (
            <img 
              src={pixPayment.pixQrCode} 
              alt="QR Code PIX" 
              className="w-40 h-40 object-contain"
            />
          ) : (
            <div className="w-40 h-40 bg-black/10 rounded flex items-center justify-center">
              <QrCode className="w-16 h-16 text-neutral-400" />
            </div>
          )}
        </div>
      </div>

      {pixPayment.pixCode && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            Código PIX Copia e Cola:
          </label>
          <div className="space-y-2">
            <input
              type="text"
              value={pixPayment.pixCode}
              readOnly
              className="w-full px-3 py-2 border border-neutral-300 rounded-md bg-neutral-50 text-sm font-mono"
            />
            <Button
              type="button"
              onClick={copyPixCode}
              className="w-full px-4 py-2 shadow-lg transform transition-all duration-150 active:scale-95"
              style={{
                backgroundColor: '#48AD45',
                borderRadius: '4px',
                boxShadow: '0 4px 8px rgba(72, 173, 69, 0.3), 0 2px 4px rgba(0, 0, 0, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)'
              }}
            >
              <Copy className="w-4 h-4 mr-2" />
              Copiar Código PIX
            </Button>
          </div>
        </div>
      )}

      <div className="text-center">
        <p className="text-xs text-neutral-600">
          O pagamento será confirmado automaticamente
        </p>
      </div>
    </div>
  ) : null;

  // Use saved preview HTML if available - this is the EXACT code from the editor preview
  if (page && (page as any).previewHtml && (page as any).previewHtml.trim()) {
    console.log("Using EXACT saved preview HTML for checkout");
    console.log("Preview HTML being used:", (page as any).previewHtml);
    
    // Use the exact HTML from preview, only replace the form placeholder
    let checkoutHtml = (page as any).previewHtml;
    
    if (pixPayment) {
      // Show PIX payment information
      const pixPaymentHtml = `
        <div>
          <div class="text-center mb-6">
            <div class="text-lg font-semibold text-gray-800 mb-4">
              Valor: R$ ${page.price}
            </div>
          </div>

          <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div class="text-center space-y-2">
              <div class="flex items-center justify-center gap-2 text-yellow-800">
                <span class="text-sm font-medium">Aguardando pagamento...</span>
                <div class="animate-spin h-4 w-4 border-2 border-yellow-600 border-t-transparent rounded-full"></div>
              </div>
              <div class="text-xl font-bold text-yellow-800">
                Expira em 15:00
              </div>
            </div>
          </div>

          <div class="text-center mb-6">
            <p class="text-sm text-gray-600 mb-4">
              Escaneie o QR Code com seu app do banco
            </p>
            <div class="flex justify-center mb-4">
              <img 
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Logo%E2%80%94pix_powered_by_Banco_Central_%28Brazil%2C_2020%29.svg/2560px-Logo%E2%80%94pix_powered_by_Banco_Central_%28Brazil%2C_2020%29.svg.png"
                alt="PIX Logo"
                class="h-8 object-contain"
              />
            </div>
          </div>

          <div class="text-center mb-6">
            <div class="w-48 h-48 bg-white border-2 border-gray-200 rounded-lg mx-auto flex items-center justify-center mb-4">
              ${pixPayment.pixQrCode ? `
                <img src="${pixPayment.pixQrCode}" alt="QR Code PIX" class="w-40 h-40 object-contain" />
              ` : `
                <div class="w-40 h-40 bg-black/10 rounded flex items-center justify-center">
                  <svg class="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h2M4 4h4m4 0h4m0 0h4m-4 0v4M4 8h4m0 0v4m0 0h4m0 0v4"></path>
                  </svg>
                </div>
              `}
            </div>
          </div>
            </p>
          </div>

          ${pixPayment.pixCode ? `
            <div class="mb-6">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Ou copie o código PIX:
              </label>
              <div class="flex">
                <input
                  type="text"
                  value="${pixPayment.pixCode}"
                  readonly
                  class="flex-1 px-3 py-2 border border-gray-300 rounded-l-md bg-gray-50 text-sm"
                />
                <button
                  type="button"
                  onclick="navigator.clipboard.writeText('${pixPayment.pixCode}')"
                  class="px-4 py-2 rounded-r-md text-white font-medium"
                  style="background-color: ${page.accentColor}">
                  Copiar
                </button>
              </div>
            </div>
          ` : ''}

          <div class="text-center">
            <div class="inline-flex items-center space-x-2 text-yellow-600 bg-yellow-50 px-4 py-2 rounded-lg">
              <svg class="w-4 h-4 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"></path>
              </svg>
              <span class="text-sm font-medium">Aguardando pagamento...</span>
            </div>
            <p class="text-xs text-gray-600 mt-2">
              O pagamento será confirmado automaticamente
            </p>
          </div>
        </div>
      `;
      
      checkoutHtml = checkoutHtml.replace('<!-- FORM_PLACEHOLDER -->', pixPaymentHtml);
    } else if (!page.skipForm) {
      // Show form for payment
      const formHtml = `
        <form class="space-y-4" onsubmit="handleFormSubmit(event)">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Nome Completo</label>
            <input type="text" name="customerName" placeholder="Digite seu nome completo" 
                   class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" required />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <input type="email" name="customerEmail" placeholder="Digite seu email" 
                   class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" required />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">CPF</label>
            <input type="text" name="customerCpf" placeholder="Digite seu CPF" 
                   class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" required />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Telefone</label>
            <input type="text" name="customerPhone" placeholder="Digite seu telefone" 
                   class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" required />
          </div>
          <button type="submit" 
                  class="w-full text-white flex items-center justify-center space-x-2 px-4 py-2 rounded-md font-medium"
                  style="background-color: ${page.accentColor}">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h2M4 4h4m4 0h4m0 0h4m-4 0v4M4 8h4m0 0v4m0 0h4m0 0v4"></path>
            </svg>
            <span>${page.customButtonText || 'Pagar com PIX'}</span>
          </button>
        </form>
        
        <script>
          async function handleFormSubmit(event) {
            event.preventDefault();
            const formData = new FormData(event.target);
            const data = Object.fromEntries(formData);
            
            try {
              const response = await fetch('/api/pix-payments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  ...data,
                  pageId: ${page.id},
                  amount: '${page.price}'
                })
              });
              
              if (response.ok) {
                window.location.reload();
              }
            } catch (error) {
              console.error('Payment error:', error);
            }
          }
        </script>
      `;
      
      checkoutHtml = checkoutHtml.replace('<!-- FORM_PLACEHOLDER -->', formHtml);
    } else {
      // Auto-submit script for skip form
      const autoSubmitScript = `
        <div class="text-center py-8">
          <div class="inline-flex items-center space-x-2 text-blue-600">
            <svg class="animate-spin w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
            <span class="text-sm font-medium">Processando pagamento...</span>
          </div>
        </div>
        
        <script>
          setTimeout(async () => {
            try {
              const response = await fetch('/api/pix-payments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  customerName: 'Cliente PIX',
                  customerEmail: 'cliente@exemplo.com',
                  customerCpf: '00000000000',
                  customerPhone: '(11) 99999-9999',
                  pageId: ${page.id},
                  amount: '${page.price}'
                })
              });
              
              if (response.ok) {
                window.location.reload();
              }
            } catch (error) {
              console.error('Auto-payment error:', error);
            }
          }, 1000);
        </script>
      `;
      
      checkoutHtml = checkoutHtml.replace('<!-- FORM_PLACEHOLDER -->', autoSubmitScript);
    }
    
    return (
      <div dangerouslySetInnerHTML={{ __html: checkoutHtml }} />
    );
  }

  // Fallback to unified renderer if no preview HTML exists
  return (
    <UnifiedTemplateRenderer 
      page={page} 
      customElements={customElements}
      children={formContent}
    />
  );
}