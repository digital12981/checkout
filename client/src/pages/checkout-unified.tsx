import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { CreditCard, QrCode, ShieldCheck } from "lucide-react";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { formatCurrency, formatCpf, formatPhone } from "@/lib/utils";
import UnifiedTemplateRenderer from "@/components/unified-template-renderer";
import CheckoutLoading from "@/components/checkout-loading";

// Form schemas
const customerFormSchema = z.object({
  customerName: z.string().min(2, "Nome é obrigatório"),
  customerEmail: z.string().email("Email inválido"),
  customerCpf: z.string().min(11, "CPF inválido"),
  customerPhone: z.string().min(10, "Telefone inválido"),
  paymentMethod: z.enum(["PIX", "CREDIT_CARD"]),
});

const creditCardFormSchema = z.object({
  number: z.string().min(16, "Número do cartão inválido"),
  holder_name: z.string().min(2, "Nome do titular é obrigatório"),
  cvv: z.string().min(3, "CVV inválido"),
  expiration_month: z.string().min(2, "Mês de expiração inválido"),
  expiration_year: z.string().min(4, "Ano de expiração inválido"),
  installments: z.number().min(1).max(12).default(1),
});

const addressFormSchema = z.object({
  cep: z.string().min(8, "CEP inválido"),
  street: z.string().min(2, "Rua é obrigatória"),
  number: z.string().min(1, "Número é obrigatório"),
  complement: z.string().optional(),
  district: z.string().min(2, "Bairro é obrigatório"),
  city: z.string().min(2, "Cidade é obrigatória"),
  state: z.string().min(2, "Estado é obrigatório"),
});

type CustomerForm = z.infer<typeof customerFormSchema>;
type CreditCardForm = z.infer<typeof creditCardFormSchema>;
type AddressForm = z.infer<typeof addressFormSchema>;

interface Payment {
  id: number;
  pixCode?: string;
  pixQrCode?: string;
  cardToken?: string;
  status: string;
  transactionId: string;
}

