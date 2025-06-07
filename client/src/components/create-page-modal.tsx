import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const createPageSchema = z.object({
  productName: z.string().min(1, "Nome do produto é obrigatório"),
  productDescription: z.string().optional(),
  price: z.string().min(1, "Preço é obrigatório").regex(/^\d+\.?\d*$/, "Preço inválido"),
  template: z.literal("premium").default("premium"),
  status: z.enum(["active", "inactive"]).default("active"),
});

type CreatePageForm = z.infer<typeof createPageSchema>;

interface CreatePageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const templates = [
  {
    id: "modern",
    name: "Moderno",
    description: "Design clean e profissional",
    gradient: "from-primary to-accent",
  },
  {
    id: "minimal",
    name: "Minimalista",
    description: "Foco no essencial",
    gradient: "from-neutral-400 to-neutral-600",
  },
  {
    id: "premium",
    name: "Premium",
    description: "Visual sofisticado",
    gradient: "from-accent to-yellow-500",
  },
] as const;

export default function CreatePageModal({ open, onOpenChange }: CreatePageModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<"modern" | "minimal" | "premium">("modern");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<CreatePageForm>({
    resolver: zodResolver(createPageSchema),
    defaultValues: {
      productName: "",
      productDescription: "",
      price: "",
      template: "premium",
      status: "active",
    },
  });

  const createPageMutation = useMutation({
    mutationFn: async (data: CreatePageForm) => {
      const response = await apiRequest("POST", "/api/payment-pages", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payment-pages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Sucesso",
        description: "Página de pagamento criada com sucesso!",
      });
      form.reset();
      setSelectedTemplate("modern");
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao criar página",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreatePageForm) => {
    createPageMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" aria-describedby="create-page-description">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-neutral-800">
            Nova Página de Pagamento
          </DialogTitle>
        </DialogHeader>
        <p id="create-page-description" className="sr-only">
          Formulário para criar uma nova página de pagamento PIX com informações do produto e template.
        </p>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="productName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Produto</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: Curso de Marketing Digital"
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
                    <FormLabel>Valor (R$)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0,00"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="productDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição do Produto</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder="Descreva brevemente o produto..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div>
              <FormLabel className="block text-sm font-medium text-neutral-700 mb-4">
                Template da Página
              </FormLabel>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {templates.map((template) => (
                  <Card
                    key={template.id}
                    className={cn(
                      "p-4 cursor-pointer border-2 transition-colors hover:border-primary/50",
                      selectedTemplate === template.id
                        ? "border-primary bg-primary/5"
                        : "border-neutral-300"
                    )}
                    onClick={() => setSelectedTemplate(template.id)}
                  >
                    <div
                      className={`aspect-video bg-gradient-to-br ${template.gradient} rounded mb-3`}
                    />
                    <h4 className="font-medium text-neutral-800">{template.name}</h4>
                    <p className="text-sm text-neutral-600">{template.description}</p>
                  </Card>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-6 border-t border-neutral-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createPageMutation.isPending}
                className="bg-primary text-white hover:bg-primary/90"
              >
                {createPageMutation.isPending ? "Criando..." : "Criar Página"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
