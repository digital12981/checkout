import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import { Clock, QrCode, Copy, ShoppingBag } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useEffect, useState } from "react";
import type { PaymentPage, PixPayment } from "@shared/schema";

const customerFormSchema = z.object({
  customerName: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  customerEmail: z.string().email("Email inválido"),
  customerCpf: z.string().min(11, "CPF deve ter 11 dígitos").max(11, "CPF deve ter 11 dígitos"),
  customerPhone: z.string().min(10, "Telefone deve ter pelo menos 10 dígitos"),
});

type CustomerForm = z.infer<typeof customerFormSchema>;

export default function Checkout() {
  const params = useParams();
  const pageId = params.id;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [pixPayment, setPixPayment] = useState<PixPayment | null>(null);
  const [isGeneratingPayment, setIsGeneratingPayment] = useState(false);

  const { data: page, isLoading: pageLoading, error } = useQuery<PaymentPage>({
    queryKey: [`/api/payment-pages/${pageId}`],
    enabled: !!pageId,
  });



  const form = useForm<CustomerForm>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      customerName: "",
      customerEmail: "",
      customerCpf: "",
      customerPhone: "",
    },
  });

  // Function to extract customer data from URL parameters
  const getCustomerDataFromURL = () => {
    let searchParams = window.location.search;
    
    // Handle encoded URLs where %3F is used instead of ?
    if (!searchParams && window.location.pathname.includes('%3F')) {
      const pathParts = window.location.pathname.split('%3F');
      if (pathParts.length > 1) {
        searchParams = '?' + decodeURIComponent(pathParts[1]);
      }
    }
    
    // Also handle the case where the full URL is encoded
    if (!searchParams && window.location.href.includes('%3F')) {
      const urlParts = window.location.href.split('%3F');
      if (urlParts.length > 1) {
        searchParams = '?' + decodeURIComponent(urlParts[1]);
      }
    }
    
    const urlParams = new URLSearchParams(searchParams);
    return {
      customerName: urlParams.get('nome') || '',
      customerEmail: urlParams.get('email') || '',
      customerCpf: urlParams.get('cpf') || '',
      customerPhone: urlParams.get('telefone') || '',
    };
  };

  // Auto-generate payment when skipForm is enabled and we have URL parameters
  useEffect(() => {
    // Only proceed if we have a page loaded and skipForm is enabled
    if (!page || !page.skipForm) return;
    
    // Check if we have customer data in URL parameters
    const customerData = getCustomerDataFromURL();
    const hasRequiredData = customerData.customerName && customerData.customerEmail && customerData.customerCpf;
    
    // Generate payment if we have required data and haven't generated one yet
    if (hasRequiredData && !pixPayment && !isGeneratingPayment) {
      setIsGeneratingPayment(true);
      createPaymentMutation.mutate(customerData);
    }
  }, [page, pixPayment, isGeneratingPayment]);

  const createPaymentMutation = useMutation({
    mutationFn: async (data: CustomerForm) => {
      const response = await apiRequest("POST", "/api/pix-payments", {
        paymentPageId: Number(pageId),
        ...data,
      });
      return response.json ? await response.json() : response;
    },
    onSuccess: (payment: PixPayment) => {
      setPixPayment(payment);
      setIsGeneratingPayment(false);
      toast({
        title: "PIX gerado com sucesso!",
        description: "Escaneie o QR Code ou copie o código PIX para pagar.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/pix-payments"] });
    },
    onError: (error: any) => {
      setIsGeneratingPayment(false);
      toast({
        title: "Erro ao gerar PIX",
        description: error.message || "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CustomerForm) => {
    createPaymentMutation.mutate(data);
  };

  const copyPixCode = async () => {
    if (pixPayment?.pixCode) {
      try {
        await navigator.clipboard.writeText(pixPayment.pixCode);
        toast({
          title: "Código PIX copiado!",
          description: "Cole no seu app do banco para pagar.",
        });
      } catch (error) {
        toast({
          title: "Erro ao copiar",
          description: "Tente selecionar e copiar manualmente.",
          variant: "destructive",
        });
      }
    }
  };

  const getCustomStyles = (page: PaymentPage) => {
    return {
      primaryColor: page.primaryColor || "#2563eb",
      accentColor: page.accentColor || "#1d4ed8", 
      backgroundColor: page.backgroundColor || "#f8fafc",
      textColor: page.textColor || "#1f2937",
    };
  };

  if (pageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-neutral-600">Carregando página...</p>
        </div>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-neutral-800 mb-2">Página não encontrada</h1>
          <p className="text-neutral-600">A página de pagamento que você está procurando não existe.</p>
        </div>
      </div>
    );
  }

  // Show loading screen when generating payment for skipForm
  if (page.skipForm && isGeneratingPayment && !pixPayment) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: getCustomStyles(page).backgroundColor }}
      >
        <div className="text-center">
          {page.logoUrl && (
            <img 
              src={page.logoUrl} 
              alt="Logo" 
              className="w-20 h-20 object-contain mx-auto mb-6"
            />
          )}
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg font-medium text-neutral-800">Gerando pagamento...</p>
          <p className="text-sm text-neutral-600 mt-2">Aguarde um momento</p>
        </div>
      </div>
    );
  }

  const customStyles = getCustomStyles(page);

  return (
    <div 
      className="min-h-screen w-full"
      style={{ backgroundColor: customStyles.backgroundColor }}
    >
      {/* Header */}
      <div 
        className="w-full p-6 text-white text-center"
        style={{ backgroundColor: customStyles.primaryColor }}
      >
        {page.showLogo !== false && (
          <div className={`mb-4 flex ${page.logoPosition === 'left' ? 'justify-start' : page.logoPosition === 'right' ? 'justify-end' : 'justify-center'}`}>
            {page.logoUrl ? (
              <img 
                src={page.logoUrl} 
                alt="Logo" 
                className="w-16 h-16 object-contain rounded"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                <ShoppingBag className="w-8 h-8" />
              </div>
            )}
          </div>
        )}
        
        <h1 className="text-2xl font-bold mb-2">
          {page.customTitle || page.productName}
        </h1>
        
        {page.customSubtitle && (
          <p className="text-white/90 mb-2">
            {page.customSubtitle}
          </p>
        )}
        
        {page.productDescription && (
          <p className="text-white/80 text-sm mb-4">
            {page.productDescription}
          </p>
        )}
        
        <div className="text-3xl font-bold">
          {formatCurrency(page.price)}
        </div>
      </div>

      {/* Customer Form - only show if skipForm is disabled */}
      {!pixPayment && !page.skipForm && (
        <div className="w-full max-w-2xl mx-auto p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="customerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Completo</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Digite seu nome completo" 
                        {...field} 
                      />
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
                      <Input 
                        type="email"
                        placeholder="Digite seu email" 
                        {...field} 
                      />
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
                        placeholder="Digite seu CPF (apenas números)" 
                        value={field.value}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '').slice(0, 11);
                          field.onChange(value);
                        }}
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
                      <Input 
                        placeholder="Digite seu telefone" 
                        {...field} 
                      />
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
        </div>
      )}

      {/* PIX Payment Section */}
      {pixPayment && (
        <div className="w-full max-w-2xl mx-auto p-6">
          <h3 className="font-semibold text-neutral-800 mb-4 text-center">
            Pagamento PIX
          </h3>

          {/* QR Code */}
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

          {/* PIX Code */}
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

          {/* Payment Details */}
          <div className="bg-neutral-50 rounded-lg p-4 mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-neutral-600">Valor:</span>
              <span className="font-semibold" style={{ color: customStyles.textColor }}>
                {formatCurrency(page.price)}
              </span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-neutral-600">Produto:</span>
              <span className="font-medium" style={{ color: customStyles.textColor }}>
                {page.productName}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-neutral-600">Cliente:</span>
              <span className="font-medium" style={{ color: customStyles.textColor }}>
                {pixPayment.customerName}
              </span>
            </div>
          </div>

          {/* Custom Instructions */}
          {page.customInstructions && (
            <div className="mb-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm" style={{ color: customStyles.textColor }}>
                {page.customInstructions}
              </p>
            </div>
          )}

          {/* Payment Status */}
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
  );
}