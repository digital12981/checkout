import { useState, useEffect, useCallback } from "react";
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
  Clock,
  Image,
  Move,
  X,
  Edit,
  Bold
} from "lucide-react";
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
  logoSize: z.number().min(20).max(200),
  headerHeight: z.number().min(60).max(300),
  skipForm: z.boolean(),
  showLogo: z.boolean(),
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
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentTab, setCurrentTab] = useState("config");
  const [previewTab, setPreviewTab] = useState("preview");
  const [customElements, setCustomElements] = useState<CustomElement[]>([]);
  const [editingElement, setEditingElement] = useState<string | null>(null);
  const [capturedHTML, setCapturedHTML] = useState<string>("");
  const [timeLeft, setTimeLeft] = useState(15 * 60); // 15 minutes in seconds

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

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const { data: page, isLoading } = useQuery({
    queryKey: ["/api/payment-pages", id],
    enabled: !!id,
  });

  const form = useForm<EditPageForm>({
    resolver: zodResolver(editPageSchema),
    mode: "onChange",
  });

  useEffect(() => {
    if (page && Array.isArray(page) && page.length > 0) {
      const pageData = page[0];
      console.log("Loading page data:", pageData);
      
      form.reset({
        productName: pageData.productName || "",
        productDescription: pageData.productDescription || "",
        price: pageData.price || "",
        customTitle: pageData.customTitle || "",
        customSubtitle: pageData.customSubtitle || "",
        customButtonText: pageData.customButtonText || "",
        customInstructions: pageData.customInstructions || "",
        primaryColor: pageData.primaryColor || "#1E40AF",
        accentColor: pageData.accentColor || "#10B981",
        backgroundColor: pageData.backgroundColor || "#F8FAFC",
        textColor: pageData.textColor || "#1F2937",
        logoUrl: pageData.logoUrl || "",
        logoPosition: (pageData.logoPosition as "left" | "center" | "right") || "center",
        logoSize: pageData.logoSize || 64,
        headerHeight: pageData.headerHeight || 96,
        skipForm: pageData.skipForm || false,
        showLogo: pageData.showLogo ?? true,
      });

      try {
        const elements = JSON.parse(pageData.customElements || "[]");
        setCustomElements(elements);
        console.log("Loaded custom elements:", elements);
      } catch {
        setCustomElements([]);
      }
    } else if (page && !Array.isArray(page)) {
      const pageData = page as any;
      console.log("Loading single page data:", pageData);
      
      form.reset({
        productName: pageData.productName || "",
        productDescription: pageData.productDescription || "",
        price: pageData.price || "",
        customTitle: pageData.customTitle || "",
        customSubtitle: pageData.customSubtitle || "",
        customButtonText: pageData.customButtonText || "",
        customInstructions: pageData.customInstructions || "",
        primaryColor: pageData.primaryColor || "#1E40AF",
        accentColor: pageData.accentColor || "#10B981",
        backgroundColor: pageData.backgroundColor || "#F8FAFC",
        textColor: pageData.textColor || "#1F2937",
        logoUrl: pageData.logoUrl || "",
        logoPosition: (pageData.logoPosition as "left" | "center" | "right") || "center",
        logoSize: pageData.logoSize || 64,
        headerHeight: pageData.headerHeight || 96,
        skipForm: pageData.skipForm || false,
        showLogo: pageData.showLogo ?? true,
      });

      try {
        const elements = JSON.parse(pageData.customElements || "[]");
        setCustomElements(elements);
      } catch {
        setCustomElements([]);
      }
    }
  }, [page, form]);

  const updatePageMutation = useMutation({
    mutationFn: async (data: EditPageForm) => {
      const response = await fetch(`/api/payment-pages/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) throw new Error("Failed to update page");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payment-pages"] });
      toast({
        title: "Página atualizada",
        description: "As alterações foram salvas com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao salvar as alterações.",
        variant: "destructive",
      });
    },
  });

  // Generate clean HTML for checkout that matches preview exactly
  const generateCleanHTML = (pageData: any, elements: CustomElement[]) => {
    const topElements = elements.filter(el => typeof el.position === 'number' && el.position >= 0 && el.position < 50);
    const middleElements = elements.filter(el => typeof el.position === 'number' && el.position >= 50 && el.position < 100);
    const bottomElements = elements.filter(el => typeof el.position === 'number' && el.position >= 100 && el.position < 200);
    const footerElements = elements.filter(el => typeof el.position === 'number' && el.position >= 200);

    const renderElement = (element: CustomElement) => {
      const styles = element.styles || {};
      
      if (element.type === 'text') {
        const textStyles = [
          styles.color ? `color: ${styles.color}` : '',
          styles.backgroundColor ? `background-color: ${styles.backgroundColor}` : '',
          styles.fontSize ? `font-size: ${styles.fontSize}px` : '',
          styles.fontWeight ? `font-weight: ${styles.fontWeight}` : '',
          styles.textAlign ? `text-align: ${styles.textAlign}` : '',
          styles.padding ? `padding: ${styles.padding}` : '',
          styles.marginBottom ? `margin-bottom: ${styles.marginBottom}` : '',
          styles.marginTop ? `margin-top: ${styles.marginTop}` : '',
          styles.border ? `border: ${styles.border}` : '',
          styles.borderTop ? `border-top: ${styles.borderTop}` : '',
          styles.borderRadius ? `border-radius: ${styles.borderRadius}px` : '',
          styles.lineHeight ? `line-height: ${styles.lineHeight}` : '',
        ].filter(Boolean).join('; ');

        const classes = [
          'block',
          styles.textAlign === 'center' ? 'text-center' : styles.textAlign === 'right' ? 'text-right' : 'text-left',
          styles.isBold ? 'font-bold' : '',
          styles.hasBox ? 'p-4 rounded-lg' : ''
        ].filter(Boolean).join(' ');

        return `<div class="${classes}" style="${textStyles}">${element.content}</div>`;
      } else if (element.type === 'image') {
        const imageSize = styles.imageSize || 100;
        return `<div class="flex justify-center mb-4">
          <img src="${element.content}" alt="Custom Image" class="object-contain" style="width: ${imageSize}px; height: ${imageSize}px;" />
        </div>`;
      }
      
      return `<div>${element.content}</div>`;
    };
    
    return `<div class="min-h-screen w-full" style="background-color: ${pageData.backgroundColor};">
      <!-- Header -->
      <div class="w-full p-6 text-white text-center flex flex-col justify-center" style="background-color: ${pageData.primaryColor}; height: ${pageData.headerHeight}px;">
        ${topElements.map(renderElement).join('')}
        
        ${pageData.showLogo && pageData.logoUrl ? `
          <div class="mb-4 flex ${pageData.logoPosition === 'left' ? 'justify-start' : pageData.logoPosition === 'right' ? 'justify-end' : 'justify-center'}">
            <img src="${pageData.logoUrl}" alt="Logo" class="object-contain rounded" style="width: ${pageData.logoSize}px; height: ${pageData.logoSize}px;" />
          </div>
        ` : ''}
        
        ${pageData.customTitle ? `<h1 class="text-2xl font-bold mb-2">${pageData.customTitle}</h1>` : ''}
        ${pageData.customSubtitle ? `<p class="text-lg opacity-90">${pageData.customSubtitle}</p>` : ''}
      </div>
      
      <!-- Main Content -->
      <div class="flex-1 p-6">
        ${middleElements.map(renderElement).join('')}
        
        <!-- Form Area -->
        <div class="max-w-md mx-auto mb-6">
          <div class="bg-white border border-gray-200 rounded-lg p-6">{{FORM_PLACEHOLDER}}</div>
        </div>
        
        ${bottomElements.map(renderElement).join('')}
      </div>
      
      ${footerElements.length > 0 ? `
        <!-- Footer -->
        <div class="p-6 text-center">
          ${footerElements.map(renderElement).join('')}
        </div>
      ` : ''}
    </div>`;
  };

  // Capture exact HTML from preview
  const capturePreviewHTML = () => {
    console.log("Capturing HTML from preview...");
    
    // Generate HTML directly from current form data and elements
    const currentFormData = form.getValues();
    const pageDataWithId = {...currentFormData, id: parseInt(id || "0")};
    const generatedHTML = generateCleanHTML(pageDataWithId, customElements);
    
    setCapturedHTML(generatedHTML);
    console.log("HTML generated successfully:", generatedHTML.length, "chars");
    
    toast({
      title: "HTML Capturado",
      description: `${generatedHTML.length} caracteres gerados do preview atual`,
    });
  };

  const onSubmit = async (data: EditPageForm) => {
    try {
      let finalHTML = capturedHTML;
      
      if (!finalHTML || finalHTML.length < 500) {
        console.log("Using generated HTML");
        const dataWithId = {...data, id: parseInt(id || "0")};
        finalHTML = generateCleanHTML(dataWithId, customElements);
      } else {
        console.log("Using captured HTML from preview");
      }
      
      const updatedData = {
        ...data,
        customTitle: data.customTitle?.trim() || "",
        customSubtitle: data.customSubtitle?.trim() || "",
        customElements: JSON.stringify(customElements),
        previewHtml: finalHTML
      };
      
      updatePageMutation.mutate(updatedData);
      
    } catch (error) {
      console.error("Error saving page:", error);
    }
  };

  const addElement = useCallback((type: "text" | "image") => {
    const newElement: CustomElement = {
      id: `${type}-${Date.now()}`,
      type,
      position: 60,
      content: type === "text" ? "Novo texto" : "https://via.placeholder.com/150",
      styles: {
        color: "#1F2937",
        fontSize: 16,
        textAlign: "center",
        marginBottom: "1rem",
      },
    };
    setCustomElements(prev => [...prev, newElement]);
  }, []);

  const updateElement = useCallback((id: string, updates: Partial<CustomElement>) => {
    setCustomElements(prev => 
      prev.map(el => el.id === id ? { ...el, ...updates } : el)
    );
  }, []);

  const deleteElement = useCallback((id: string) => {
    setCustomElements(prev => prev.filter(el => el.id !== id));
    setEditingElement(null);
  }, []);

  if (isLoading) {
    return <div>Carregando...</div>;
  }

  if (!page) {
    return <div>Página não encontrada</div>;
  }

  const formData = form.watch();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b bg-white">
        <div className="flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => setLocation("/dashboard")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="font-semibold">Editar Página de Pagamento</h1>
              <p className="text-sm text-gray-600">{page.productName}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={capturePreviewHTML}
            >
              <Copy className="w-4 h-4 mr-2" />
              Capturar HTML
            </Button>
            <Button 
              onClick={form.handleSubmit(onSubmit)} 
              disabled={updatePageMutation.isPending}
              size="sm"
            >
              <Save className="w-4 h-4 mr-2" />
              {updatePageMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex">
        <div className="w-80 bg-white border-r overflow-auto">
          <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
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
            </TabsList>

            <TabsContent value="config" className="p-4 space-y-4">
              <Form {...form}>
                <FormField
                  control={form.control}
                  name="productName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Produto</FormLabel>
                      <FormControl>
                        <Input {...field} />
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
                        <Textarea {...field} rows={3} />
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
                        <Input {...field} placeholder="99.90" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Separator />

                <FormField
                  control={form.control}
                  name="customTitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Título Personalizado</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Deixe vazio para usar o nome do produto" />
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
                        <Textarea {...field} rows={2} placeholder="Deixe vazio para usar a descrição" />
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

                <FormField
                  control={form.control}
                  name="customInstructions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Instruções Personalizadas</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={3} placeholder="Instruções adicionais para o cliente" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="skipForm"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Pular Formulário</FormLabel>
                        <div className="text-sm text-gray-600">
                          Redireciona direto para pagamento PIX
                        </div>
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
              </Form>
            </TabsContent>

            <TabsContent value="design" className="p-4 space-y-4">
              <Form {...form}>
                <FormField
                  control={form.control}
                  name="showLogo"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Mostrar Logo</FormLabel>
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

                {formData.showLogo && (
                  <>
                    <FormField
                      control={form.control}
                      name="logoUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>URL do Logo</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="https://exemplo.com/logo.png" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="logoSize"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tamanho do Logo: {field.value}px</FormLabel>
                          <FormControl>
                            <input
                              type="range"
                              min="20"
                              max="200"
                              step="4"
                              value={field.value}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                              className="w-full"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                <FormField
                  control={form.control}
                  name="headerHeight"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Altura do Header: {field.value}px</FormLabel>
                      <FormControl>
                        <input
                          type="range"
                          min="60"
                          max="300"
                          step="8"
                          value={field.value}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                          className="w-full"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-2">
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
              </Form>
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
                      <div className="flex items-center gap-2">
                        {element.type === "text" ? (
                          <Type className="w-4 h-4" />
                        ) : (
                          <Image className="w-4 h-4" />
                        )}
                        <div>
                          <div className="font-medium text-sm">
                            {element.type === "text" ? "Texto" : "Imagem"}
                          </div>
                          <div className="text-xs text-gray-600 truncate max-w-32">
                            {element.content}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingElement(element.id)}
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteElement(element.id)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="flex-1 bg-gray-50 overflow-auto">
          <Tabs value={previewTab} onValueChange={setPreviewTab} className="h-full">
            <TabsList className="m-4">
              <TabsTrigger value="preview">
                <Eye className="w-4 h-4 mr-2" />
                Preview
              </TabsTrigger>
              <TabsTrigger value="form">
                <ShoppingBag className="w-4 h-4 mr-2" />
                Formulário
              </TabsTrigger>
              <TabsTrigger value="payment">
                <QrCode className="w-4 h-4 mr-2" />
                Pagamento
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="preview" className="p-4 h-full">
              <div className="border rounded-lg bg-white h-full overflow-auto">
                <UnifiedTemplateRenderer
                  page={{...formData, id: parseInt(id || "0")}}
                  customElements={customElements}
                  isEditor={true}
                >
                  <div className="p-6 space-y-4">
                    {/* Status Compacto com Cronômetro */}
                    <div className="bg-amber-50 border border-amber-300 rounded-md p-3 mb-4 text-center">
                      <div className="flex items-center justify-center mb-2">
                        <svg className="animate-spin h-4 w-4 mr-2 text-amber-500" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="text-sm font-medium text-amber-600">Aguardando Pagamento...</span>
                      </div>
                      <div className="text-lg font-bold font-mono text-amber-700">{formatTime(timeLeft)}</div>
                    </div>

                    <div className="text-lg font-semibold text-gray-900">
                      {formData.skipForm ? "Processando Pagamento..." : "Complete seus dados"}
                    </div>
                    
                    {!formData.skipForm && (
                      <>
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
                      </>
                    )}
                    
                    <button 
                      className="w-full text-white py-3 px-6 rounded-md font-semibold flex items-center justify-center gap-2"
                      style={{ backgroundColor: formData.accentColor }}
                      disabled
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                      </svg>
                      {formData.customButtonText || "Pagar com PIX"} - {formatCurrency(formData.price)}
                    </button>
                  </div>
                </UnifiedTemplateRenderer>
              </div>
            </TabsContent>

            <TabsContent value="form" className="p-4 h-full">
              <div className="border rounded-lg bg-white h-full overflow-auto">
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
            </TabsContent>

            <TabsContent value="payment" className="p-4 h-full">
              <div className="border rounded-lg bg-white h-full overflow-auto">
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
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}