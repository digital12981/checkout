import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatCpf, copyToClipboard } from "@/lib/utils";
import { QrCode, Copy, Clock } from "lucide-react";

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
  showLogo?: boolean;
}

export default function Checkout() {
  const { id: pageId } = useParams<{ id: string }>();
  const [location] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [pixPayment, setPixPayment] = useState<PixPayment | null>(null);

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
    if (page && page.skipForm && !pixPayment && autoFillData.nome && autoFillData.email && autoFillData.cpf && autoFillData.telefone) {
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

  const customStyles = {
    primaryColor: page.primaryColor || "#1f2937",
    accentColor: page.accentColor || "#3b82f6",
    backgroundColor: page.backgroundColor || "#f9fafb",
    textColor: page.textColor || "#1f2937",
  };

  // Parse custom elements
  let customElements = [];
  try {
    customElements = page.customElements ? JSON.parse(page.customElements) : [];
  } catch (error) {
    console.error('Error parsing custom elements:', error);
    customElements = [];
  }

  const renderCustomElement = (element: any) => {
    if (element.type === "image") {
      return (
        <div className="text-center">
          <img
            src={element.content}
            alt="Custom element"
            className="mx-auto cursor-pointer"
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
    const isFooterElement = element.type?.includes('footer') || element.position >= 100;
    
    return (
      <div
        className={`cursor-pointer ${elementStyles.hasBox ? 'border' : ''} ${
          isFooterElement ? 'w-full -mx-6 px-6 rounded-none' : 'rounded'
        }`}
        style={{
          color: elementStyles.color || "#000000",
          backgroundColor: elementStyles.backgroundColor || (elementStyles.hasBox ? elementStyles.boxColor || "#ffffff" : "transparent"),
          borderColor: elementStyles.hasBox ? elementStyles.boxColor || "#e5e7eb" : "transparent",
          fontWeight: elementStyles.fontWeight || (elementStyles.isBold ? "bold" : "normal"),
          fontSize: elementStyles.fontSize || "16px",
          textAlign: isFooterElement ? "center" : (elementStyles.textAlign || "left"),
          borderRadius: isFooterElement ? "0" : `${elementStyles.borderRadius || 4}px`,
          padding: elementStyles.padding || "8px",
          border: elementStyles.border,
          marginBottom: elementStyles.marginBottom,
          marginTop: isFooterElement ? "32px" : elementStyles.marginTop,
          lineHeight: elementStyles.lineHeight,
          borderTop: elementStyles.borderTop,
          width: isFooterElement ? "100vw" : "auto",
          marginLeft: isFooterElement ? "-50vw" : "0",
          left: isFooterElement ? "50%" : "auto",
          position: isFooterElement ? "relative" : "static"
        }}
        dangerouslySetInnerHTML={{ __html: element.content.replace(/\n/g, '<br/>') }}
      />
    );
  };

  // Use saved template structure if available, otherwise use current page data
  const renderCheckoutPage = () => {
    if (page.templateStructure) {
      try {
        const template = JSON.parse(page.templateStructure);
        return renderFromTemplate(template);
      } catch (error) {
        console.error("Error parsing template structure:", error);
        return renderFallbackLayout();
      }
    }
    return renderFallbackLayout();
  };

  const renderFromTemplate = (template: any) => {
    const { formData, customElements: templateElements, renderSettings } = template;
    
    return (
      <div 
        className="min-h-screen w-full"
        style={{ backgroundColor: renderSettings.backgroundColor }}
      >
        {/* Header with exact template structure */}
        <div 
          className="w-full p-6 text-white text-center flex flex-col justify-center"
          style={{ 
            backgroundColor: renderSettings.primaryColor,
            height: `${renderSettings.headerHeight}px`
          }}
        >
          {/* Render header custom elements in exact saved positions */}
          {templateElements
            .filter((el: any) => el.position < 0)
            .sort((a: any, b: any) => a.position - b.position)
            .map((element: any, index: number) => (
            <div key={element.id || index}>
              {renderCustomElement(element)}
            </div>
          ))}

          {/* Show logo if configured in template */}
          {renderSettings.showLogo && renderSettings.logoUrl && (
            <div className={`mb-4 flex ${renderSettings.logoPosition === 'left' ? 'justify-start' : renderSettings.logoPosition === 'right' ? 'justify-end' : 'justify-center'}`}>
              <img 
                src={renderSettings.logoUrl} 
                alt="Logo" 
                className="object-contain rounded"
                style={{ width: `${renderSettings.logoSize}px`, height: `${renderSettings.logoSize}px` }}
              />
            </div>
          )}

          {/* Show custom title if exists in template */}
          {formData.customTitle && formData.customTitle.trim() && (
            <h1 className="text-2xl font-bold mb-2">
              {formData.customTitle}
            </h1>
          )}
          
          {/* Show custom subtitle if exists in template */}
          {formData.customSubtitle && formData.customSubtitle.trim() && (
            <p className="text-white/90 mb-4">
              {formData.customSubtitle}
            </p>
          )}

          {/* Always show price */}
          <div className="text-3xl font-bold">
            {formatCurrency(page.price)}
          </div>
        </div>

        {/* Form area with template elements */}
        <div className="w-full p-6 bg-white flex justify-center">
          <div className="w-full max-w-md">
            {/* Render body elements in order */}
            {templateElements
              .filter((el: any) => el.position >= 0 && el.position < 100)
              .sort((a: any, b: any) => a.position - b.position)
              .map((element: any, index: number) => (
                <div key={element.id || index}>
                  {renderCustomElement(element)}
                </div>
              ))}

            {/* Customer Form - only show if skipForm is disabled */}
            {!pixPayment && !page.skipForm && (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="customerName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome completo</FormLabel>
                        <FormControl>
                          <Input {...field} defaultValue={autoFillData.nome || ""} />
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
                        <FormLabel>E-mail</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} defaultValue={autoFillData.email || ""} />
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
                          <Input {...field} defaultValue={autoFillData.cpf || ""} />
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
                          <Input {...field} defaultValue={autoFillData.telefone || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button 
                    type="submit"
                    className="w-full text-white py-3 font-medium flex items-center justify-center space-x-2"
                    style={{ backgroundColor: renderSettings.accentColor }}
                    disabled={createPaymentMutation.isPending}
                  >
                    <QrCode className="w-5 h-5" />
                    <span>{createPaymentMutation.isPending ? "Gerando PIX..." : (formData.customButtonText || "Pagar com PIX")}</span>
                  </Button>
                </form>
              </Form>
            )}

            {/* PIX Payment Display */}
            {pixPayment && (
              <div className="space-y-4">
                <h3 className="font-semibold text-neutral-800 mb-4 text-center">
                  Pagamento PIX
                </h3>

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
                  <p className="text-sm text-neutral-600">
                    Escaneie o QR Code com seu app do banco
                  </p>
                </div>

                <div className="bg-neutral-50 p-4 rounded-lg">
                  <p className="text-sm text-neutral-600 mb-2">Ou copie o código PIX:</p>
                  <div className="bg-white p-3 rounded border text-xs font-mono break-all mb-3">
                    {pixPayment.pixCode}
                  </div>
                  <button
                    onClick={copyPixCode}
                    className="w-full px-4 py-2 rounded text-white font-medium"
                    style={{ backgroundColor: '#10B981' }}
                  >
                    Copiar código PIX
                  </button>
                </div>
              </div>
            )}

            {/* Footer elements */}
            {templateElements
              .filter((el: any) => el.position >= 100)
              .sort((a: any, b: any) => a.position - b.position)
              .map((element: any, index: number) => (
                <div key={element.id || index}>
                  {renderCustomElement(element)}
                </div>
              ))}

            {/* Custom instructions */}
            {formData.customInstructions && (
              <div className="mt-6 text-sm text-gray-600 text-center">
                {formData.customInstructions}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderFallbackLayout = () => {
    return (
      <div 
        className="min-h-screen w-full"
        style={{ backgroundColor: customStyles.backgroundColor }}
      >
        {/* Header - exact same structure as edit page */}
        <div 
          className="w-full p-6 text-white text-center flex flex-col justify-center"
          style={{ 
            backgroundColor: customStyles.primaryColor,
            height: `${page.headerHeight}px`
          }}
        >
          {/* Header custom elements (negative positions for header) */}
          {customElements.filter((el: any) => el.position < -10).map((element: any) => (
            <div key={element.id}>
              {renderCustomElement(element)}
            </div>
          ))}

          {page.showLogo && page.logoUrl && (
            <div className={`mb-4 flex ${page.logoPosition === 'left' ? 'justify-start' : page.logoPosition === 'right' ? 'justify-end' : 'justify-center'}`}>
              <img 
                src={page.logoUrl} 
                alt="Logo" 
                className="object-contain rounded"
                style={{ width: `${page.logoSize}px`, height: `${page.logoSize}px` }}
              />
            </div>
          )}

          {/* Header custom elements after logo */}
          {customElements.filter((el: any) => el.position >= -10 && el.position < 0).map((element: any) => (
            <div key={element.id}>
              {renderCustomElement(element)}
            </div>
          ))}

          {/* Only show price, no titles or subtitles */}
          <div className="text-3xl font-bold">
            {formatCurrency(page.price)}
          </div>
        </div>

        {/* Form area - exact same structure as edit page */}
        <div className="w-full p-6 bg-white flex justify-center">
          <div className="w-full max-w-md">
          {/* Render body elements in order (excluding footers) - exact same filter as edit page */}
          {customElements
            .filter((el: any) => el.position >= 0 && el.position < 100)
            .sort((a: any, b: any) => a.position - b.position)
            .map((element: any) => (
              <div key={element.id}>
                {renderCustomElement(element)}
              </div>
            ))}

          {/* Customer Form - only show if skipForm is disabled */}
          {!pixPayment && !page.skipForm && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Nome completo</label>
                <div className="h-10 bg-neutral-100 rounded border"></div>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">E-mail</label>
                <div className="h-10 bg-neutral-100 rounded border"></div>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">CPF</label>
                <div className="h-10 bg-neutral-100 rounded border"></div>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Telefone</label>
                <div className="h-10 bg-neutral-100 rounded border"></div>
              </div>

              <Button 
                className="w-full text-white py-3 font-medium flex items-center justify-center space-x-2"
                style={{ backgroundColor: customStyles.accentColor }}
              >
                <QrCode className="w-5 h-5" />
                <span>{page.customButtonText}</span>
              </Button>
            </div>
          )}

          {/* PIX Payment Display for skip form pages */}
          {pixPayment && (
            <div className="space-y-4">
              <h3 className="font-semibold text-neutral-800 mb-4 text-center">
                Pagamento PIX
              </h3>

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
                <p className="text-sm text-neutral-600">
                  Escaneie o QR Code com seu app do banco
                </p>
              </div>

              {pixPayment.pixCode && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-neutral-700">
                    Ou copie o código PIX:
                  </label>
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={pixPayment.pixCode}
                      readOnly
                      className="w-full px-3 py-2 border border-neutral-300 rounded-md bg-neutral-50 text-sm"
                    />
                    <Button
                      type="button"
                      onClick={copyPixCode}
                      className="w-full py-2 bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copiar Código PIX
                    </Button>
                  </div>
                </div>
              )}

              <div className="text-center">
                <div className="inline-flex items-center space-x-2 text-yellow-600 bg-yellow-50 px-4 py-2 rounded-lg">
                  <Clock className="w-4 h-4 animate-pulse" />
                  <span className="text-sm font-medium">Aguardando pagamento...</span>
                </div>
                <p className="text-xs text-neutral-600 mt-2">
                  O pagamento será confirmado automaticamente
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Footer elements (position 100+) rendered outside card for full width */}
      <div className="w-full mt-6">
        {customElements
          .filter((el: any) => el.position >= 100)
          .sort((a: any, b: any) => a.position - b.position)
          .map((element: any) => (
            <div 
              key={element.id} 
              className="w-full"
              style={{
                backgroundColor: customStyles.primaryColor,
                color: "#ffffff",
                textAlign: "center",
                padding: "20px",
                fontSize: "14px",
                borderTop: `1px solid ${customStyles.primaryColor}`
              }}
            >
              <div dangerouslySetInnerHTML={{ __html: element.content.replace(/\n/g, '<br/>') }} />
            </div>
          ))}
          </div>
        </div>
      </div>
    );
  };

  return renderCheckoutPage();
}