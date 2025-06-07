import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import type { PaymentPage } from "@shared/schema";
import { 
  ArrowLeft,
  Save,
  Eye,
  Palette,
  Type,
  Layout,
  Settings,
  ShoppingBag,
  QrCode,
  Copy,
  Check,
  Info,
  Clock
} from "lucide-react";

const editPageSchema = z.object({
  productName: z.string().min(1, "Nome do produto é obrigatório"),
  productDescription: z.string().optional(),
  price: z.string().min(1, "Preço é obrigatório"),
  
  // Colors
  primaryColor: z.string().min(1, "Cor primária é obrigatória"),
  accentColor: z.string().min(1, "Cor de destaque é obrigatória"),
  backgroundColor: z.string().min(1, "Cor de fundo é obrigatória"),
  textColor: z.string().min(1, "Cor do texto é obrigatória"),
  
  // Custom texts
  customTitle: z.string().optional(),
  customSubtitle: z.string().optional(),
  customButtonText: z.string().min(1, "Texto do botão é obrigatório"),
  customInstructions: z.string().optional(),
  
  // Layout options
  showLogo: z.boolean(),
  logoUrl: z.string().optional(),
  logoPosition: z.enum(["left", "center", "right"]),
  
  // Custom elements
  customElements: z.string().default("[]"),
});

type EditPageForm = z.infer<typeof editPageSchema>;

