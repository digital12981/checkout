import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Eye, Code2 } from "lucide-react";

export default function HtmlEditor() {
  const [, params] = useRoute("/pages/html-edit/:id");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [htmlCode, setHtmlCode] = useState("");
  const [productName, setProductName] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [price, setPrice] = useState("");
  const [skipForm, setSkipForm] = useState(false);

  const pageQuery = useQuery({
    queryKey: ["/api/payment-pages", params?.id],
    enabled: !!params?.id,
  });

  const page = pageQuery.data;

  useEffect(() => {
    if (page) {
      setProductName(page.productName || "");
      setProductDescription(page.productDescription || "");
      setPrice(page.price?.toString() || "");
      setSkipForm(page.skipForm || false);
      
      // Load existing HTML or create default template
      if (page.previewHtml) {
        setHtmlCode(page.previewHtml);
      } else {
        // Create default HTML template
        const defaultHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${page.productName} - Checkout</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body>
    <div class="min-h-screen bg-slate-50">
        <!-- Header -->
        <div class="w-full bg-blue-600 text-white p-8 text-center">
            <h1 class="text-3xl font-bold mb-2">${page.productName}</h1>
            <p class="text-blue-100 mb-4">${page.productDescription || ''}</p>
            <div class="text-4xl font-bold">R$ ${parseFloat(page.price).toFixed(2).replace('.', ',')}</div>
        </div>
        
        <!-- Content -->
        <div class="container mx-auto px-4 py-8">
            <div class="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
                <!-- FORM_PLACEHOLDER -->
            </div>
        </div>
    </div>
</body>
</html>`;
        setHtmlCode(defaultHtml);
      }
    }
  }, [page]);

  const updatePageMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest(`/api/payment-pages/${params?.id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Página salva com sucesso!",
        description: "O template HTML foi atualizado.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/payment-pages"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao salvar",
        description: error?.message || "Ocorreu um erro inesperado",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (!htmlCode.trim()) {
      toast({
        title: "Erro",
        description: "O código HTML não pode estar vazio",
        variant: "destructive",
      });
      return;
    }

    if (!htmlCode.includes('<!-- FORM_PLACEHOLDER -->')) {
      toast({
        title: "Aviso",
        description: "Adicione '<!-- FORM_PLACEHOLDER -->' onde o formulário deve aparecer",
        variant: "destructive",
      });
      return;
    }

    const updatedData = {
      productName,
      productDescription,
      price: parseFloat(price),
      skipForm,
      previewHtml: htmlCode,
      customElements: "[]", // Reset custom elements since we're using pure HTML
    };

    updatePageMutation.mutate(updatedData);
  };

  const renderPreview = () => {
    // Create preview with form placeholder replaced by sample form
    const previewHtml = htmlCode.replace(
      '<!-- FORM_PLACEHOLDER -->',
      `<div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Nome completo</label>
          <input type="text" class="w-full p-3 border border-gray-300 rounded-md" placeholder="Seu nome" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input type="email" class="w-full p-3 border border-gray-300 rounded-md" placeholder="seu@email.com" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">CPF</label>
          <input type="text" class="w-full p-3 border border-gray-300 rounded-md" placeholder="000.000.000-00" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
          <input type="tel" class="w-full p-3 border border-gray-300 rounded-md" placeholder="(11) 99999-9999" />
        </div>
        <button type="submit" class="w-full bg-green-600 text-white py-3 px-6 rounded-md font-semibold hover:bg-green-700">
          Pagar com PIX
        </button>
      </div>`
    );

    return previewHtml;
  };

  if (pageQuery.isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Carregando...</div>;
  }

  if (!page) {
    return <div className="flex items-center justify-center min-h-screen">Página não encontrada</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Editor HTML - {page.productName}</h1>
          <p className="text-gray-600">Edite diretamente o código HTML/Tailwind da sua página de checkout</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Editor Panel */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code2 className="w-5 h-5" />
                  Configurações da Página
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="productName">Nome do Produto</Label>
                  <Input
                    id="productName"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="productDescription">Descrição</Label>
                  <Input
                    id="productDescription"
                    value={productDescription}
                    onChange={(e) => setProductDescription(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="price">Preço</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="skipForm"
                    checked={skipForm}
                    onChange={(e) => setSkipForm(e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor="skipForm">Pular formulário (auto-submit)</Label>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Código HTML/Tailwind</CardTitle>
                <CardDescription>
                  Edite o código HTML diretamente. Use '&lt;!-- FORM_PLACEHOLDER --&gt;' onde o formulário deve aparecer.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={htmlCode}
                  onChange={(e) => setHtmlCode(e.target.value)}
                  className="font-mono text-sm min-h-[500px]"
                  placeholder="Cole seu código HTML aqui..."
                />
                <div className="mt-4 flex gap-2">
                  <Button 
                    onClick={handleSave} 
                    disabled={updatePageMutation.isPending}
                    className="flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {updatePageMutation.isPending ? "Salvando..." : "Salvar Template"}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => window.open(`/checkout/${params?.id}`, '_blank')}
                    className="flex items-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    Ver Checkout
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Preview Panel */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  Preview do Template
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden bg-white">
                  <iframe
                    srcDoc={renderPreview()}
                    className="w-full h-[600px]"
                    title="Preview"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}