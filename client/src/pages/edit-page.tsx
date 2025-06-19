import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency, formatTime } from "@/lib/utils";
import { Settings, Palette, Layout, Plus, Trash2, Upload, Eye, QrCode, User, CreditCard, ShoppingBag, X, Copy, Info, Type, Image } from "lucide-react";
import UnifiedTemplateRenderer from "@/components/unified-template-renderer";

const editPageSchema = z.object({
  productName: z.string().min(1, "Nome do produto é obrigatório"),
  productDescription: z.string().min(1, "Descrição é obrigatória"),
  price: z.string().min(1, "Preço é obrigatório"),
  customTitle: z.string().optional(),
  customSubtitle: z.string().optional(),
  customButtonText: z.string().optional(),
  customInstructions: z.string().optional(),
  primaryColor: z.string(),
  accentColor: z.string(),
  backgroundColor: z.string(),
  textColor: z.string(),
  logoUrl: z.string().optional(),
  logoPosition: z.enum(["left", "center", "right"]),
  logoSize: z.number(),
  headerHeight: z.number(),
  customElements: z.string().optional(),
  skipForm: z.boolean(),
  showLogo: z.boolean()
});

type EditPageForm = z.infer<typeof editPageSchema>;

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

export default function EditPage() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentTab, setCurrentTab] = useState("config");
  const [previewTab, setPreviewTab] = useState("form");
  const [customElements, setCustomElements] = useState<CustomElement[]>([]);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes in seconds

  // Timer functionality
  useEffect(() => {
    if (previewTab === "payment" && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [previewTab, timeLeft]);

  const { data: page, isLoading } = useQuery({
    queryKey: ["/api/payment-pages", id],
    enabled: !!id,
  });

  const form = useForm<EditPageForm>({
    resolver: zodResolver(editPageSchema),
    mode: "onChange",
    defaultValues: {
      productName: "",
      productDescription: "",
      price: "",
      customTitle: "",
      customSubtitle: "",
      customButtonText: "",
      customInstructions: "",
      primaryColor: "#3B82F6",
      accentColor: "#1E40AF",
      backgroundColor: "#FFFFFF",
      textColor: "#1F2937",
      logoUrl: "",
      logoPosition: "center",
      logoSize: 100,
      headerHeight: 150,
      customElements: "[]",
      skipForm: false,
      showLogo: true
    }
  });

  useEffect(() => {
    if (page) {
      console.log("Loading page data:", page);
      form.reset({
        productName: (page as any).productName || "",
        productDescription: (page as any).productDescription || "",
        price: (page as any).price || "",
        customTitle: (page as any).customTitle || "",
        customSubtitle: (page as any).customSubtitle || "",
        customButtonText: (page as any).customButtonText || "",
        customInstructions: (page as any).customInstructions || "",
        primaryColor: (page as any).primaryColor || "#3B82F6",
        accentColor: (page as any).accentColor || "#1E40AF",
        backgroundColor: (page as any).backgroundColor || "#FFFFFF",
        textColor: (page as any).textColor || "#1F2937",
        logoUrl: (page as any).logoUrl || "",
        logoPosition: ((page as any).logoPosition as "left" | "center" | "right") || "center",
        logoSize: (page as any).logoSize || 100,
        headerHeight: (page as any).headerHeight || 150,
        customElements: (page as any).customElements || "[]",
        skipForm: (page as any).skipForm || false,
        showLogo: (page as any).showLogo !== false
      });

      try {
        const elements = JSON.parse((page as any).customElements || "[]");
        console.log("Loaded custom elements:", elements);
        setCustomElements(elements);
      } catch (error) {
        console.error("Error parsing custom elements:", error);
        setCustomElements([]);
      }
    }
  }, [page, form]);

  const mutation = useMutation({
    mutationFn: async (data: EditPageForm) => {
      const response = await fetch(`/api/payment-pages/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error("Erro ao salvar página");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Página atualizada",
        description: "Suas alterações foram salvas com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/payment-pages"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar alterações.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: EditPageForm) => {
    const updatedData = {
      ...data,
      customElements: JSON.stringify(customElements)
    };
    mutation.mutate(updatedData);
  };

  const formData = form.watch();

  const addElement = (type: string) => {
    const newElement: CustomElement = {
      id: Date.now().toString(),
      type,
      position: customElements.length,
      content: type === "text" ? "Novo texto" : type === "image" ? "https://via.placeholder.com/150" : "Novo elemento",
      styles: {
        fontSize: 16,
        textAlign: "center",
        marginBottom: "16px"
      }
    };
    setCustomElements([...customElements, newElement]);
  };

  const removeElement = (id: string) => {
    setCustomElements(customElements.filter(el => el.id !== id));
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Carregando...</div>;
  }

  if (!page) {
    return <div className="flex items-center justify-center min-h-screen">Página não encontrada</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Editar Página</h1>
            <p className="text-gray-600">Personalize sua página de pagamento</p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setLocation("/dashboard")}
            >
              Cancelar
            </Button>
            <Button
              onClick={form.handleSubmit(onSubmit)}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex h-screen">
        {/* Left Panel - Editor */}
        <div className="w-1/2 bg-white border-r overflow-auto">
          <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="config">
                <Settings className="w-4 h-4 mr-1" />
                Config
              </TabsTrigger>
              <TabsTrigger value="design">
                <Palette className="w-4 h-4 mr-1" />
                Design
              </TabsTrigger>
              <TabsTrigger value="elements">
                <Layout className="w-4 h-4 mr-1" />
                Elementos
              </TabsTrigger>
              <TabsTrigger value="upsell">
                <ShoppingBag className="w-4 h-4 mr-1" />
                Upsell
              </TabsTrigger>
              <TabsTrigger value="pixels">
                <QrCode className="w-4 h-4 mr-1" />
                Pixels
              </TabsTrigger>
            </TabsList>

            <Form {...form}>
              <TabsContent value="config" className="p-4 space-y-4">
                <FormField
                  control={form.control}
                  name="productName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Produto</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Digite o nome do produto" />
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
                        <Textarea {...field} placeholder="Descreva o produto" rows={3} />
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
                      <FormLabel>Preço</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="0.00" />
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
                        <Input {...field} placeholder="Pagar com PIX" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="design" className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="primaryColor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cor Primária</FormLabel>
                        <FormControl>
                          <input
                            type="color"
                            {...field}
                            className="w-full h-10 border rounded"
                          />
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
                        <FormLabel>Cor de Destaque</FormLabel>
                        <FormControl>
                          <input
                            type="color"
                            {...field}
                            className="w-full h-10 border rounded"
                          />
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
                          <input
                            type="color"
                            {...field}
                            className="w-full h-10 border rounded"
                          />
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
                          <input
                            type="color"
                            {...field}
                            className="w-full h-10 border rounded"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              <TabsContent value="elements" className="p-4 space-y-4">
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => addElement("text")}
                    className="flex-1"
                  >
                    <Type className="w-4 h-4 mr-1" />
                    Texto
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => addElement("image")}
                    className="flex-1"
                  >
                    <Image className="w-4 h-4 mr-1" />
                    Imagem
                  </Button>
                </div>

                <div className="space-y-2">
                  {customElements.map((element) => (
                    <Card key={element.id} className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="text-sm font-medium capitalize">{element.type}</div>
                          <div className="text-xs text-gray-500 truncate">{element.content}</div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeElement(element.id)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="upsell" className="p-4 space-y-4">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Configurações de Upsell</h3>
                  
                  <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <label className="text-base font-medium">Ativar Upsell</label>
                      <div className="text-sm text-gray-600">
                        Oferecer produtos adicionais após o pagamento
                      </div>
                    </div>
                    <Switch />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Título do Upsell</label>
                    <Input placeholder="Oferta especial para você!" />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Descrição do Upsell</label>
                    <Textarea placeholder="Aproveite esta oferta exclusiva..." rows={3} />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Preço do Upsell</label>
                    <Input placeholder="19.90" />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Texto do Botão</label>
                    <Input placeholder="Adicionar à compra" />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="pixels" className="p-4 space-y-4">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Pixels de Acompanhamento</h3>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Facebook Pixel ID</label>
                    <Input placeholder="1234567890123456" />
                    <div className="text-sm text-gray-600">
                      ID do seu pixel do Facebook para rastreamento de conversões
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Google Analytics</label>
                    <Input placeholder="G-XXXXXXXXXX" />
                    <div className="text-sm text-gray-600">
                      ID de acompanhamento do Google Analytics
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Google Tag Manager</label>
                    <Input placeholder="GTM-XXXXXXX" />
                    <div className="text-sm text-gray-600">
                      ID do Google Tag Manager
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Códigos Personalizados</label>
                    <Textarea 
                      placeholder="<!-- Adicione aqui seus códigos de acompanhamento personalizados -->"
                      rows={6}
                    />
                    <div className="text-sm text-gray-600">
                      Scripts personalizados para pixels e ferramentas de análise
                    </div>
                  </div>

                  <div className="border rounded-lg p-4 bg-blue-50">
                    <h4 className="font-medium text-blue-900 mb-2">Como usar:</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Os pixels são inseridos automaticamente nas páginas</li>
                      <li>• Eventos de conversão são disparados no pagamento</li>
                      <li>• Teste os pixels antes de usar em produção</li>
                    </ul>
                  </div>
                </div>
              </TabsContent>
            </Form>
          </Tabs>
        </div>

        {/* Right Panel - Preview */}
        <div className="flex-1 bg-gray-50 overflow-auto">
          <Tabs value={previewTab} onValueChange={setPreviewTab} className="h-full">
            <TabsList className="m-4">
              <TabsTrigger value="form">
                <User className="w-4 h-4 mr-2" />
                Formulário
              </TabsTrigger>
              <TabsTrigger value="payment">
                <QrCode className="w-4 h-4 mr-2" />
                Pagamento
              </TabsTrigger>
            </TabsList>

            <TabsContent value="form" className="p-4 h-full">
              <div className="flex justify-center h-full">
                <div className="w-96 max-w-sm border bg-white overflow-auto shadow-lg" style={{ height: '100%', minHeight: '600px' }}>
                  <UnifiedTemplateRenderer
                    page={{...formData, id: parseInt(id || "0")}}
                    customElements={customElements}
                    isEditor={true}
                  >
                    <div className="p-6 space-y-4">
                      <div className="text-lg font-semibold text-gray-900">
                        Complete seus dados
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Nome completo</label>
                          <input 
                            type="text" 
                            placeholder="Seu nome completo"
                            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            disabled 
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                          <input 
                            type="email" 
                            placeholder="seu@email.com"
                            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            disabled 
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">CPF</label>
                          <input 
                            type="text" 
                            placeholder="000.000.000-00"
                            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            disabled 
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                          <input 
                            type="tel" 
                            placeholder="(11) 99999-9999"
                            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            disabled 
                          />
                        </div>
                      </div>
                      
                      <button 
                        className="w-full text-white py-3 px-6 rounded-md font-semibold flex items-center justify-center"
                        style={{ backgroundColor: formData.accentColor }}
                        disabled
                      >
                        {formData.customButtonText || "Pagar com PIX"}
                      </button>
                    </div>
                  </UnifiedTemplateRenderer>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="payment" className="p-4 h-full">
              <div className="flex justify-center h-full">
                <div className="w-96 max-w-sm border bg-white overflow-auto shadow-lg" style={{ height: '100%', minHeight: '600px' }}>
                  <UnifiedTemplateRenderer
                    page={{...formData, id: parseInt(id || "0")}}
                    customElements={customElements}
                    isEditor={true}
                  >
                    <div className="p-6 space-y-6">
                      <div className="text-center">
                        <div className="text-lg font-semibold text-gray-900 mb-2">
                          Valor: {formatCurrency(formData.price)}
                        </div>
                      </div>

                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                        <div className="text-center space-y-2">
                          <div className="flex items-center justify-center gap-2 text-yellow-800">
                            <span className="text-sm font-medium">Aguardando pagamento...</span>
                            <div className="animate-spin h-4 w-4 border-2 border-yellow-600 border-t-transparent rounded-full"></div>
                          </div>
                          <div className="text-xl font-bold text-yellow-800">
                            Expira em {formatTime(timeLeft)}
                          </div>
                        </div>
                      </div>

                      <div className="text-center mb-6">
                        <div className="text-gray-600 text-sm mb-4">
                          Escaneie o QR Code ou copie o código PIX
                        </div>
                        <div className="flex justify-center mb-4">
                          <img 
                            src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Logo%E2%80%94pix_powered_by_Banco_Central_%28Brazil%2C_2020%29.svg/2560px-Logo%E2%80%94pix_powered_by_Banco_Central_%28Brazil%2C_2020%29.svg.png"
                            alt="PIX Logo"
                            className="h-8 object-contain"
                          />
                        </div>
                      </div>

                      <div className="flex justify-center">
                        <div className="w-64 h-64 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                          <div className="text-center text-gray-500">
                            <QrCode className="w-16 h-16 mx-auto mb-2" />
                            <p className="text-sm">QR Code PIX</p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="text-sm font-medium text-gray-700">
                          Código PIX Copia e Cola:
                        </div>
                        <div className="space-y-2">
                          <input 
                            type="text" 
                            value="00020126580014BR.GOV.BCB.PIX0136123e4567-e12b-12d1-a456-426614174000"
                            className="w-full p-3 border border-gray-300 rounded-md bg-gray-50 text-sm font-mono"
                            readOnly
                            disabled
                          />
                          <button 
                            className="w-full px-4 py-3 text-white flex items-center justify-center gap-2 shadow-lg transform transition-all duration-150 active:scale-95"
                            style={{
                              backgroundColor: '#48AD45',
                              borderRadius: '4px',
                              boxShadow: '0 4px 8px rgba(72, 173, 69, 0.3), 0 2px 4px rgba(0, 0, 0, 0.1)',
                              border: '1px solid rgba(255, 255, 255, 0.2)'
                            }}
                            disabled
                          >
                            <Copy className="w-4 h-4" />
                            Copiar Código PIX
                          </button>
                        </div>
                      </div>

                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                          <div className="text-sm text-blue-800">
                            <div className="font-medium mb-1">Instruções:</div>
                            <ul className="space-y-1 text-xs">
                              <li>• Abra o app do seu banco</li>
                              <li>• Escolha a opção PIX</li>
                              <li>• Escaneie o QR Code ou cole o código</li>
                              <li>• Confirme o pagamento</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  </UnifiedTemplateRenderer>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}