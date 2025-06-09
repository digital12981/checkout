import { useState, useEffect, useCallback, useRef } from "react";
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
  logoSize: z.number().min(32).max(128).default(64),
  headerHeight: z.number().min(60).max(200).default(96),
  
  // Form options
  skipForm: z.boolean().default(false),
  
  // Custom elements
  customElements: z.string().default("[]"),
});

type EditPageForm = z.infer<typeof editPageSchema>;

// Custom element types
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
  const params = useParams();
  const [, setLocation] = useLocation();
  const [activeStep, setActiveStep] = useState<"form" | "payment">("form");
  const [copied, setCopied] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragType, setDragType] = useState<"text" | "image" | null>(null);
  const [customElements, setCustomElements] = useState<CustomElement[]>([]);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [editingElementId, setEditingElementId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>("");
  const [aiCommand, setAiCommand] = useState<string>("");
  const [isAiProcessing, setIsAiProcessing] = useState<boolean>(false);
  const [aiStatus, setAiStatus] = useState<string>("");
  const [templateSnapshot, setTemplateSnapshot] = useState<any>(null);
  const [previewKey, setPreviewKey] = useState(0);
  const previewRef = React.useRef<HTMLDivElement>(null);
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
      logoSize: 64,
      headerHeight: 96,
      skipForm: false,
      customElements: "[]",
    },
  });

  // Load page data and custom elements - trigger when page data changes
  useEffect(() => {
    if (page) {
      const formData = {
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
        logoSize: page.logoSize || 64,
        headerHeight: page.headerHeight || 96,
        skipForm: page.skipForm ?? false,
        customElements: page.customElements || "[]",
      };

      // Force form update and trigger re-render
      form.reset(formData);
      Object.keys(formData).forEach(key => {
        form.setValue(key as any, formData[key as keyof typeof formData]);
      });

      // Load custom elements
      try {
        const elements = JSON.parse(page.customElements || "[]");
        setCustomElements(elements);
      } catch (error) {
        console.error("Error parsing custom elements:", error);
        setCustomElements([]);
      }
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
    // Capture the current template structure from the preview with current customElements state
    const captureTemplateStructure = () => {
      return {
        formData: {
          ...data,
          customTitle: data.customTitle?.trim() || "",
          customSubtitle: data.customSubtitle?.trim() || "",
        },
        customElements: customElements, // Use current state, not form data
        renderSettings: {
          showLogo: data.showLogo,
          logoUrl: data.logoUrl,
          logoPosition: data.logoPosition,
          logoSize: data.logoSize,
          headerHeight: data.headerHeight,
          primaryColor: data.primaryColor,
          accentColor: data.accentColor,
          backgroundColor: data.backgroundColor,
          textColor: data.textColor,
        }
      };
    };

    // Update custom elements in form data and save template structure
    const templateStructure = captureTemplateStructure();
    const updatedData = {
      ...data,
      customTitle: data.customTitle?.trim() || "",
      customSubtitle: data.customSubtitle?.trim() || "",
      customElements: JSON.stringify(customElements), // Use current state
      templateStructure: JSON.stringify(templateStructure)
    };
    
    console.log("Saving template with elements:", customElements.length);
    updatePageMutation.mutate(updatedData);
  };

  // Element manipulation functions
  const addElement = useCallback((type: "text" | "image") => {
    const newElement: CustomElement = {
      id: `element_${Date.now()}`,
      type,
      position: customElements.length,
      content: type === "text" ? "Texto exemplo" : "https://via.placeholder.com/200x100",
      styles: {
        color: "#000000",
        backgroundColor: type === "text" ? "#ffffff" : undefined,
        isBold: false,
        hasBox: false,
        boxColor: "#f0f0f0",
        imageSize: type === "image" ? 200 : undefined,
        borderRadius: type === "image" ? 8 : undefined,
        fontSize: type === "text" ? 16 : undefined,
        textAlign: type === "text" ? "left" : undefined,
      }
    };
    setCustomElements(prev => [...prev, newElement]);
  }, [customElements]);

  const updateElement = useCallback((id: string, updates: Partial<CustomElement>) => {
    setCustomElements(prev => 
      prev.map(el => el.id === id ? { ...el, ...updates } : el)
    );
  }, []);

  const removeElement = useCallback((id: string) => {
    setCustomElements(prev => {
      const elementToRemove = prev.find(el => el.id === id);
      if (!elementToRemove) return prev;
      
      const filtered = prev.filter(el => el.id !== id);
      
      // Separate header elements (negative positions) from body elements (positive positions)
      const headerElements = filtered.filter(el => el.position < 0);
      const bodyElements = filtered.filter(el => el.position >= 0);
      
      // Reorder header elements (keep negative, but sequential)
      const reorderedHeader = headerElements
        .sort((a, b) => a.position - b.position)
        .map((el, index) => ({ ...el, position: -15 + index }));
      
      // Reorder body elements (starting from 0)
      const reorderedBody = bodyElements
        .sort((a, b) => a.position - b.position)
        .map((el, index) => ({ ...el, position: index }));
      
      const newElements = [...reorderedHeader, ...reorderedBody];
      
      return newElements;
    });
    setSelectedElement(null);
  }, []);

  // Auto-save when customElements changes (after deletion)
  useEffect(() => {
    if (!page) return;
    
    // Don't auto-save on initial load
    const pageCustomElements = page.customElements ? JSON.parse(page.customElements) : [];
    if (JSON.stringify(customElements) === JSON.stringify(pageCustomElements)) return;
    
    console.log("Auto-saving elements change. Count:", customElements.length);
    
    const currentFormData = form.getValues();
    const templateStructure = {
      formData: {
        ...currentFormData,
        customTitle: currentFormData.customTitle?.trim() || "",
        customSubtitle: currentFormData.customSubtitle?.trim() || "",
      },
      customElements: customElements,
      renderSettings: {
        showLogo: currentFormData.showLogo,
        logoUrl: currentFormData.logoUrl,
        logoPosition: currentFormData.logoPosition,
        logoSize: currentFormData.logoSize,
        headerHeight: currentFormData.headerHeight,
        primaryColor: currentFormData.primaryColor,
        accentColor: currentFormData.accentColor,
        backgroundColor: currentFormData.backgroundColor,
        textColor: currentFormData.textColor,
      }
    };
    
    const updatedData = {
      ...currentFormData,
      customElements: JSON.stringify(customElements),
      templateStructure: JSON.stringify(templateStructure)
    };
    
    const timeoutId = setTimeout(() => {
      console.log("Executing auto-save mutation with data:", {
        elementCount: customElements.length,
        customElements: JSON.stringify(customElements)
      });
      updatePageMutation.mutate(updatedData, {
        onSuccess: (data) => {
          console.log("Auto-save successful:", data);
        },
        onError: (error) => {
          console.error("Auto-save failed:", error);
        }
      });
    }, 500);
    
    return () => clearTimeout(timeoutId);
  }, [customElements, page, form, updatePageMutation]);

  const insertElementAtPosition = useCallback((type: "text" | "image", position: number) => {
    const newElement: CustomElement = {
      id: `element_${Date.now()}`,
      type,
      position,
      content: type === "text" ? "Novo texto" : "https://via.placeholder.com/200x100",
      styles: {
        color: "#000000",
        backgroundColor: type === "text" ? "#ffffff" : undefined,
        isBold: false,
        hasBox: false,
        boxColor: "#f0f0f0",
        imageSize: type === "image" ? 200 : undefined,
        borderRadius: type === "image" ? 8 : undefined,
        fontSize: type === "text" ? 16 : undefined,
        textAlign: type === "text" ? "left" : undefined,
      }
    };

    setCustomElements(prev => {
      const updated = prev.map(el => 
        el.position >= position ? { ...el, position: el.position + 1 } : el
      );
      return [...updated, newElement].sort((a, b) => a.position - b.position);
    });
  }, []);

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

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, type: "text" | "image") => {
    setIsDragging(true);
    setDragType(type);
    e.dataTransfer.setData("text/plain", type);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setDragType(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, position: number) => {
    e.preventDefault();
    const type = e.dataTransfer.getData("text/plain") as "text" | "image";
    if (type && (type === "text" || type === "image")) {
      insertElementAtPosition(type, position);
    }
    setIsDragging(false);
    setDragType(null);
  };

  const startEditingText = (elementId: string, currentText: string) => {
    setEditingElementId(elementId);
    setEditingText(currentText);
  };

  const saveTextEdit = () => {
    if (editingElementId) {
      const updatedElements = customElements.map(el => 
        el.id === editingElementId 
          ? { ...el, content: editingText }
          : el
      );
      setCustomElements(updatedElements);
      setEditingElementId(null);
      setEditingText("");
    }
  };

  const cancelTextEdit = () => {
    setEditingElementId(null);
    setEditingText("");
  };

  const toggleBold = () => {
    if (editingElementId) {
      const updatedElements = customElements.map(el => 
        el.id === editingElementId 
          ? { ...el, styles: { ...el.styles, isBold: !el.styles.isBold } }
          : el
      );
      setCustomElements(updatedElements);
    }
  };

  const updateElementStyle = (elementId: string, updates: Partial<CustomElement['styles']> & { content?: string }) => {
    const updatedElements = customElements.map(el => 
      el.id === elementId 
        ? { 
            ...el, 
            content: updates.content !== undefined ? updates.content : el.content,
            styles: { ...el.styles, ...updates } 
          }
        : el
    );
    setCustomElements(updatedElements);
  };

  const saveTemplateSnapshot = () => {
    const snapshot = {
      formData: form.getValues(),
      customElements: [...customElements]
    };
    setTemplateSnapshot(snapshot);
  };

  const restoreTemplateSnapshot = () => {
    if (templateSnapshot) {
      form.reset(templateSnapshot.formData);
      setCustomElements(templateSnapshot.customElements);
      toast({
        title: "Template restaurado",
        description: "O template foi restaurado ao estado anterior",
      });
    }
  };

  const processAiCommand = async () => {
    if (!aiCommand.trim()) return;
    
    setIsAiProcessing(true);
    setAiStatus("Salvando estado atual...");
    saveTemplateSnapshot();

    try {
      setAiStatus("Enviando comando para Claude...");
      const currentTemplate = {
        formData: form.getValues(),
        customElements: customElements,
        currentTab: activeStep
      };

      setAiStatus("Claude está processando...");
      const response = await fetch('/api/ai/process-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: aiCommand,
          currentTemplate: currentTemplate
        })
      });

      if (!response.ok) {
        throw new Error('Falha ao processar comando da IA');
      }

      setAiStatus("Aplicando mudanças...");
      const result = await response.json();
      
      // Apply changes immediately with visual feedback
      if (result.formData) {
        setAiStatus("Atualizando cores e textos...");
        // Update form data with force re-render
        const newFormData = { ...form.getValues(), ...result.formData };
        form.reset(newFormData);
        
        // Force individual field updates to trigger watchers
        Object.entries(result.formData).forEach(([key, value]) => {
          form.setValue(key as any, value, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
        });
        
        // Trigger form validation to update all dependent states
        form.trigger();
      }
      if (result.customElements) {
        setAiStatus("Adicionando elementos...");
        console.log("AI Response customElements:", result.customElements);
        console.log("Current customElements before merge:", customElements);
        // Merge new elements with existing ones instead of replacing
        setCustomElements(prev => {
          const merged = [...prev, ...result.customElements];
          console.log("Merged customElements:", merged);
          return merged;
        });
      }

      // Force preview re-render
      setPreviewKey(prev => prev + 1);

      setAiStatus("Concluído!");
      setTimeout(() => setAiStatus(""), 2000);

      toast({
        title: "Template atualizado",
        description: "Claude aplicou suas modificações com sucesso",
      });
      
      setAiCommand("");
    } catch (error) {
      console.error('Erro ao processar comando:', error);
      setAiStatus("Erro ao processar comando");
      setTimeout(() => setAiStatus(""), 3000);
      toast({
        title: "Erro",
        description: "Falha ao processar comando da IA",
        variant: "destructive",
      });
    } finally {
      setIsAiProcessing(false);
    }
  };



  const renderCustomElement = (element: CustomElement) => {
    const isSelected = selectedElement === element.id;
    const isEditing = editingElementId === element.id;
    
    if (element.type !== "image") {
      return (
        <div
          key={element.id}
          className={`relative mb-4 ${isSelected ? 'ring-2 ring-primary' : ''}`}
          onClick={() => setSelectedElement(element.id)}
        >
          {/* Floating configuration menu */}
          {isSelected && !isEditing && (
            <div className="absolute -top-12 left-0 bg-white border rounded-lg shadow-lg p-2 flex items-center space-x-2 z-10">
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  startEditingText(element.id, element.content);
                }}
                size="sm"
                variant="outline"
                className="h-8 w-8 p-0"
              >
                <Edit className="w-3 h-3" />
              </Button>
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  updateElementStyle(element.id, { isBold: !element.styles.isBold });
                }}
                size="sm"
                variant={element.styles.isBold ? "default" : "outline"}
                className="h-8 w-8 p-0"
              >
                <Bold className="w-3 h-3" />
              </Button>
              <input
                type="color"
                value={element.styles.color || "#000000"}
                onChange={(e) => updateElementStyle(element.id, { color: e.target.value })}
                className="w-8 h-8 rounded border"
                title="Cor do texto"
              />
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  removeElement(element.id);
                }}
                size="sm"
                variant="destructive"
                className="h-8 w-8 p-0"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          )}

          {/* Inline text editor */}
          {isEditing ? (
            <div className="relative">
              <div className="absolute -top-12 left-0 bg-white border rounded-lg shadow-lg p-2 flex items-center space-x-2 z-10">
                <Button
                  onClick={toggleBold}
                  size="sm"
                  variant={element.styles.isBold ? "default" : "outline"}
                  className="h-8 w-8 p-0"
                >
                  <Bold className="w-3 h-3" />
                </Button>
                <Button
                  onClick={saveTextEdit}
                  size="sm"
                  className="h-8 px-2"
                >
                  <Check className="w-3 h-3" />
                </Button>
                <Button
                  onClick={cancelTextEdit}
                  size="sm"
                  variant="outline"
                  className="h-8 w-8 p-0"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
              <textarea
                value={editingText}
                onChange={(e) => setEditingText(e.target.value)}
                className="w-full p-2 border rounded resize-none"
                style={{
                  color: element.styles.color || "#000000",
                  backgroundColor: element.styles.hasBox ? element.styles.boxColor || "#ffffff" : "transparent",
                  fontWeight: element.styles.isBold ? "bold" : "normal",
                  fontSize: `${element.styles.fontSize || 16}px`,
                  textAlign: element.styles.textAlign || "left",
                  borderRadius: `${element.styles.borderRadius || 4}px`
                }}
                rows={2}
                autoFocus
              />
            </div>
          ) : (
            <div
              className={`cursor-pointer ${element.styles.hasBox ? 'border' : ''} ${
                element.type?.includes('footer') || element.position >= 100 ? 'w-full -mx-6 px-6 rounded-none' : 'rounded'
              }`}
              style={{
                color: element.styles.color || "#000000",
                backgroundColor: element.styles.backgroundColor || (element.styles.hasBox ? element.styles.boxColor || "#ffffff" : "transparent"),
                borderColor: element.styles.hasBox ? element.styles.boxColor || "#e5e7eb" : "transparent",
                fontWeight: element.styles.fontWeight || (element.styles.isBold ? "bold" : "normal"),
                fontSize: element.styles.fontSize || "16px",
                textAlign: element.type?.includes('footer') || element.position >= 100 ? "center" : (element.styles.textAlign || "left"),
                borderRadius: element.type?.includes('footer') || element.position >= 100 ? "0" : `${element.styles.borderRadius || 4}px`,
                padding: element.styles.padding || "8px",
                border: element.styles.border,
                marginBottom: element.styles.marginBottom,
                marginTop: element.type?.includes('footer') || element.position >= 100 ? "32px" : element.styles.marginTop,
                lineHeight: element.styles.lineHeight,
                borderTop: element.styles.borderTop,
                width: element.type?.includes('footer') || element.position >= 100 ? "100vw" : "auto",
                marginLeft: element.type?.includes('footer') || element.position >= 100 ? "-50vw" : "0",
                left: element.type?.includes('footer') || element.position >= 100 ? "50%" : "auto",
                position: element.type?.includes('footer') || element.position >= 100 ? "relative" : "static"
              }}
              onDoubleClick={() => startEditingText(element.id, element.content)}
              dangerouslySetInnerHTML={{ __html: element.content.replace(/\n/g, '<br/>') }}
            />
          )}
        </div>
      );
    }

    if (element.type === "image") {
      return (
        <div
          key={element.id}
          className={`relative mb-4 ${isSelected ? 'ring-2 ring-primary' : ''}`}
          onClick={() => setSelectedElement(element.id)}
        >
          {/* Floating configuration menu for images */}
          {isSelected && (
            <div className="absolute -top-12 left-0 bg-white border rounded-lg shadow-lg p-2 flex items-center space-x-2 z-10">
              <input
                type="url"
                placeholder="URL da imagem"
                value={element.content}
                onChange={(e) => updateElementStyle(element.id, { content: e.target.value })}
                className="px-2 py-1 border rounded text-sm w-48"
                onClick={(e) => e.stopPropagation()}
              />
              <input
                type="range"
                min="100"
                max="400"
                value={element.styles.imageSize || 200}
                onChange={(e) => updateElementStyle(element.id, { imageSize: parseInt(e.target.value) })}
                className="w-16"
                title="Tamanho"
              />
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  removeElement(element.id);
                }}
                size="sm"
                variant="destructive"
                className="h-8 w-8 p-0"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          )}

          <img
            src={element.content}
            alt="Custom element"
            className="mx-auto cursor-pointer"
            style={{
              width: element.styles.imageSize || 200,
              borderRadius: element.styles.borderRadius || 8
            }}
            onError={(e) => {
              e.currentTarget.src = "https://via.placeholder.com/200x100?text=Imagem+não+encontrada";
            }}
          />
        </div>
      );
    }

    return null;
  };

  const FormStepPreview = () => (
    <div 
      className="min-h-screen w-full"
      style={{ backgroundColor: formData.backgroundColor }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setSelectedElement(null);
        }
      }}
    >
      {/* Header */}
      <div 
        className="w-full p-6 text-white text-center flex flex-col justify-center"
        style={{ 
          backgroundColor: formData.primaryColor,
          height: `${formData.headerHeight}px`
        }}
      >
          {/* Header custom elements (negative positions for header) */}
          {customElements.filter(el => el.position < -10).map(element => (
            <div key={element.id}>
              {renderCustomElement(element)}
            </div>
          ))}

          {/* Drop zone at top of header - only visible when dragging */}
          {isDragging && (
            <div
              className="h-6 mb-3 border-2 border-dashed border-white/50 bg-white/10 rounded transition-colors"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, -15)}
            >
              <div className="flex items-center justify-center h-full text-xs text-white">
                Solte no cabeçalho
              </div>
            </div>
          )}

          {formData.showLogo && (
            <div className={`mb-4 flex ${formData.logoPosition === 'left' ? 'justify-start' : formData.logoPosition === 'right' ? 'justify-end' : 'justify-center'}`}>
              {formData.logoUrl ? (
                <img 
                  src={formData.logoUrl} 
                  alt="Logo" 
                  className="object-contain rounded"
                  style={{ width: `${formData.logoSize}px`, height: `${formData.logoSize}px` }}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <div className="bg-white/20 rounded-full flex items-center justify-center"
                  style={{ width: `${formData.logoSize}px`, height: `${formData.logoSize}px` }}>
                  <ShoppingBag className="w-8 h-8" />
                </div>
              )}
            </div>
          )}

          {/* Header custom elements after logo */}
          {customElements.filter(el => el.position >= -10 && el.position < 0).map(element => (
            <div key={element.id}>
              {renderCustomElement(element)}
            </div>
          ))}

          {/* Drop zone at bottom of header - only visible when dragging */}
          {isDragging && (
            <div
              className="h-6 border-2 border-dashed border-white/50 bg-white/10 rounded transition-colors"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, -5)}
            >
              <div className="flex items-center justify-center h-full text-xs text-white">
                Solte no cabeçalho
              </div>
            </div>
          )}
        </div>

        {/* Form */}
        <div className="w-full p-6 bg-white flex justify-center">
          <div className="w-full max-w-md">
          
          {/* Render body elements in order (excluding footers) */}
          {customElements
            .filter(el => el.position >= 0 && el.position < 100)
            .sort((a, b) => a.position - b.position)
            .map((element, index) => (
              <div key={element.id}>
                {/* Drop zone before each element - only visible when dragging */}
                {isDragging && (
                  <div
                    className="h-4 mb-2 border-2 border-dashed border-primary bg-primary/10 rounded transition-colors"
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, index)}
                  >
                    <div className="flex items-center justify-center h-full text-xs text-primary">
                      Solte aqui
                    </div>
                  </div>
                )}
                {renderCustomElement(element)}
              </div>
            ))}

          <div className="space-y-4">
            {/* Drop zone at beginning if no elements */}
            {customElements.filter(el => el.position >= 0).length === 0 && isDragging && (
              <div
                className="h-8 mb-4 border-2 border-dashed border-primary bg-primary/10 rounded transition-colors"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, 0)}
              >
                <div className="flex items-center justify-center h-full text-sm text-primary">
                  Solte aqui para adicionar
                </div>
              </div>
            )}
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

            {/* Drop zone at the end for more elements - only visible when dragging */}
            {isDragging && (
              <div
                className="h-8 border-2 border-dashed border-primary bg-primary/10 rounded transition-colors"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, customElements.filter(el => el.position >= 0).length)}
              >
                <div className="flex items-center justify-center h-full text-sm text-primary">
                  Solte aqui para adicionar
                </div>
              </div>
            )}
          </div>
          </div>
        </div>
      
      {/* Footer elements (position 100+) rendered outside card for full width */}
      <div className="w-full mt-6">
        {customElements
          .filter(el => el.position >= 100)
          .sort((a, b) => a.position - b.position)
          .map(element => (
            <div 
              key={element.id} 
              className="w-full"
              style={{
                backgroundColor: formData.primaryColor,
                color: "#ffffff",
                textAlign: "center",
                padding: "20px",
                fontSize: "14px",
                borderTop: `1px solid ${formData.primaryColor}`
              }}
            >
              <div dangerouslySetInnerHTML={{ __html: element.content.replace(/\n/g, '<br/>') }} />
            </div>
          ))}
      </div>
    </div>
  );

  const PaymentStepPreview = () => (
    <div 
      key={`payment-${previewKey}`}
      className="min-h-screen w-full"
      style={{ backgroundColor: formData.backgroundColor }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setSelectedElement(null);
        }
      }}
    >
      {/* Header */}
      <div 
        className="w-full p-6 text-white text-center flex flex-col justify-center"
        style={{ 
          backgroundColor: formData.primaryColor,
          height: `${formData.headerHeight}px`
        }}
      >
          {formData.showLogo && (
            <div className={`mb-4 flex ${formData.logoPosition === 'left' ? 'justify-start' : formData.logoPosition === 'right' ? 'justify-end' : 'justify-center'}`}>
              {formData.logoUrl ? (
                <img 
                  src={formData.logoUrl} 
                  alt="Logo" 
                  className="object-contain rounded"
                  style={{ width: `${formData.logoSize}px`, height: `${formData.logoSize}px` }}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <div className="bg-white/20 rounded-full flex items-center justify-center"
                  style={{ width: `${formData.logoSize}px`, height: `${formData.logoSize}px` }}>
                  <ShoppingBag className="w-8 h-8" />
                </div>
              )}
            </div>
          )}
        </div>

        {/* PIX Payment Section */}
        <div className="w-full p-6 bg-white flex justify-center">
          <div className="w-full max-w-md">
          <h3 className="font-semibold text-neutral-800 mb-4 text-center">
            Pagamento PIX
          </h3>

          {/* Payment page custom elements at the top */}
          {customElements.filter(el => el.position >= 100 && el.position < 105).map(element => (
            <div key={element.id}>
              {renderCustomElement(element)}
            </div>
          ))}

          {/* Drop zone before QR Code - only visible when dragging */}
          {isDragging && (
            <div
              className="h-6 mb-3 border-2 border-dashed border-primary bg-primary/10 rounded transition-colors"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, 100)}
            >
              <div className="flex items-center justify-center h-full text-xs text-primary">
                Solte na página de pagamento
              </div>
            </div>
          )}

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

          {/* Payment page custom elements after PIX code */}
          {customElements.filter(el => el.position >= 105 && el.position < 110).map(element => (
            <div key={element.id}>
              {renderCustomElement(element)}
            </div>
          ))}

          {/* Drop zone after PIX Code - only visible when dragging */}
          {isDragging && (
            <div
              className="h-6 mb-3 border-2 border-dashed border-primary bg-primary/10 rounded transition-colors"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, 105)}
            >
              <div className="flex items-center justify-center h-full text-xs text-primary">
                Solte na página de pagamento
              </div>
            </div>
          )}

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

          {/* Payment page custom elements at the bottom */}
          {customElements.filter(el => el.position >= 110 && el.position < 200).map(element => (
            <div key={element.id}>
              {renderCustomElement(element)}
            </div>
          ))}
          </div>
        </div>

        {/* Footer Section */}
        <div 
          className="p-4 text-center text-white"
          style={{ backgroundColor: formData.primaryColor }}
        >
          {/* Footer custom elements */}
          {customElements.filter(el => el.position >= 200).map(element => (
            <div key={element.id} className="mb-2">
              {renderCustomElement(element)}
            </div>
          ))}
          
          {/* Default footer if no custom elements */}
          {customElements.filter(el => el.position >= 200).length === 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Pagamento 100% seguro</p>
              <p className="text-xs opacity-90">Dados protegidos • Suporte 24h</p>
            </div>
          )}

          {/* Drop zone for footer - only visible when dragging */}
          {isDragging && (
            <div
              className="h-6 mt-3 border-2 border-dashed border-white/50 bg-white/10 rounded transition-colors"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, 200)}
            >
              <div className="flex items-center justify-center h-full text-xs text-white">
                Solte no rodapé
              </div>
            </div>
          )}

        </div>

        {/* Footer elements (position 100+) rendered full width */}
        <div className="w-full mt-6">
          {customElements
            .filter(el => el.position >= 100)
            .sort((a, b) => a.position - b.position)
            .map(element => (
              <div 
                key={element.id} 
                className="w-full"
                style={{
                  backgroundColor: formData.primaryColor,
                  color: "#ffffff",
                  textAlign: "center",
                  padding: "20px",
                  fontSize: "14px",
                  borderTop: `1px solid ${formData.primaryColor}`
                }}
              >
                <div dangerouslySetInnerHTML={{ __html: element.content.replace(/\n/g, '<br/>') }} />
              </div>
            ))}
        </div>
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
                    <div className="p-6 space-y-4">
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

                      <FormField
                        control={form.control}
                        name="skipForm"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">
                                Pular Formulário
                              </FormLabel>
                              <div className="text-sm text-muted-foreground">
                                Ao ativar, os dados do cliente serão capturados pela URL e o PIX será gerado automaticamente
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
                    </div>
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
                    <div className="p-6 space-y-4">
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
                    </div>
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
                    <div className="p-6 space-y-4">
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
                    </div>
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
                    <div className="p-6 space-y-4">
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

                      <FormField
                        control={form.control}
                        name="logoSize"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tamanho da Logo (px)</FormLabel>
                            <FormControl>
                              <div className="space-y-2">
                                <Input 
                                  type="number"
                                  min="32"
                                  max="128"
                                  value={field.value}
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 64)}
                                  className="w-full"
                                />
                                <div className="flex items-center space-x-2 text-sm text-neutral-500">
                                  <span>32px</span>
                                  <div className="flex-1 h-2 bg-neutral-200 rounded">
                                    <div 
                                      className="h-full bg-primary rounded"
                                      style={{ width: `${((field.value - 32) / (128 - 32)) * 100}%` }}
                                    />
                                  </div>
                                  <span>128px</span>
                                </div>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="headerHeight"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Altura do Cabeçalho (px)</FormLabel>
                            <FormControl>
                              <div className="space-y-2">
                                <Input 
                                  type="number"
                                  min="60"
                                  max="200"
                                  value={field.value}
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 96)}
                                  className="w-full"
                                />
                                <div className="flex items-center space-x-2 text-sm text-neutral-500">
                                  <span>60px</span>
                                  <div className="flex-1 h-2 bg-neutral-200 rounded">
                                    <div 
                                      className="h-full bg-primary rounded"
                                      style={{ width: `${((field.value - 60) / (200 - 60)) * 100}%` }}
                                    />
                                  </div>
                                  <span>200px</span>
                                </div>
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
                          Arraste elementos para o preview ou clique para adicionar ao final
                        </p>
                        <div className="flex space-x-2 mb-4">
                          <Button
                            type="button"
                            variant="outline"
                            draggable
                            onDragStart={(e) => handleDragStart(e, "text")}
                            onDragEnd={handleDragEnd}
                            onClick={() => addElement("text")}
                            className="flex-1 cursor-grab active:cursor-grabbing"
                          >
                            <Type className="w-4 h-4 mr-2" />
                            Adicionar Texto
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            draggable
                            onDragStart={(e) => handleDragStart(e, "image")}
                            onDragEnd={handleDragEnd}
                            onClick={() => addElement("image")}
                            className="flex-1 cursor-grab active:cursor-grabbing"
                          >
                            <Image className="w-4 h-4 mr-2" />
                            Adicionar Imagem
                          </Button>
                        </div>
                        
                        <div className="text-sm text-neutral-600 p-3 bg-neutral-50 rounded">
                          <p><strong>Como editar:</strong> Clique no elemento no preview para ver as opções ou duplo-clique no texto para editar diretamente.</p>
                          <p className="mt-1">Total de elementos: {customElements.length}</p>
                        </div>
                      </div>

                      <Separator />

                      <div>
                        <h4 className="text-base font-medium mb-2 flex items-center">
                          <Settings className="w-4 h-4 mr-2" />
                          Edição com IA
                        </h4>
                        <p className="text-sm text-neutral-500 mb-4">
                          Use comandos em linguagem natural para modificar o template
                        </p>
                        
                        <div className="space-y-3">
                          <div>
                            <textarea
                              value={aiCommand}
                              onChange={(e) => setAiCommand(e.target.value)}
                              placeholder="Ex: Mude as cores para o estilo da Nubank, adicione um texto de boas-vindas no topo, torne o botão mais chamativo..."
                              className="w-full p-3 border rounded-lg resize-none text-sm"
                              rows={3}
                              disabled={isAiProcessing}
                            />
                          </div>
                          
                          {aiStatus && (
                            <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                              <div className="flex items-center text-blue-700">
                                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2" />
                                <span className="text-sm font-medium">{aiStatus}</span>
                              </div>
                            </div>
                          )}
                          
                          <div className="flex space-x-2">
                            <Button
                              type="button"
                              onClick={processAiCommand}
                              disabled={!aiCommand.trim() || isAiProcessing}
                              className="flex-1"
                            >
                              {isAiProcessing ? (
                                <div className="flex items-center">
                                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                  Processando...
                                </div>
                              ) : (
                                "Enviar Comando"
                              )}
                            </Button>
                            
                            {templateSnapshot && (
                              <Button
                                type="button"
                                variant="outline"
                                onClick={restoreTemplateSnapshot}
                                disabled={isAiProcessing}
                                className="px-3"
                              >
                                <ArrowLeft className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                        
                        <div className="text-xs text-neutral-500 mt-3 p-3 bg-blue-50 rounded">
                          <p><strong>Dica:</strong> A IA pode modificar cores, textos, layout e adicionar elementos. Para estilos de marcas específicas (como Nubank, PagSeguro), ela pesquisará as cores e padrões corretos automaticamente.</p>
                        </div>

                        {/* Element Properties Panel */}
                        {selectedElement && (
                          <div className="mt-6 p-4 border rounded-lg bg-white">
                            <h5 className="font-medium mb-3">Editar Elemento</h5>
                            {(() => {
                              const element = customElements.find(el => el.id === selectedElement);
                              if (!element) return null;

                              if (element.type === "text") {
                                return (
                                  <div className="space-y-3">
                                    <div>
                                      <label className="block text-sm font-medium mb-1">Texto</label>
                                      <textarea
                                        value={element.content}
                                        onChange={(e) => updateElement(element.id, { content: e.target.value })}
                                        className="w-full p-2 border rounded text-sm"
                                        rows={2}
                                      />
                                    </div>
                                    <div className="grid grid-cols-3 gap-3">
                                      <div>
                                        <label className="block text-sm font-medium mb-1">Cor do texto</label>
                                        <input
                                          type="color"
                                          value={element.styles.color || "#000000"}
                                          onChange={(e) => updateElement(element.id, { 
                                            styles: { ...element.styles, color: e.target.value } 
                                          })}
                                          className="w-full h-8 border rounded"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-sm font-medium mb-1">Tamanho</label>
                                        <input
                                          type="number"
                                          value={element.styles.fontSize || 16}
                                          onChange={(e) => updateElement(element.id, { 
                                            styles: { ...element.styles, fontSize: parseInt(e.target.value) || 16 } 
                                          })}
                                          className="w-full p-1 border rounded text-sm"
                                          min="10"
                                          max="48"
                                        />
                                      </div>
                                      <div className="flex items-end">
                                        <label className="flex items-center text-sm">
                                          <input
                                            type="checkbox"
                                            checked={element.styles.isBold || false}
                                            onChange={(e) => updateElement(element.id, { 
                                              styles: { ...element.styles, isBold: e.target.checked } 
                                            })}
                                            className="mr-2"
                                          />
                                          Negrito
                                        </label>
                                      </div>
                                    </div>
                                    <div>
                                      <label className="block text-sm font-medium mb-1">Alinhamento</label>
                                      <select
                                        value={element.styles.textAlign || "left"}
                                        onChange={(e) => updateElement(element.id, { 
                                          styles: { ...element.styles, textAlign: e.target.value as "left" | "center" | "right" } 
                                        })}
                                        className="w-full p-2 border rounded text-sm"
                                      >
                                        <option value="left">Esquerda</option>
                                        <option value="center">Centro</option>
                                        <option value="right">Direita</option>
                                      </select>
                                    </div>
                                    <div>
                                      <label className="flex items-center text-sm">
                                        <input
                                          type="checkbox"
                                          checked={element.styles.hasBox || false}
                                          onChange={(e) => updateElement(element.id, { 
                                            styles: { ...element.styles, hasBox: e.target.checked } 
                                          })}
                                          className="mr-2"
                                        />
                                        Adicionar caixa de fundo
                                      </label>
                                    </div>
                                    {element.styles.hasBox && (
                                      <div>
                                        <label className="block text-sm font-medium mb-1">Cor da caixa</label>
                                        <input
                                          type="color"
                                          value={element.styles.boxColor || "#f0f0f0"}
                                          onChange={(e) => updateElement(element.id, { 
                                            styles: { ...element.styles, boxColor: e.target.value } 
                                          })}
                                          className="w-full h-8 border rounded"
                                        />
                                      </div>
                                    )}
                                  </div>
                                );
                              }

                              if (element.type === "image") {
                                return (
                                  <div className="space-y-3">
                                    <div>
                                      <label className="block text-sm font-medium mb-1">URL da imagem</label>
                                      <input
                                        type="url"
                                        value={element.content}
                                        onChange={(e) => updateElement(element.id, { content: e.target.value })}
                                        className="w-full p-2 border rounded text-sm"
                                        placeholder="https://exemplo.com/imagem.jpg"
                                      />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                      <div>
                                        <label className="block text-sm font-medium mb-1">Largura (px)</label>
                                        <input
                                          type="number"
                                          value={element.styles.imageSize || 200}
                                          onChange={(e) => updateElement(element.id, { 
                                            styles: { ...element.styles, imageSize: parseInt(e.target.value) || 200 } 
                                          })}
                                          className="w-full p-2 border rounded text-sm"
                                          min="50"
                                          max="500"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-sm font-medium mb-1">Bordas arredondadas</label>
                                        <input
                                          type="number"
                                          value={element.styles.borderRadius || 8}
                                          onChange={(e) => updateElement(element.id, { 
                                            styles: { ...element.styles, borderRadius: parseInt(e.target.value) || 0 } 
                                          })}
                                          className="w-full p-2 border rounded text-sm"
                                          min="0"
                                          max="50"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                );
                              }

                              return null;
                            })()}
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => removeElement(selectedElement)}
                              className="mt-3 w-full"
                            >
                              <X className="w-4 h-4 mr-2" />
                              Remover Elemento
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
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
              Visualização da {(activeStep === "form" && !formData.skipForm) ? "página de dados" : "página de pagamento"}
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
                {(activeStep === "form" && !formData.skipForm) ? <FormStepPreview /> : <PaymentStepPreview />}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}