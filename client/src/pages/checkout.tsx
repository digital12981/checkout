import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { QrCode, Copy, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatCpf, copyToClipboard } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";

const customerFormSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  cpf: z.string().min(11, "CPF deve ter 11 dígitos").max(14, "CPF inválido"),
  phone: z.string().min(10, "Telefone deve ter pelo menos 10 dígitos"),
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
  const [location] = useLocation();
  const pageId = location.split("/").pop();
  const [pixPayment, setPixPayment] = useState<PixPayment | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  // Get URL parameters for skip form functionality
  const urlParams = new URLSearchParams(window.location.search);
  const skipFormData = {
    name: urlParams.get('name') || '',
    email: urlParams.get('email') || '',
    cpf: urlParams.get('cpf') || '',
    phone: urlParams.get('phone') || ''
  };

  const { data: page, isLoading } = useQuery({
    queryKey: ["/api/payment-pages", pageId],
    enabled: !!pageId,
  });

  const form = useForm<CustomerForm>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      name: skipFormData.name,
      email: skipFormData.email,
      cpf: skipFormData.cpf,
      phone: skipFormData.phone,
    },
  });

  const pixMutation = useMutation({
    mutationFn: async (data: CustomerForm) => {
      const response = await apiRequest(`/api/pix-payments`, {
        method: "POST",
        body: JSON.stringify({
          paymentPageId: parseInt(pageId!),
          customerName: data.name,
          customerEmail: data.email,
          customerCpf: data.cpf,
          customerPhone: data.phone,
          amount: parseFloat(page.price),
        }),
      });
      return response.json();
    },
    onSuccess: (payment: PixPayment) => {
      setPixPayment(payment);
    },
  });

  const onSubmit = (data: CustomerForm) => {
    pixMutation.mutate(data);
  };

  const renderCustomElement = (element: CustomElement) => {
    const baseStyles = {
      color: element.styles.color,
      backgroundColor: element.styles.backgroundColor,
      padding: element.styles.padding,
      borderRadius: element.styles.borderRadius ? `${element.styles.borderRadius}px` : undefined,
      fontSize: element.styles.fontSize ? `${element.styles.fontSize}px` : undefined,
      textAlign: element.styles.textAlign,
      border: element.styles.border,
      marginBottom: element.styles.marginBottom,
      marginTop: element.styles.marginTop,
      fontWeight: element.styles.fontWeight || (element.styles.isBold ? 'bold' : undefined),
      lineHeight: element.styles.lineHeight,
      borderTop: element.styles.borderTop,
    };

    if (element.type === "image") {
      return (
        <div style={baseStyles} className="flex justify-center">
          <img 
            src={element.content} 
            alt="" 
            className="object-contain"
            style={{ 
              width: element.styles.imageSize ? `${element.styles.imageSize}px` : '100px',
              height: 'auto'
            }}
          />
        </div>
      );
    }

    return (
      <div 
        style={baseStyles}
        dangerouslySetInnerHTML={{ __html: element.content }}
      />
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Página não encontrada
          </h1>
          <p className="text-gray-600">
            A página de pagamento solicitada não foi encontrada.
          </p>
        </div>
      </div>
    );
  }

  // Always use saved template structure if available
  let templateData = null;
  if (page.templateStructure) {
    try {
      templateData = JSON.parse(page.templateStructure);
    } catch (error) {
      console.error("Error parsing template structure:", error);
    }
  }

  // If we have template data, render using the saved template
  if (templateData) {
    const { formData, customElements: templateElements, renderSettings } = templateData;
    
    return (
      <div 
        className="min-h-screen w-full"
        style={{ backgroundColor: renderSettings.backgroundColor || "#F0F8FF" }}
      >
        {/* Header with exact template structure */}
        <div 
          className="w-full p-6 text-white text-center flex flex-col justify-center"
          style={{ 
            backgroundColor: renderSettings.primaryColor || "#003D7A",
            height: `${renderSettings.headerHeight || 96}px`
          }}
        >
          {/* Top custom elements */}
          {templateElements
            .filter((el: any) => el.position === "top" || el.position < 0)
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
                style={{ width: `${renderSettings.logoSize || 64}px`, height: `${renderSettings.logoSize || 64}px` }}
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
            {formatCurrency(formData.price)}
          </div>
        </div>

        {/* Form area */}
        <div className="w-full p-6 bg-white flex justify-center">
          <div className="w-full max-w-md">
            {/* Middle custom elements */}
            {templateElements
              .filter((el: any) => el.position === "middle" || (el.position >= 0 && el.position < 100))
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
                    onClick={async () => {
                      try {
                        await copyToClipboard(pixPayment.pixCode);
                        setCopySuccess(true);
                        setTimeout(() => setCopySuccess(false), 2000);
                      } catch (error) {
                        console.error("Failed to copy:", error);
                      }
                    }}
                    className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                  >
                    {copySuccess ? (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copiar código PIX
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Check if should skip form and auto-generate PIX */}
                {formData.skipForm && skipFormData.name && skipFormData.email && skipFormData.cpf && skipFormData.phone ? (
                  <div className="text-center">
                    <p className="mb-4">Gerando seu PIX...</p>
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    {/* Auto-submit form */}
                    {(() => {
                      setTimeout(() => {
                        pixMutation.mutate({
                          name: skipFormData.name,
                          email: skipFormData.email,
                          cpf: skipFormData.cpf,
                          phone: skipFormData.phone,
                        });
                      }, 1000);
                      return null;
                    })()}
                  </div>
                ) : (
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome completo</FormLabel>
                            <FormControl>
                              <Input placeholder="Seu nome completo" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="seu@email.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="cpf"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>CPF</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="000.000.000-00" 
                                {...field}
                                onChange={(e) => {
                                  const formatted = formatCpf(e.target.value);
                                  field.onChange(formatted);
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Telefone</FormLabel>
                            <FormControl>
                              <Input placeholder="(11) 99999-9999" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button 
                        type="submit" 
                        className="w-full"
                        style={{ 
                          backgroundColor: renderSettings.accentColor || "#FFFFFF",
                          color: renderSettings.primaryColor || "#003D7A"
                        }}
                        disabled={pixMutation.isPending}
                      >
                        {pixMutation.isPending ? "Gerando PIX..." : (formData.customButtonText || "Gerar PIX")}
                      </Button>
                    </form>
                  </Form>
                )}
              </>
            )}

            {/* Bottom custom elements */}
            {templateElements
              .filter((el: any) => el.position === "bottom" || el.position >= 100)
              .map((element: any, index: number) => (
                <div key={element.id || index} className="mb-4">
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
  }

  // Fallback to basic layout if no template structure
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {page.productName}
            </h1>
            <div className="text-3xl font-bold text-blue-600">
              {formatCurrency(page.price)}
            </div>
          </div>

          {pixPayment ? (
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-48 h-48 bg-white border-2 border-gray-200 rounded-lg mx-auto flex items-center justify-center mb-4">
                  {pixPayment.pixQrCode ? (
                    <img 
                      src={pixPayment.pixQrCode} 
                      alt="QR Code PIX" 
                      className="w-40 h-40 object-contain"
                    />
                  ) : (
                    <QrCode className="w-16 h-16 text-gray-400" />
                  )}
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">Código PIX:</p>
                <div className="bg-white p-3 rounded border text-xs font-mono break-all">
                  {pixPayment.pixCode}
                </div>
              </div>
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome completo</FormLabel>
                      <FormControl>
                        <Input placeholder="Seu nome completo" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="seu@email.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cpf"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CPF</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="000.000.000-00" 
                          {...field}
                          onChange={(e) => {
                            const formatted = formatCpf(e.target.value);
                            field.onChange(formatted);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone</FormLabel>
                      <FormControl>
                        <Input placeholder="(11) 99999-9999" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={pixMutation.isPending}
                >
                  {pixMutation.isPending ? "Gerando PIX..." : "Gerar PIX"}
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}