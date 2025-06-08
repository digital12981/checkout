import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  ShoppingBag, 
  QrCode, 
  Copy, 
  Check, 
  Clock, 
  Info,
  X
} from "lucide-react";
import { formatCurrency, formatCpf, copyToClipboard, cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { PaymentPage, PixPayment } from "@shared/schema";

const customerFormSchema = z.object({
  customerName: z.string().min(1, "Nome é obrigatório"),
  customerEmail: z.string().email("Email inválido"),
  customerCpf: z.string().min(11, "CPF é obrigatório"),
  customerPhone: z.string().optional(),
});

type CustomerForm = z.infer<typeof customerFormSchema>;

export default function Checkout() {
  const { id } = useParams<{ id: string }>();
  const [pixPayment, setPixPayment] = useState<PixPayment | null>(null);
  const [copied, setCopied] = useState(false);
  const [isGeneratingPayment, setIsGeneratingPayment] = useState(false);
  const { toast } = useToast();

  const { data: page, isLoading, error } = useQuery<PaymentPage>({
    queryKey: [`/api/payment-pages/${id}`],
    enabled: !!id,
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
        paymentPageId: parseInt(id!),
        ...data,
      });
      return response.json();
    },
    onSuccess: (payment: PixPayment) => {
      setPixPayment(payment);
      setIsGeneratingPayment(false);
    },
    onError: (error) => {
      setIsGeneratingPayment(false);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao processar pagamento",
        variant: "destructive",
      });
    },
  });

  const handleCopyPixCode = async () => {
    if (pixPayment?.pixCode) {
      try {
        await copyToClipboard(pixPayment.pixCode);
        setCopied(true);
        toast({
          title: "Código copiado!",
          description: "O código PIX foi copiado para a área de transferência.",
        });
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        toast({
          title: "Erro",
          description: "Falha ao copiar código PIX",
          variant: "destructive",
        });
      }
    }
  };

  const onSubmit = (data: CustomerForm) => {
    createPaymentMutation.mutate(data);
  };

  const getCustomStyles = (page: any) => {
    return {
      primaryColor: page.primaryColor || "#3B82F6",
      accentColor: page.accentColor || "#10B981", 
      backgroundColor: page.backgroundColor || "#F8FAFC",
      textColor: page.textColor || "#1F2937"
    };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-900 bg-opacity-95 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="space-y-4">
              <Skeleton className="h-20 w-20 rounded-full mx-auto" />
              <Skeleton className="h-8 w-3/4 mx-auto" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-16" />
              <div className="space-y-2">
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading screen when generating payment with skipForm
  if (isGeneratingPayment && page?.skipForm) {
    const customStyles = getCustomStyles(page);
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="text-center">
          {/* Logo */}
          {page.showLogo !== false && (
            <div className="mb-6 flex justify-center">
              {page.logoUrl ? (
                <img 
                  src={page.logoUrl} 
                  alt="Logo" 
                  className="object-contain rounded"
                  style={{ width: `${page.logoSize || 64}px`, height: `${page.logoSize || 64}px` }}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <div 
                  className="bg-gray-200 rounded-full flex items-center justify-center"
                  style={{ 
                    width: `${page.logoSize || 64}px`, 
                    height: `${page.logoSize || 64}px`,
                    backgroundColor: customStyles.primaryColor + '20'
                  }}
                >
                  <ShoppingBag 
                    className="w-8 h-8" 
                    style={{ color: customStyles.primaryColor }}
                  />
                </div>
              )}
            </div>
          )}
          
          {/* Spinner */}
          <div className="mb-4">
            <div 
              className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto"
              style={{ borderColor: customStyles.primaryColor }}
            ></div>
          </div>
          
          {/* Status Text */}
          <p 
            className="text-lg font-medium"
            style={{ color: customStyles.textColor }}
          >
            Gerando pagamento...
          </p>
        </div>
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="min-h-screen bg-neutral-900 bg-opacity-95 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <X className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-neutral-800 mb-2">
              Página não encontrada
            </h1>
            <p className="text-neutral-600">
              A página de pagamento que você está procurando não existe ou foi removida.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const customStyles = getCustomStyles(page);

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: customStyles.backgroundColor }}
    >
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div 
          className="p-6 text-white text-center rounded-t-xl"
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
        </div>



        {/* Customer Form - only show if skipForm is disabled */}
        {!pixPayment && !page.skipForm && (
          <CardContent className="p-6">

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="customerName"
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
                  name="customerEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-mail</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="seu@email.com" {...field} />
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
                          placeholder="000.000.000-00" 
                          {...field}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '');
                            if (value.length <= 11) {
                              field.onChange(formatCpf(value));
                            }
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
                      <FormLabel>Telefone (opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="(11) 99999-9999" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  disabled={createPaymentMutation.isPending}
                  className="w-full text-white py-3 font-medium flex items-center justify-center space-x-2"
                  style={{ backgroundColor: customStyles.accentColor }}
                >
                  <QrCode className="w-5 h-5" />
                  <span>
                    {createPaymentMutation.isPending ? "Gerando PIX..." : (page.customButtonText || "Pagar com PIX")}
                  </span>
                </Button>
              </form>
            </Form>
          </CardContent>
        )}

        {/* PIX Payment Section */}
        {pixPayment && (
          <CardContent className="p-6 border-t border-neutral-200">
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
                Escaneie o QR Code com seu app de pagamento
              </p>
            </div>

            {/* PIX Code */}
            <div className="bg-neutral-50 rounded-lg p-4 mb-4">
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Código PIX (Copia e Cola)
              </label>
              <div className="space-y-3">
                <Input
                  readOnly
                  value={pixPayment.pixCode || ""}
                  className="text-sm font-mono bg-white"
                />
                <Button
                  onClick={handleCopyPixCode}
                  className={cn(
                    "w-full py-3",
                    copied 
                      ? "bg-secondary text-white" 
                      : "bg-primary text-white hover:bg-primary/90"
                  )}
                >
                  {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                  {copied ? "Código Copiado!" : "Copiar Código PIX"}
                </Button>
              </div>
            </div>

            {/* Instructions */}
            <Alert className="mb-4">
              <Info className="w-4 h-4" />
              <AlertDescription>
                <div className="text-sm">
                  <p className="font-medium text-primary mb-1">Como pagar:</p>
                  <ol className="text-neutral-700 space-y-1 list-decimal list-inside">
                    <li>Escaneie o QR Code ou copie o código PIX</li>
                    <li>Abra seu app bancário</li>
                    <li>Cole o código ou use a câmera</li>
                    <li>Confirme o pagamento</li>
                  </ol>
                </div>
              </AlertDescription>
            </Alert>

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
          </CardContent>
        )}
      </Card>
    </div>
  );
}