export default function CheckoutUnified() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState<"customer" | "payment" | "success">("customer");
  const [customerData, setCustomerData] = useState<CustomerForm | null>(null);
  const [payment, setPayment] = useState<Payment | null>(null);

  // Fetch payment page
  const { data: page, isLoading } = useQuery({
    queryKey: [`/api/payment-pages/${id}`],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  // Customer form
  const customerForm = useForm<CustomerForm>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      paymentMethod: "PIX",
    },
  });

  // Credit card form
  const creditCardForm = useForm<CreditCardForm>({
    resolver: zodResolver(creditCardFormSchema),
    defaultValues: {
      installments: 1,
    },
  });

  // Address form
  const addressForm = useForm<AddressForm>({
    resolver: zodResolver(addressFormSchema),
  });

  // Create payment mutation
  const createPaymentMutation = useMutation({
    mutationFn: async (paymentData: any): Promise<Payment> => {
      const response = await apiRequest("/api/payments", "POST", paymentData);
      return response as Payment;
    },
    onSuccess: (paymentData: Payment) => {
      setPayment(paymentData);
      setCurrentStep("success");
    },
  });

  // Handle customer form submission
  const onCustomerSubmit = (data: CustomerForm) => {
    setCustomerData(data);
    if (data.paymentMethod === "PIX") {
      // For PIX, go directly to payment
      handlePaymentSubmission(data, null, null);
    } else {
      // For credit card, go to payment details step
      setCurrentStep("payment");
    }
  };

  // Handle payment submission
  const handlePaymentSubmission = async (
    customer: CustomerForm,
    creditCard: CreditCardForm | null,
    address: AddressForm | null
  ) => {
    const paymentData = {
      paymentPageId: parseInt(id!),
      customerName: customer.customerName,
      customerEmail: customer.customerEmail,
      customerCpf: customer.customerCpf.replace(/\D/g, ''),
      customerPhone: customer.customerPhone.replace(/\D/g, ''),
      paymentMethod: customer.paymentMethod,
      ...(creditCard && { creditCard }),
      ...(address && { address }),
    };

    createPaymentMutation.mutate(paymentData);
  };

  // Handle credit card form submission
  const onCreditCardSubmit = async () => {
    const creditCardData = creditCardForm.getValues();
    const addressData = addressForm.getValues();
    
    // Validate both forms
    const creditCardValid = await creditCardForm.trigger();
    const addressValid = await addressForm.trigger();
    
    if (creditCardValid && addressValid && customerData) {
      handlePaymentSubmission(customerData, creditCardData, addressData);
    }
  };

  if (isLoading) {
    return <CheckoutLoading pageId={id} />;
  }

  if (!page) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="p-6">
            <p>Página de pagamento não encontrada</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const customElements = page?.customElements ? JSON.parse(page.customElements) : [];

  return (
    <UnifiedTemplateRenderer 
      page={page!} 
      customElements={customElements}
      isEditor={false}
    >
      <div className="max-w-md mx-auto">
        {currentStep === "customer" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-center">Dados do Cliente</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={customerForm.handleSubmit(onCustomerSubmit)} className="space-y-4">
                <div>
                  <Label htmlFor="customerName">Nome completo</Label>
                  <Input
                    id="customerName"
                    {...customerForm.register("customerName")}
                    placeholder="Seu nome completo"
                  />
                  {customerForm.formState.errors.customerName && (
                    <p className="text-sm text-red-500 mt-1">
                      {customerForm.formState.errors.customerName.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="customerEmail">Email</Label>
                  <Input
                    id="customerEmail"
                    type="email"
                    {...customerForm.register("customerEmail")}
                    placeholder="seu@email.com"
                  />
                  {customerForm.formState.errors.customerEmail && (
                    <p className="text-sm text-red-500 mt-1">
                      {customerForm.formState.errors.customerEmail.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="customerCpf">CPF</Label>
                  <Input
                    id="customerCpf"
                    {...customerForm.register("customerCpf")}
                    placeholder="000.000.000-00"
                    onChange={(e) => {
                      const formatted = formatCpf(e.target.value);
                      customerForm.setValue("customerCpf", formatted);
                    }}
                  />
                  {customerForm.formState.errors.customerCpf && (
                    <p className="text-sm text-red-500 mt-1">
                      {customerForm.formState.errors.customerCpf.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="customerPhone">Telefone</Label>
                  <Input
                    id="customerPhone"
                    {...customerForm.register("customerPhone")}
                    placeholder="(00) 00000-0000"
                    onChange={(e) => {
                      const formatted = formatPhone(e.target.value);
                      customerForm.setValue("customerPhone", formatted);
                    }}
                  />
                  {customerForm.formState.errors.customerPhone && (
                    <p className="text-sm text-red-500 mt-1">
                      {customerForm.formState.errors.customerPhone.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label>Forma de Pagamento</Label>
                  <RadioGroup
                    value={customerForm.watch("paymentMethod")}
                    onValueChange={(value) => customerForm.setValue("paymentMethod", value as "PIX" | "CREDIT_CARD")}
                    className="mt-2"
                  >
                    <div className="flex items-center space-x-2 p-3 border rounded-lg">
                      <RadioGroupItem value="PIX" id="pix" />
                      <QrCode className="w-5 h-5" />
                      <label htmlFor="pix" className="flex-1 cursor-pointer">
                        PIX - Pagamento instantâneo
                      </label>
                    </div>
                    <div className="flex items-center space-x-2 p-3 border rounded-lg">
                      <RadioGroupItem value="CREDIT_CARD" id="credit" />
                      <CreditCard className="w-5 h-5" />
                      <label htmlFor="credit" className="flex-1 cursor-pointer">
                        Cartão de Crédito - Até 12x
                      </label>
                    </div>
                  </RadioGroup>
                </div>

                <Button 
                  type="submit" 
                  className="w-full" 
                  style={{ backgroundColor: page?.primaryColor || "#3B82F6" }}
                  disabled={createPaymentMutation.isPending}
                >
                  {createPaymentMutation.isPending ? "Processando..." : "Continuar"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {currentStep === "payment" && customerData?.paymentMethod === "CREDIT_CARD" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-center">Dados do Cartão</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="card" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="card">Cartão</TabsTrigger>
                  <TabsTrigger value="address">Endereço</TabsTrigger>
                </TabsList>
                
                <TabsContent value="card" className="space-y-4">
                  <div>
                    <Label htmlFor="number">Número do Cartão</Label>
                    <Input
                      id="number"
                      {...creditCardForm.register("number")}
                      placeholder="0000 0000 0000 0000"
                      maxLength={19}
                    />
                  </div>

                  <div>
                    <Label htmlFor="holder_name">Nome no Cartão</Label>
                    <Input
                      id="holder_name"
                      {...creditCardForm.register("holder_name")}
                      placeholder="Nome como está no cartão"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="expiration_month">Mês</Label>
                      <Input
                        id="expiration_month"
                        {...creditCardForm.register("expiration_month")}
                        placeholder="MM"
                        maxLength={2}
                      />
                    </div>
                    <div>
                      <Label htmlFor="expiration_year">Ano</Label>
                      <Input
                        id="expiration_year"
                        {...creditCardForm.register("expiration_year")}
                        placeholder="AAAA"
                        maxLength={4}
                      />
                    </div>
                    <div>
                      <Label htmlFor="cvv">CVV</Label>
                      <Input
                        id="cvv"
                        {...creditCardForm.register("cvv")}
                        placeholder="000"
                        maxLength={4}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="installments">Parcelas</Label>
                    <select
                      id="installments"
                      {...creditCardForm.register("installments", { valueAsNumber: true })}
                      className="w-full p-2 border rounded-md"
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((num) => (
                        <option key={num} value={num}>
                          {num}x de {formatCurrency(parseFloat(page?.price || "0") / num)}
                        </option>
                      ))}
                    </select>
                  </div>
                </TabsContent>

                <TabsContent value="address" className="space-y-4">
                  <div>
                    <Label htmlFor="cep">CEP</Label>
                    <Input
                      id="cep"
                      {...addressForm.register("cep")}
                      placeholder="00000-000"
                    />
                  </div>

                  <div>
                    <Label htmlFor="street">Rua</Label>
                    <Input
                      id="street"
                      {...addressForm.register("street")}
                      placeholder="Nome da rua"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="number">Número</Label>
                      <Input
                        id="number"
                        {...addressForm.register("number")}
                        placeholder="123"
                      />
                    </div>
                    <div>
                      <Label htmlFor="complement">Complemento</Label>
                      <Input
                        id="complement"
                        {...addressForm.register("complement")}
                        placeholder="Apto, Bloco..."
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="district">Bairro</Label>
                    <Input
                      id="district"
                      {...addressForm.register("district")}
                      placeholder="Nome do bairro"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="city">Cidade</Label>
                      <Input
                        id="city"
                        {...addressForm.register("city")}
                        placeholder="Nome da cidade"
                      />
                    </div>
                    <div>
                      <Label htmlFor="state">Estado</Label>
                      <Input
                        id="state"
                        {...addressForm.register("state")}
                        placeholder="SP"
                        maxLength={2}
                      />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <Separator className="my-4" />

              <div className="flex gap-4">
                <Button 
                  variant="outline" 
                  onClick={() => setCurrentStep("customer")}
                  className="flex-1"
                >
                  Voltar
                </Button>
                <Button 
                  onClick={onCreditCardSubmit}
                  className="flex-1"
                  style={{ backgroundColor: page?.primaryColor || "#3B82F6" }}
                  disabled={createPaymentMutation.isPending}
                >
                  {createPaymentMutation.isPending ? "Processando..." : "Finalizar Pagamento"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === "success" && payment && (
          <Card>
            <CardHeader>
              <CardTitle className="text-center text-green-600">
                <ShieldCheck className="w-8 h-8 mx-auto mb-2" />
                Pagamento Criado!
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              {payment.pixCode && (
                <div>
                  <p className="text-sm text-gray-600 mb-2">Código PIX:</p>
                  <div className="p-3 bg-gray-100 rounded-lg font-mono text-sm break-all">
                    {payment.pixCode}
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => navigator.clipboard.writeText(payment.pixCode!)}
                    className="mt-2"
                  >
                    Copiar Código PIX
                  </Button>
                </div>
              )}

              {payment.pixQrCode && (
                <div>
                  <p className="text-sm text-gray-600 mb-2">QR Code:</p>
                  <img 
                    src={payment.pixQrCode} 
                    alt="QR Code PIX" 
                    className="mx-auto max-w-xs"
                  />
                </div>
              )}

              {payment.cardToken && (
                <div>
                  <p className="text-green-600">Pagamento processado com cartão de crédito!</p>
                  <p className="text-sm text-gray-600">ID: {payment.transactionId}</p>
                </div>
              )}

              <Button 
                onClick={() => setLocation(`/chat/${id}`)}
                className="w-full"
                style={{ backgroundColor: page?.primaryColor || "#3B82F6" }}
              >
                Continuar
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </UnifiedTemplateRenderer>
  );
}