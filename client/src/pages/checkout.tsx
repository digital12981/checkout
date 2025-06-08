import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, copyToClipboard } from "@/lib/utils";
import { QrCode, Copy } from "lucide-react";

const customerFormSchema = z.object({
  customerName: z.string().min(1, "Nome é obrigatório"),
  customerEmail: z.string().email("E-mail inválido"),
  customerCpf: z.string().min(11, "CPF é obrigatório"),
  customerPhone: z.string().min(10, "Telefone é obrigatório"),
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
  templateStructure?: string;
}

interface CustomElement {
  id: string;
  type: "text" | "image" | "footer" | "banner" | "info-box" | "trust-element" | "footer-info" | "footer-element" | string;
  position: number;
  content: string;
  styles: {
    color?: string;
    backgroundColor?: string;
    isBold?: boolean;
    hasBox?: boolean;
    boxColor?: string;
    imageSize?: number;
    borderRadius?: number;
    fontSize?: number;
    textAlign?: "left" | "center" | "right";
    padding?: string;
    border?: string;
    marginBottom?: string;
    marginTop?: string;
    fontWeight?: string;
    lineHeight?: string;
    borderTop?: string;
  };
}

export default function Checkout() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [pixPayment, setPixPayment] = useState<PixPayment | null>(null);

  // Parse URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const autoFillData = {
    nome: urlParams.get('nome') || '',
    email: urlParams.get('email') || '',
    cpf: urlParams.get('cpf') || '',
    telefone: urlParams.get('telefone') || '',
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

  const { data: page, isLoading } = useQuery({
    queryKey: [`/api/payment-pages/${id}`],
  });

  const createPaymentMutation = useMutation({
    mutationFn: async (data: CustomerForm) => {
      const response = await fetch(`/api/pix-payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentPageId: Number(id),
          ...data,
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

  const renderCustomElement = (element: CustomElement) => {
    const elementStyles = element.styles || {};
    const isFooterElement = element.type === "footer" || element.type === "footer-info" || element.type === "footer-element";

    if (element.type === "image") {
      return (
        <div 
          className="text-center"
          style={{
            textAlign: elementStyles.textAlign || "center",
            marginBottom: elementStyles.marginBottom || "16px",
            marginTop: elementStyles.marginTop || "0px",
          }}
        >
          <img 
            src={element.content} 
            alt="Custom element" 
            className="object-contain rounded"
            style={{
              width: `${elementStyles.imageSize || 100}px`,
              height: "auto",
              borderRadius: `${elementStyles.borderRadius || 8}px`,
              margin: "0 auto",
            }}
          />
        </div>
      );
    }

    return (
      <div
        className={`${isFooterElement ? 'w-full' : ''}`}
        style={{
          color: elementStyles.color || "#000000",
          backgroundColor: elementStyles.backgroundColor || "transparent",
          fontWeight: elementStyles.isBold ? "bold" : elementStyles.fontWeight || "normal",
          fontSize: `${elementStyles.fontSize || 16}px`,
          textAlign: elementStyles.textAlign || "left",
          padding: elementStyles.padding || "0",
          border: elementStyles.border,
          borderRadius: `${elementStyles.borderRadius || 0}px`,
          marginBottom: elementStyles.marginBottom || "16px",
          marginTop: elementStyles.marginTop || "0px",
          lineHeight: elementStyles.lineHeight || "1.5",
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

  if (isLoading) {
    return <div>Carregando...</div>;
  }

  if (!page) {
    return <div>Página não encontrada</div>;
  }

  // Parse custom elements
  let customElements: CustomElement[] = [];
  try {
    customElements = JSON.parse(page.customElements || "[]");
  } catch (error) {
    console.error("Error parsing custom elements:", error);
  }

  // Use saved template structure if available
  if (page.templateStructure) {
    try {
      const template = JSON.parse(page.templateStructure);
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
            {/* Header custom elements */}
            {templateElements
              .filter((el: any) => el.position < 0)
              .sort((a: any, b: any) => a.position - b.position)
              .map((element: any, index: number) => (
              <div key={element.id || index} className="mb-4">
                {renderCustomElement(element)}
              </div>
            ))}

            {/* Show logo if configured */}
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

            {/* Show saved title and subtitle */}
            {formData.customTitle && formData.customTitle.trim() && (
              <h1 className="text-2xl font-bold mb-2">
                {formData.customTitle}
              </h1>
            )}
            
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

          {/* Form area */}
          <div className="w-full p-6 bg-white flex justify-center">
            <div className="w-full max-w-md">
              {/* Body elements */}
              {templateElements
                .filter((el: any) => el.position >= 0 && el.position < 100)
                .sort((a: any, b: any) => a.position - b.position)
                .map((element: any, index: number) => (
                  <div key={element.id || index} className="mb-4">
                    {renderCustomElement(element)}
                  </div>
                ))}

              {/* Form or PIX display */}
              {pixPayment ? (
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
              ) : !page.skipForm && (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="customerName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome completo</FormLabel>
                          <FormControl>
                            <Input {...field} />
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
                            <Input type="email" {...field} />
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
                            <Input {...field} />
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
                            <Input {...field} />
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

              {/* Footer elements */}
              {templateElements
                .filter((el: any) => el.position >= 100)
                .sort((a: any, b: any) => a.position - b.position)
                .map((element: any, index: number) => (
                  <div key={element.id || index} className="mt-4">
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
    } catch (error) {
      console.error("Error parsing template structure:", error);
    }
  }

  // Fallback to default layout if no template structure
  return (
    <div 
      className="min-h-screen w-full"
      style={{ backgroundColor: page.backgroundColor }}
    >
      {/* Header */}
      <div 
        className="w-full p-6 text-white text-center flex flex-col justify-center"
        style={{ 
          backgroundColor: page.primaryColor,
          height: `${page.headerHeight}px`
        }}
      >
        {/* Header custom elements */}
        {customElements.filter((el: any) => el.position < 0).map((element: any) => (
          <div key={element.id} className="mb-4">
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

        <div className="text-3xl font-bold">
          {formatCurrency(page.price)}
        </div>
      </div>

      {/* Form area */}
      <div className="w-full p-6 bg-white flex justify-center">
        <div className="w-full max-w-md">
          {/* Body elements */}
          {customElements
            .filter((el: any) => el.position >= 0 && el.position < 100)
            .sort((a: any, b: any) => a.position - b.position)
            .map((element: any) => (
              <div key={element.id} className="mb-4">
                {renderCustomElement(element)}
              </div>
            ))}

          {/* Form or PIX display */}
          {pixPayment ? (
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
          ) : !page.skipForm && (
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
                style={{ backgroundColor: page.accentColor }}
              >
                <QrCode className="w-5 h-5" />
                <span>{page.customButtonText}</span>
              </Button>
            </div>
          )}

          {/* Footer elements */}
          {customElements
            .filter((el: any) => el.position >= 100)
            .sort((a: any, b: any) => a.position - b.position)
            .map((element: any) => (
              <div key={element.id} className="mt-4">
                {renderCustomElement(element)}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}