import { useState, useEffect, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormDescription,
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
  Bold,
  MessageCircle,
  User,
  Send,
  Trash2
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
  footerText: z.string().optional(),
  showFooterLogo: z.boolean(),
  footerLogoSize: z.number().min(20).max(100),
  chatEnabled: z.boolean(),
  chatProfilePhoto: z.string().optional(),
  chatAttendantName: z.string().optional(),
  chatMessages: z.string().optional(),
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
  const [previewTab, setPreviewTab] = useState("form");
  const [customElements, setCustomElements] = useState<CustomElement[]>([]);
  const [editingElement, setEditingElement] = useState<string | null>(null);
  const [capturedHTML, setCapturedHTML] = useState<string>("");
  const [timeLeft, setTimeLeft] = useState(15 * 60); // 15 minutes
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [editingMessageIndex, setEditingMessageIndex] = useState<number | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [isProcessingAI, setIsProcessingAI] = useState(false);

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
    defaultValues: {
      productName: "",
      productDescription: "",
      price: "",
      customTitle: "",
      customSubtitle: "",
      customButtonText: "",
      customInstructions: "",
      primaryColor: "#1E40AF",
      accentColor: "#10B981",
      backgroundColor: "#F8FAFC",
      textColor: "#1F2937",
      logoUrl: "",
      logoPosition: "center" as const,
      logoSize: 64,
      headerHeight: 96,
      skipForm: false,
      showLogo: true,
      footerText: "INSS 2025",
      showFooterLogo: true,
      footerLogoSize: 48,
    },
  });

  useEffect(() => {
    if (page) {
      const pageData = Array.isArray(page) ? page[0] : page;
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
        footerText: pageData.footerText || "INSS 2025",
        showFooterLogo: pageData.showFooterLogo ?? true,
        footerLogoSize: pageData.footerLogoSize || 48,
        chatEnabled: pageData.chatEnabled || false,
        chatProfilePhoto: pageData.chatProfilePhoto || "",
        chatAttendantName: pageData.chatAttendantName || "",
        chatMessages: pageData.chatMessages || "",
      });

      try {
        const elements = JSON.parse(pageData.customElements || "[]");
        setCustomElements(elements);
        console.log("Loaded custom elements:", elements);
      } catch {
        setCustomElements([]);
      }

      try {
        const messages = JSON.parse(pageData.chatMessages || "[]");
        setChatMessages(messages);
        console.log("Loaded chat messages:", messages);
      } catch {
        setChatMessages([]);
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
        footerText: pageData.footerText || "INSS 2025",
        showFooterLogo: pageData.showFooterLogo ?? true,
        footerLogoSize: pageData.footerLogoSize || 48,
      });

      try {
        const elements = JSON.parse(pageData.customElements || "[]");
        setCustomElements(elements);
      } catch {
        setCustomElements([]);
      }

      try {
        const messages = JSON.parse(pageData.chatMessages || "[]");
        setChatMessages(messages.length > 0 ? messages : [
          { type: "attendant", content: `Olá! Aqui é a Tereza, atendente de RH. Como está?`, delay: 2000 },
          { type: "attendant", content: `Vi que você tem interesse em ${pageData.productName}. É isso mesmo?`, delay: 3000 },
          { type: "attendant", content: "Estou aqui para esclarecer qualquer dúvida sobre o processo de inscrição.", delay: 3500 },
          { type: "attendant", content: "O processo é bem simples e rápido. Você realiza o pagamento e já fica inscrito!", delay: 4000 },
          { type: "attendant", content: "⚡ ATENÇÃO: As vagas são limitadas e estão acabando rapidamente!", delay: 3000 },
          { type: "attendant", content: "Não perca essa oportunidade! Clique no botão abaixo para garantir sua vaga:", delay: 2500 }
        ]);
      } catch {
        setChatMessages([
          { type: "attendant", content: `Olá! Aqui é a Tereza, atendente de RH. Como está?`, delay: 2000 },
          { type: "attendant", content: `Vi que você tem interesse em ${pageData.productName || "nosso produto"}. É isso mesmo?`, delay: 3000 },
          { type: "attendant", content: "Estou aqui para esclarecer qualquer dúvida sobre o processo de inscrição.", delay: 3500 },
          { type: "attendant", content: "O processo é bem simples e rápido. Você realiza o pagamento e já fica inscrito!", delay: 4000 },
          { type: "attendant", content: "⚡ ATENÇÃO: As vagas são limitadas e estão acabando rapidamente!", delay: 3000 },
          { type: "attendant", content: "Não perca essa oportunidade! Clique no botão abaixo para garantir sua vaga:", delay: 2500 }
        ]);
      }

      // Load chat messages
      try {
        const messages = JSON.parse(pageData.chatMessages || "[]");
        setChatMessages(messages.length > 0 ? messages : [
          { type: "attendant", content: `Olá! Aqui é a Tereza, atendente de RH. Como está?`, delay: 2000 },
          { type: "attendant", content: `Vi que você tem interesse em ${pageData.productName}. É isso mesmo?`, delay: 3000 },
          { type: "attendant", content: "Estou aqui para esclarecer qualquer dúvida sobre o processo de inscrição.", delay: 3500 },
          { type: "attendant", content: "O processo é bem simples e rápido. Você realiza o pagamento e já fica inscrito!", delay: 4000 },
          { type: "attendant", content: "⚡ ATENÇÃO: As vagas são limitadas e estão acabando rapidamente!", delay: 3000 },
          { type: "attendant", content: "Não perca essa oportunidade! Clique no botão abaixo para garantir sua vaga:", delay: 2500 }
        ]);
      } catch {
        setChatMessages([
          { type: "attendant", content: `Olá! Aqui é a Tereza, atendente de RH. Como está?`, delay: 2000 },
          { type: "attendant", content: `Vi que você tem interesse em ${pageData.productName || "nosso produto"}. É isso mesmo?`, delay: 3000 },
          { type: "attendant", content: "Estou aqui para esclarecer qualquer dúvida sobre o processo de inscrição.", delay: 3500 },
          { type: "attendant", content: "O processo é bem simples e rápido. Você realiza o pagamento e já fica inscrito!", delay: 4000 },
          { type: "attendant", content: "⚡ ATENÇÃO: As vagas são limitadas e estão acabando rapidamente!", delay: 3000 },
          { type: "attendant", content: "Não perca essa oportunidade! Clique no botão abaixo para garantir sua vaga:", delay: 2500 }
        ]);
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
        previewHtml: finalHTML,
        chatEnabled: data.chatEnabled,
        chatProfilePhoto: data.chatProfilePhoto,
        chatAttendantName: data.chatAttendantName,
        chatMessages: JSON.stringify(chatMessages || [])
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

  // Chat functions
  const addMessage = (type: 'attendant' | 'user', content: string, delay: number = 3000) => {
    const newMessage = { type, content, delay };
    setChatMessages(prev => [...prev, newMessage]);
    setNewMessage("");
  };

  const updateMessage = (index: number, content: string) => {
    setChatMessages(prev => 
      prev.map((msg, i) => i === index ? { ...msg, content } : msg)
    );
    setEditingMessageIndex(null);
  };

  const deleteMessage = (index: number) => {
    setChatMessages(prev => prev.filter((_, i) => i !== index));
  };

  const processWithAI = async () => {
    if (!aiPrompt.trim()) return;
    
    setIsProcessingAI(true);
    try {
      const response = await fetch('/api/chat/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: aiPrompt,
          currentMessages: chatMessages,
          productName: form.getValues('productName'),
          price: form.getValues('price')
        })
      });

      if (response.ok) {
        const result = await response.json();
        setChatMessages(result.messages);
        setAiPrompt("");
        toast({
          title: "Chat atualizado",
          description: "As mensagens foram processadas com IA."
        });
      } else {
        throw new Error('Falha ao processar com IA');
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao processar mensagens com IA.",
        variant: "destructive"
      });
    } finally {
      setIsProcessingAI(false);
    }
  };

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
              <p className="text-sm text-gray-600">{
                page ? (Array.isArray(page) ? page[0]?.productName : (page as any)?.productName) || "Carregando..." : "Carregando..."
              }</p>
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
        <div className="flex-1 bg-white border-r overflow-auto">
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
              <TabsTrigger value="chat">
                <MessageCircle className="w-4 h-4 mr-1" />
                Chat
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

                <Separator />
                
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Configurações do Rodapé</h3>
                  
                  <FormField
                    control={form.control}
                    name="footerText"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Texto do Rodapé</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="INSS 2025" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="showFooterLogo"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>Mostrar Logo no Rodapé</FormLabel>
                          <div className="text-sm text-muted-foreground">
                            Exibir a mesma logo do header no rodapé
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

                  {form.watch("showFooterLogo") && (
                    <FormField
                      control={form.control}
                      name="footerLogoSize"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tamanho da Logo no Rodapé: {field.value}px</FormLabel>
                          <FormControl>
                            <input
                              type="range"
                              min="20"
                              max="100"
                              step="2"
                              value={field.value}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                              className="w-full"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              </Form>
            </TabsContent>

            <TabsContent value="chat" className="p-4 space-y-4">
              <Form {...form}>
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="chatEnabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>Habilitar Chat</FormLabel>
                          <div className="text-sm text-muted-foreground">
                            Ativar chat antes do checkout
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

                  {form.watch("chatEnabled") && (
                    <>
                      <Separator />
                      
                      <div className="space-y-4">
                        <h3 className="text-sm font-medium">Configurações do Atendente</h3>
                        
                        <FormField
                          control={form.control}
                          name="chatProfilePhoto"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Foto do Perfil</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="URL da foto do atendente" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="chatAttendantName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nome da Atendente de RH</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Ex: Tereza Alencar" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <Separator />

                      <div className="space-y-4">
                        <h3 className="text-sm font-medium">IA - Personalização de Mensagens</h3>
                        
                        <div className="space-y-2">
                          <Textarea
                            placeholder="Descreva como você quer que o chat funcione. Ex: 'Faça o chat mais convincente para vendas de curso' ou 'Adicione mais urgência nas mensagens'"
                            value={aiPrompt}
                            onChange={(e) => setAiPrompt(e.target.value)}
                            rows={3}
                          />
                          <Button 
                            onClick={processWithAI}
                            disabled={isProcessingAI || !aiPrompt.trim()}
                            size="sm"
                            className="w-full"
                          >
                            {isProcessingAI ? (
                              <>
                                <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full"></div>
                                Processando...
                              </>
                            ) : (
                              <>
                                <Send className="w-4 h-4 mr-2" />
                                Processar com IA
                              </>
                            )}
                          </Button>
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-medium">Mensagens do Chat</h3>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => addMessage('attendant', 'Nova mensagem')}
                          >
                            <MessageCircle className="w-4 h-4 mr-1" />
                            Adicionar
                          </Button>
                        </div>

                        <div className="space-y-2 max-h-96 overflow-y-auto">
                          {chatMessages.map((message, index) => (
                            <Card key={index} className="p-3">
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <User className="w-4 h-4" />
                                    <Badge variant={message.type === 'attendant' ? 'default' : 'secondary'}>
                                      {message.type === 'attendant' ? 'Atendente' : 'Cliente'}
                                    </Badge>
                                    <span className="text-xs text-gray-500">
                                      Delay: {message.delay || 1000}ms
                                    </span>
                                  </div>
                                  <div className="flex gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setEditingMessageIndex(index)}
                                    >
                                      <Edit className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => deleteMessage(index)}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                                
                                {editingMessageIndex === index ? (
                                  <div className="space-y-2">
                                    <Textarea
                                      value={message.content}
                                      onChange={(e) => {
                                        const newMessages = [...chatMessages];
                                        newMessages[index].content = e.target.value;
                                        setChatMessages(newMessages);
                                      }}
                                      rows={2}
                                    />
                                    <div className="flex gap-2">
                                      <Button
                                        size="sm"
                                        onClick={() => setEditingMessageIndex(null)}
                                      >
                                        Salvar
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setEditingMessageIndex(null)}
                                      >
                                        Cancelar
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-sm text-gray-700 whitespace-pre-wrap">
                                    {message.content}
                                  </div>
                                )}
                              </div>
                            </Card>
                          ))}
                        </div>

                        {chatMessages.length === 0 && (
                          <div className="text-center text-gray-500 py-8">
                            <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p>Nenhuma mensagem configurada</p>
                            <p className="text-xs">Habilite o chat para carregar mensagens padrão</p>
                          </div>
                        )}
                      </div>

                      <Separator />

                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-start gap-2">
                          <Info className="w-4 h-4 text-blue-600 mt-0.5" />
                          <div className="text-sm text-blue-800">
                            <p className="font-medium">Como funciona o Chat:</p>
                            <ul className="mt-1 list-disc list-inside space-y-1 text-xs">
                              <li>O chat aparece antes do formulário de checkout</li>
                              <li>Mensagens são exibidas em sequência com delays configuráveis</li>
                              <li>Ao final do chat, aparece o botão de pagamento</li>
                              <li>Use a IA para otimizar as mensagens para conversão</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </Form>
            </TabsContent>
          </Tabs>
        </div>

        <div className="w-[28rem] bg-gray-50 overflow-auto border-l">
          <Tabs value={previewTab} onValueChange={setPreviewTab} className="h-full">
            <TabsList className="m-4">
              {formData.chatEnabled ? (
                <TabsTrigger value="chat">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Chat
                </TabsTrigger>
              ) : (
                <TabsTrigger value="form">
                  <ShoppingBag className="w-4 h-4 mr-2" />
                  Formulário
                </TabsTrigger>
              )}
              <TabsTrigger value="payment">
                <QrCode className="w-4 h-4 mr-2" />
                Pagamento
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="chat" className="p-4 h-full">
              <div className="flex justify-center h-full">
                <div className="w-full max-w-md border bg-white overflow-auto shadow-lg" style={{ height: '100%', minHeight: '600px' }}>
                  {chatMessages.length > 0 ? (
                    <div className="h-full flex flex-col">
                      <div className="bg-gray-800 text-white py-2 px-4">
                        <div className="text-xs">Preview do Chat</div>
                      </div>
                      
                      <div 
                        className="py-3 px-4"
                        style={{ backgroundColor: formData.primaryColor || '#044785' }}
                      >
                        <div className="text-center">
                          {formData.showLogo && formData.logoUrl && (
                            <img 
                              src={formData.logoUrl} 
                              alt="Logo" 
                              className="h-8 mx-auto object-contain" 
                            />
                          )}
                        </div>
                      </div>

                      <div className="bg-gray-100 text-gray-800 px-4 py-3">
                        <div className="flex items-center">
                          <div className="mr-4 relative">
                            <img 
                              src={formData.chatProfilePhoto || "https://i.ibb.co/BHcYZ8tf/assets-task-01jy21c21yewes4neft2x006sh-1750267829-img-1-11zon.webp"}
                              className="w-12 h-12 rounded-full object-cover border-2"
                              style={{ borderColor: formData.primaryColor || '#044785' }}
                              alt={formData.chatAttendantName || "Atendente"}
                            />
                            <span 
                              className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white"
                              style={{ backgroundColor: '#28a745' }}
                            ></span>
                          </div>
                          <div>
                            <h2 className="text-gray-800 text-lg font-semibold">
                              {formData.chatAttendantName || "Atendente"}
                            </h2>
                            <p className="text-gray-600 text-sm">Coordenadora de RH</p>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 space-y-4 flex-1 overflow-y-auto">
                        {chatMessages.slice(0, 2).map((message, index) => (
                          <div key={index} className="message-bubble incoming-message mb-3">
                            <div 
                              className="message-content px-4 py-3 rounded-lg text-white text-sm"
                              style={{ 
                                backgroundColor: formData.primaryColor || '#044785',
                                borderTopLeftRadius: '2px',
                                maxWidth: '75%',
                                minWidth: '200px'
                              }}
                            >
                              {message.content}
                            </div>
                          </div>
                        ))}
                        
                        {chatMessages.length > 2 && (
                          <div className="text-center text-gray-500 text-sm">
                            ... mais {chatMessages.length - 2} mensagens
                          </div>
                        )}

                        <div className="text-center mt-4">
                          <button 
                            className="text-white font-semibold py-3 px-6 rounded-full text-sm"
                            style={{ 
                              background: `linear-gradient(90deg, ${formData.primaryColor || '#044785'} 0%, ${formData.accentColor || '#FFD700'} 100%)`,
                            }}
                          >
                            Prosseguir para Pagamento
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      <div className="text-center">
                        <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                        <p>Nenhuma mensagem de chat configurada</p>
                        <p className="text-sm">Configure o chat na aba Chat</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="form" className="p-4 h-full">
              <div className="flex justify-center h-full">
                <div className="w-full max-w-md border bg-white overflow-auto shadow-lg" style={{ height: '100%', minHeight: '600px' }}>
                  <UnifiedTemplateRenderer
                    page={{...formData, id: parseInt(id || "0")}}
                    customElements={customElements}
                    isEditor={true}
                  >
                    <div className="p-6 space-y-4">
                      <div className="bg-amber-50 border border-amber-300 rounded-md p-3 mb-4 text-center">
                        <div className="flex items-center justify-center mb-2">
                          <svg className="animate-spin h-4 w-4 mr-2 text-amber-500" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span className="text-sm font-medium text-amber-600">Aguardando Pagamento...</span>
                        </div>
                        <div className="text-lg font-bold font-mono text-amber-700">{formatTime(timeLeft)}</div>
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
                <div className="w-full max-w-md border bg-white overflow-auto shadow-lg" style={{ height: '100%', minHeight: '600px' }}>
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
                      <div className="w-48 h-48 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                        <div className="text-center text-gray-500">
                          <QrCode className="w-12 h-12 mx-auto mb-2" />
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