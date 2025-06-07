import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/utils";
import type { PaymentPage } from "@shared/schema";
import { 
  Palette, 
  Type, 
  Layout, 
  Save,
  Eye,
  X
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
  showProductImage: z.boolean(),
  showCompanyLogo: z.boolean(),
});

type EditPageForm = z.infer<typeof editPageSchema>;

interface EditPageModalProps {
  page: PaymentPage | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditPageModal({ page, open, onOpenChange }: EditPageModalProps) {
  const [showPreview, setShowPreview] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
      showProductImage: true,
      showCompanyLogo: true,
    },
  });

  // Load page data when modal opens
  useEffect(() => {
    if (page && open) {
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
        showProductImage: page.showProductImage ?? true,
        showCompanyLogo: page.showCompanyLogo ?? true,
      });
    }
  }, [page, open, form]);

  const updatePageMutation = useMutation({
    mutationFn: async (data: EditPageForm) => {
      if (!page) throw new Error("Página não encontrada");
      
      const response = await fetch(`/api/payment-pages/${page.id}`, {
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
      toast({
        title: "Sucesso",
        description: "Página atualizada com sucesso!",
      });
      onOpenChange(false);
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

  const formData = form.watch();

  const PreviewComponent = () => (
    <div 
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: formData.backgroundColor }}
    >
      <Card className="w-full max-w-md shadow-lg">
        {/* Header */}
        <div 
          className="p-6 rounded-t-lg"
          style={{ backgroundColor: formData.primaryColor }}
        >
          <div className="text-center text-white">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <div className="w-8 h-8 bg-white/30 rounded"></div>
            </div>
            <h1 className="text-xl font-bold mb-2">
              {formData.customTitle || formData.productName}
            </h1>
            <p className="text-white/90 text-sm">
              {formData.customSubtitle || formData.productDescription}
            </p>
          </div>
        </div>

        {/* Price */}
        <div className="px-6 py-4 bg-neutral-50 border-b border-neutral-200">
          <div className="text-center">
            <span className="text-sm text-neutral-600">Valor único</span>
            <div 
              className="text-3xl font-bold mt-1"
              style={{ color: formData.textColor }}
            >
              {formatCurrency(formData.price)}
            </div>
          </div>
        </div>

        {/* Content */}
        <CardContent className="p-6">
          <Button 
            className="w-full mb-4"
            style={{ 
              backgroundColor: formData.accentColor,
              borderColor: formData.accentColor 
            }}
          >
            {formData.customButtonText}
          </Button>
          
          {formData.customInstructions && (
            <p 
              className="text-sm text-center"
              style={{ color: formData.textColor }}
            >
              {formData.customInstructions}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );

  if (!page) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Palette className="w-5 h-5" />
            <span>Editar Página - {page.productName}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex h-[calc(90vh-100px)]">
          {/* Left Panel - Form */}
          <div className="flex-1 overflow-y-auto pr-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <Tabs defaultValue="basic" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="basic">Básico</TabsTrigger>
                    <TabsTrigger value="colors">Cores</TabsTrigger>
                    <TabsTrigger value="texts">Textos</TabsTrigger>
                    <TabsTrigger value="layout">Layout</TabsTrigger>
                  </TabsList>

                  <TabsContent value="basic" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Informações do Produto</CardTitle>
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

                  <TabsContent value="colors" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Esquema de Cores</CardTitle>
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

                  <TabsContent value="texts" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Textos Personalizados</CardTitle>
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

                  <TabsContent value="layout" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Opções de Layout</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <FormField
                          control={form.control}
                          name="showProductImage"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">Mostrar Imagem do Produto</FormLabel>
                                <p className="text-sm text-neutral-500">
                                  Exibir ícone/imagem no header da página
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
                          name="showCompanyLogo"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">Mostrar Logo da Empresa</FormLabel>
                                <p className="text-sm text-neutral-500">
                                  Exibir logo/marca da empresa na página
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
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>

                <Separator />

                <div className="flex space-x-3">
                  <Button
                    type="submit"
                    disabled={updatePageMutation.isPending}
                    className="flex-1"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {updatePageMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                  </Button>
                </div>
              </form>
            </Form>
          </div>

          {/* Right Panel - Preview */}
          <div className="w-96 border-l pl-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center space-x-2">
                <Eye className="w-4 h-4" />
                <span>Preview</span>
              </h3>
            </div>
            <div className="border rounded-lg overflow-hidden bg-white" style={{ height: '500px' }}>
              <div className="scale-75 origin-top-left w-[133%] h-[133%]">
                <PreviewComponent />
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}