export default function EditPage() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const [activeStep, setActiveStep] = useState<"form" | "payment">("form");
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const pageId = parseInt(params.id || "0");

  const { data: page, isLoading } = useQuery<PaymentPage>({
    queryKey: [`/api/payment-pages/${pageId}`],
    enabled: pageId > 0,
  });

  const form = useForm<EditPageForm>({
    resolver: zodResolver(editPageSchema),
    defaultValues: {
      productName: "",
      productDescription: "",
      price: "",
      primaryColor: "#3B82F6",
      accentColor: "#10B981",
      backgroundColor: "#F8FAFC",
      textColor: "#1F2937",
      customTitle: "",
      customSubtitle: "",
      customButtonText: "Pagar com PIX",
      customInstructions: "",
      showLogo: true,
      logoUrl: "",
      logoPosition: "center" as const,
      customElements: "[]",
    },
  });

  // Load page data
  useEffect(() => {
    if (page) {
      form.reset({
        productName: page.productName,
        productDescription: page.productDescription || "",
        price: page.price,
        primaryColor: page.primaryColor || "#3B82F6",
        accentColor: page.accentColor || "#10B981",
        backgroundColor: page.backgroundColor || "#F8FAFC",
        textColor: page.textColor || "#1F2937",
        customTitle: page.customTitle || "",
        customSubtitle: page.customSubtitle || "",
        customButtonText: page.customButtonText || "Pagar com PIX",
        customInstructions: page.customInstructions || "",
        showLogo: page.showLogo ?? true,
        logoUrl: page.logoUrl || "",
        logoPosition: (page.logoPosition as "left" | "center" | "right") || "center",
        customElements: page.customElements || "[]",
      });
    }
  }, [page, form]);

  const updatePageMutation = useMutation({
    mutationFn: async (data: EditPageForm) => {
      const response = await fetch(`/api/payment-pages/${pageId}`, {
        method: "PATCH",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      });
      
      if (!response.ok) {
        throw new Error("Falha ao atualizar página");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payment-pages"] });
      queryClient.invalidateQueries({ queryKey: [`/api/payment-pages/${pageId}`] });
      toast({
        title: "Sucesso",
        description: "Página atualizada com sucesso!",
      });
    },
    onError: (error) => {
      console.error("Erro ao atualizar página:", error);
      toast({
        title: "Erro",
        description: "Falha ao atualizar a página",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EditPageForm) => {
    updatePageMutation.mutate(data);
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText("00020126870014br.gov.bcb.pix2565pix.primepag.com.br/qr/v3/at/sample-code");
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
  };

  const formData = form.watch();

  const FormStepPreview = () => (
    <div 
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: formData.backgroundColor }}
    >
      <Card className="w-full max-w-md shadow-lg">
        {/* Header */}
        <div 
          className="p-6 rounded-t-lg text-white text-center"
          style={{ backgroundColor: formData.primaryColor }}
        >
          {formData.showLogo && (
            <div className={`mb-4 flex ${formData.logoPosition === 'left' ? 'justify-start' : formData.logoPosition === 'right' ? 'justify-end' : 'justify-center'}`}>
              {formData.logoUrl ? (
                <img 
                  src={formData.logoUrl} 
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

        {/* Form */}
        <CardContent className="p-6">
          <h3 className="font-semibold text-neutral-800 mb-4">Dados para pagamento</h3>
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
              style={{ backgroundColor: formData.accentColor }}
            >
              <QrCode className="w-5 h-5" />
              <span>{formData.customButtonText}</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const PaymentStepPreview = () => (
    <div 
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: formData.backgroundColor }}
    >
      <Card className="w-full max-w-md shadow-lg">
        {/* Header */}
        <div 
          className="p-6 rounded-t-lg text-white text-center"
          style={{ backgroundColor: formData.primaryColor }}
        >
          {formData.showLogo && (
            <div className={`mb-4 flex ${formData.logoPosition === 'left' ? 'justify-start' : formData.logoPosition === 'right' ? 'justify-end' : 'justify-center'}`}>
              {formData.logoUrl ? (
                <img 
                  src={formData.logoUrl} 
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

        {/* PIX Payment Section */}
        <CardContent className="p-6">
          <h3 className="font-semibold text-neutral-800 mb-4 text-center">
            Pagamento PIX
          </h3>

          {/* QR Code */}
          <div className="text-center mb-6">
            <div className="w-48 h-48 bg-white border-2 border-neutral-200 rounded-lg mx-auto flex items-center justify-center mb-4">
              <div className="w-40 h-40 bg-black/10 rounded flex items-center justify-center">
                <QrCode className="w-16 h-16 text-neutral-400" />
              </div>
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
            <div className="space-y-2">
              <div className="flex">
                <input
                  readOnly
                  value="00020126870014br.gov.bcb.pix2565pix.primepag.com.br/qr/v3/at/sample-code"
                  className="flex-1 text-sm font-mono bg-white p-2 border rounded-l"
                />
              </div>
              <Button
                onClick={handleCopyCode}
                className="w-full"
                style={{ backgroundColor: formData.accentColor }}
              >
                {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                {copied ? "Copiado!" : "Copiar Código PIX"}
              </Button>
            </div>
          </div>

          {/* Instructions */}
          <div className="mb-4 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-start space-x-2">
              <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-blue-900 mb-1">Como pagar:</p>
                <ol className="text-blue-800 space-y-1 list-decimal list-inside">
                  <li>Escaneie o QR Code ou copie o código PIX</li>
                  <li>Abra seu app bancário</li>
                  <li>Cole o código ou use a câmera</li>
                  <li>Confirme o pagamento</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Custom Instructions */}
          {formData.customInstructions && (
            <div className="mb-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm" style={{ color: formData.textColor }}>
                {formData.customInstructions}
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
      </Card>
    </div>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
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
          <p className="text-neutral-600 mb-4">A página que você está tentando editar não existe.</p>
          <Button onClick={() => setLocation("/pages")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para Páginas
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <div className="bg-white border-b border-neutral-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setLocation("/pages")}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-xl font-semibold text-neutral-800">
                Editando: {page?.productName || "Carregando..."}
              </h1>
              <div className="flex items-center space-x-2 mt-1">
                <Badge variant="outline">ID: #PG{String(page?.id || 0).padStart(3, '0')}</Badge>
                <Badge className="bg-yellow-100 text-yellow-800">Premium</Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1 bg-neutral-100 rounded p-1">
              <Button
                size="sm"
                variant={activeStep === "form" ? "default" : "ghost"}
                onClick={() => setActiveStep("form")}
              >
                <Type className="w-4 h-4 mr-1" />
                Formulário
              </Button>
              <Button
                size="sm"
                variant={activeStep === "payment" ? "default" : "ghost"}
                onClick={() => setActiveStep("payment")}
              >
                <QrCode className="w-4 h-4 mr-1" />
                Pagamento
              </Button>
            </div>
            <Button 
              onClick={form.handleSubmit(onSubmit)}
              disabled={updatePageMutation.isPending}
              className="bg-primary text-white"
            >
              <Save className="w-4 h-4 mr-2" />
              {updatePageMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-73px)]">
        {/* Left Panel - Editor */}
        <div className="flex-1 overflow-y-auto p-6">
          {!page ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-neutral-600">Carregando editor...</p>
              </div>
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="basic">Básico</TabsTrigger>
                  <TabsTrigger value="colors">Cores</TabsTrigger>
                  <TabsTrigger value="texts">Textos</TabsTrigger>
                  <TabsTrigger value="layout">Layout</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-4 mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Informações do Produto</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="productName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome do Produto</FormLabel>
                            <FormControl>
                              <Input placeholder="Ex: Curso Online de Marketing" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="productDescription"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Descrição</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Descrição do produto..."
                                className="resize-none"
                                rows={3}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="price"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Preço (R$)</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="0.00"
                                type="number"
                                step="0.01"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="colors" className="space-y-4 mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center">
                        <Palette className="w-5 h-5 mr-2" />
                        Esquema de Cores
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="primaryColor"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cor Primária (Header)</FormLabel>
                            <FormControl>
                              <div className="flex space-x-2">
                                <Input type="color" className="w-16 h-10" {...field} />
                                <Input placeholder="#3B82F6" {...field} />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="accentColor"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cor de Destaque (Botões)</FormLabel>
                            <FormControl>
                              <div className="flex space-x-2">
                                <Input type="color" className="w-16 h-10" {...field} />
                                <Input placeholder="#10B981" {...field} />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="backgroundColor"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cor de Fundo</FormLabel>
                            <FormControl>
                              <div className="flex space-x-2">
                                <Input type="color" className="w-16 h-10" {...field} />
                                <Input placeholder="#F8FAFC" {...field} />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="textColor"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cor do Texto</FormLabel>
                            <FormControl>
                              <div className="flex space-x-2">
                                <Input type="color" className="w-16 h-10" {...field} />
                                <Input placeholder="#1F2937" {...field} />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="texts" className="space-y-4 mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center">
                        <Type className="w-5 h-5 mr-2" />
                        Textos Personalizados
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="customTitle"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Título Personalizado</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Deixe vazio para usar o nome do produto"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="customSubtitle"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Subtítulo Personalizado</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Deixe vazio para usar a descrição do produto"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="customButtonText"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Texto do Botão</FormLabel>
                            <FormControl>
                              <Input placeholder="Pagar com PIX" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="customInstructions"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Instruções Personalizadas</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Instruções adicionais para o cliente..."
                                className="resize-none"
                                rows={3}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="layout" className="space-y-4 mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center">
                        <Layout className="w-5 h-5 mr-2" />
                        Opções de Layout
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="showLogo"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Mostrar Logo</FormLabel>
                              <p className="text-sm text-neutral-500">
                                Exibir logo no header da página
                              </p>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="logoUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>URL da Logo</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="https://exemplo.com/logo.png" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="logoPosition"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Posicionamento da Logo</FormLabel>
                            <FormControl>
                              <div className="flex space-x-2">
                                <Button
                                  type="button"
                                  variant={field.value === "left" ? "default" : "outline"}
                                  onClick={() => field.onChange("left")}
                                  className="flex-1"
                                >
                                  Esquerda
                                </Button>
                                <Button
                                  type="button"
                                  variant={field.value === "center" ? "default" : "outline"}
                                  onClick={() => field.onChange("center")}
                                  className="flex-1"
                                >
                                  Centro
                                </Button>
                                <Button
                                  type="button"
                                  variant={field.value === "right" ? "default" : "outline"}
                                  onClick={() => field.onChange("right")}
                                  className="flex-1"
                                >
                                  Direita
                                </Button>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Separator />

                      <div>
                        <h4 className="text-base font-medium mb-2">Elementos Personalizados</h4>
                        <p className="text-sm text-neutral-500 mb-4">
                          Adicione textos e imagens arrastáveis no checkout
                        </p>
                        <div className="flex space-x-2 mb-4">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              // Add text element functionality
                              console.log("Add text element");
                            }}
                            className="flex-1"
                          >
                            <Type className="w-4 h-4 mr-2" />
                            Adicionar Texto
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              // Add image element functionality
                              console.log("Add image element");
                            }}
                            className="flex-1"
                          >
                            <ShoppingBag className="w-4 h-4 mr-2" />
                            Adicionar Imagem
                          </Button>
                        </div>
                        
                        <div className="text-sm text-neutral-600 p-3 bg-neutral-50 rounded">
                          <p>Funcionalidade de elementos arrastáveis será implementada nas próximas atualizações.</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
              </form>
            </Form>
          )}
        </div>

        {/* Right Panel - Preview */}
        <div className="w-96 border-l bg-white overflow-y-auto">
          <div className="p-4 border-b bg-neutral-50">
            <h3 className="font-semibold flex items-center space-x-2">
              <Eye className="w-4 h-4" />
              <span>Preview</span>
            </h3>
            <p className="text-sm text-neutral-600 mt-1">
              Visualização da {activeStep === "form" ? "página de dados" : "página de pagamento"}
            </p>
          </div>
          <div className="bg-neutral-100" style={{ height: 'calc(100% - 73px)' }}>
            {!page ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-neutral-600">Carregando preview...</p>
                </div>
              </div>
            ) : (
              <div className="scale-75 origin-top-left w-[133%] h-[133%]">
                {activeStep === "form" ? <FormStepPreview /> : <PaymentStepPreview />}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}