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

  return (
    <div 
      className="min-h-screen w-full"
      style={{ backgroundColor: customStyles.backgroundColor }}
    >
      {/* Header */}
      <div 
        className="w-full p-6 text-white text-center flex flex-col justify-center"
        style={{ 
          backgroundColor: customStyles.primaryColor,
          height: `${page.headerHeight || 120}px`
        }}
      >
        {/* Top custom elements - exactly like editor */}
        {customElements
          .filter((el: any) => el.position === "top" || (typeof el.position === "number" && el.position >= 0 && el.position < 10))
          .sort((a: any, b: any) => {
            const posA = typeof a.position === "string" ? 0 : a.position;
            const posB = typeof b.position === "string" ? 0 : b.position;
            return posA - posB;
          })
          .map((element: any) => (
            <div key={element.id} className="mb-4">
              {renderCustomElement(element)}
            </div>
          ))}

        {/* Logo display from template or page settings */}
        {(() => {
          const showLogo = templateData?.renderSettings?.showLogo ?? page.showLogo ?? false;
          const logoUrl = templateData?.renderSettings?.logoUrl ?? page.logoUrl;
          const logoPosition = templateData?.renderSettings?.logoPosition ?? page.logoPosition ?? 'center';
          const logoSize = templateData?.renderSettings?.logoSize ?? page.logoSize ?? 64;
          
          if (showLogo && logoUrl) {
            return (
              <div className={`mb-4 flex ${logoPosition === 'left' ? 'justify-start' : logoPosition === 'right' ? 'justify-end' : 'justify-center'}`}>
                <img 
                  src={logoUrl} 
                  alt="Logo" 
                  className="object-contain rounded"
                  style={{ width: `${logoSize}px`, height: `${logoSize}px` }}
                />
              </div>
            );
          }
          return null;
        })()}

        {/* Header custom elements after logo */}
        {customElements
          .filter((el: any) => el.position >= -10 && el.position < 0)
          .sort((a: any, b: any) => a.position - b.position)
          .map((element: any) => (
            <div key={element.id}>
              {renderCustomElement(element)}
            </div>
          ))}

        {/* Title and subtitle from template or page settings */}
        {(() => {
          const title = templateData?.formData?.customTitle ?? page.customTitle;
          const subtitle = templateData?.formData?.customSubtitle ?? page.customSubtitle;
          const price = templateData?.formData?.price ?? page.price;
          
          return (
            <>
              {title && title.trim() && (
                <h1 className="text-2xl font-bold mb-2">
                  {title}
                </h1>
              )}
              
              {subtitle && subtitle.trim() && (
                <p className="text-white/90 mb-4">
                  {subtitle}
                </p>
              )}
              
              <div className="text-3xl font-bold">
                {formatCurrency(price)}
              </div>
            </>
          );
        })()}
      </div>

      {/* Form area */}
      <div className="w-full p-6 bg-white flex justify-center">
        <div className="w-full max-w-md">
          {/* Render middle elements */}
          {customElements
            .filter((el: any) => el.position === "middle" || (el.position >= 0 && el.position < 100))
            .sort((a: any, b: any) => a.position - b.position)
            .map((element: any) => (
              <div key={element.id} className="mb-4">
                {renderCustomElement(element)}
              </div>
            ))}

          {/* Content/Form area */}
          {!pixPayment && !page.skipForm && (
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
                style={{ backgroundColor: customStyles.accentColor }}
              >
                <QrCode className="w-5 h-5" />
                <span>
                  {createPaymentMutation.isPending ? "Gerando PIX..." : (page.customButtonText || "Pagar com PIX")}
                </span>
              </Button>
            </form>
          </Form>
          )}

          {/* PIX Payment Display */}
          {pixPayment && (
            <div>
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
                <div className="mb-6">
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Ou copie o código PIX:
                  </label>
                  <div className="flex">
                    <input
                      type="text"
                      value={pixPayment.pixCode}
                      readOnly
                      className="flex-1 px-3 py-2 border border-neutral-300 rounded-l-md bg-neutral-50 text-sm"
                    />
                    <Button
                      type="button"
                      onClick={copyPixCode}
                      className="px-4 py-2 rounded-l-none"
                      style={{ backgroundColor: customStyles.accentColor }}
                    >
                      <Copy className="w-4 h-4" />
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

          {/* Bottom custom elements */}
          {customElements
            .filter((el: any) => el.position === "bottom" || (el.position >= 100 && el.position < 1000))
            .sort((a: any, b: any) => a.position - b.position)
            .map((element: any) => (
              <div key={element.id} className="mt-4">
                {renderCustomElement(element)}
              </div>
            ))}
        </div>
      </div>

      {/* Footer elements (position 1000+) rendered outside card for full width */}
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
  );
}