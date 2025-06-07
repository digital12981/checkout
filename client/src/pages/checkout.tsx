import { useState } from "react";
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
    },
    onError: (error) => {
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
          {page.showProductImage !== false && (
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="w-8 h-8" />
            </div>
          )}
          <h1 className="text-xl font-bold mb-2">
            {page.customTitle || page.productName}
          </h1>
          {(page.customSubtitle || page.productDescription) && (
            <p className="text-white/90 text-sm">
              {page.customSubtitle || page.productDescription}
            </p>
          )}
        </div>

        {/* Price */}
        <div className="px-6 py-4 bg-neutral-50 border-b border-neutral-200">
          <div className="text-center">
            <span className="text-sm text-neutral-600">Valor único</span>
            <div className="text-3xl font-bold text-neutral-800 mt-1">
              {formatCurrency(page.price)}
            </div>
          </div>
        </div>

        {/* Customer Form */}
        {!pixPayment && (
          <CardContent className="p-6">
            <h3 className="font-semibold text-neutral-800 mb-4">Dados para pagamento</h3>
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
