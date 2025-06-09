import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { formatCpf } from "@/lib/utils";
import CheckoutRenderer from "@/components/checkout-renderer";

const customerFormSchema = z.object({
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  cpf: z.string().min(11, "CPF deve ter 11 dígitos"),
  telefone: z.string().min(10, "Telefone deve ter pelo menos 10 dígitos"),
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
  const params = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [pixPayment, setPixPayment] = useState<PixPayment | null>(null);

  const pageId = parseInt(params.id || "0");

  // Get URL parameters for auto-fill
  const urlParams = new URLSearchParams(window.location.search);
  const autoFillData = {
    nome: urlParams.get("nome") || "",
    email: urlParams.get("email") || "",
    cpf: urlParams.get("cpf") || "",
    telefone: urlParams.get("telefone") || "",
  };

  console.log("Auto-fill data:", autoFillData);

  const form = useForm<CustomerForm>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: autoFillData,
  });

  const { data: page, isLoading: pageLoading } = useQuery({
    queryKey: [`/api/payment-pages/${pageId}`],
    enabled: pageId > 0,
  });

  console.log("Page skipForm:", page?.skipForm);

  const pixExists = pixPayment !== null;
  console.log("PIX payment exists:", pixExists);

  const createPaymentMutation = useMutation({
    mutationFn: async (data: CustomerForm) => {
      const response = await fetch("/api/pix-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          pageId: pageId,
          amount: page?.price || "0",
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro ao criar pagamento: ${errorText}`);
      }

      return response.json();
    },
    onSuccess: (payment: PixPayment) => {
      setPixPayment(payment);
      toast({
        title: "Pagamento criado!",
        description: "Use o QR Code ou código PIX para completar o pagamento.",
      });
    },
    onError: (error) => {
      console.error("Payment creation error:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao processar pagamento",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CustomerForm) => {
    createPaymentMutation.mutate(data);
  };

  // Auto-submit if skip form is enabled and all required data is present
  useEffect(() => {
    if (
      page?.skipForm &&
      autoFillData.nome &&
      autoFillData.email &&
      autoFillData.cpf &&
      autoFillData.telefone &&
      !pixPayment &&
      !createPaymentMutation.isPending
    ) {
      console.log("Auto-submitting form with URL parameters");
      createPaymentMutation.mutate(autoFillData);
    }
  }, [page, autoFillData, pixPayment, createPaymentMutation]);

  if (pageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Carregando página...</p>
        </div>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Página não encontrada</h1>
          <p>A página de pagamento solicitada não existe.</p>
        </div>
      </div>
    );
  }

  // Form content for when payment hasn't been created yet
  const formContent = !pixPayment ? (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="nome">Nome completo</Label>
        <Input
          id="nome"
          placeholder="Digite seu nome completo"
          {...form.register("nome")}
          className="mt-1"
        />
        {form.formState.errors.nome && (
          <p className="text-red-500 text-sm mt-1">
            {form.formState.errors.nome.message}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          type="email"
          placeholder="seu@email.com"
          {...form.register("email")}
          className="mt-1"
        />
        {form.formState.errors.email && (
          <p className="text-red-500 text-sm mt-1">
            {form.formState.errors.email.message}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="cpf">CPF</Label>
        <Input
          id="cpf"
          placeholder="000.000.000-00"
          {...form.register("cpf")}
          onChange={(e) => {
            const formatted = formatCpf(e.target.value);
            form.setValue("cpf", formatted);
          }}
          className="mt-1"
        />
        {form.formState.errors.cpf && (
          <p className="text-red-500 text-sm mt-1">
            {form.formState.errors.cpf.message}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="telefone">Telefone</Label>
        <Input
          id="telefone"
          placeholder="(11) 99999-9999"
          {...form.register("telefone")}
          className="mt-1"
        />
        {form.formState.errors.telefone && (
          <p className="text-red-500 text-sm mt-1">
            {form.formState.errors.telefone.message}
          </p>
        )}
      </div>

      <Button
        type="submit"
        disabled={createPaymentMutation.isPending}
        className="w-full text-white py-3 font-medium flex items-center justify-center space-x-2"
        style={{ backgroundColor: page.accentColor }}
      >
        {createPaymentMutation.isPending ? (
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
        ) : (
          <>
            <QrCode className="w-5 h-5" />
            <span>{page.customButtonText || "Pagar com PIX"}</span>
          </>
        )}
      </Button>
    </form>
  ) : null;

  return (
    <CheckoutRenderer 
      page={page} 
      pixPayment={pixPayment} 
      formContent={formContent}
    />
  );
}