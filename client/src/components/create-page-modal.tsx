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
  chargeDescription: z.string().min(1, "Descrição da cobrança é obrigatória"),
  price: z.string().min(1, "Preço é obrigatório").regex(/^\d+\.?\d*$/, "Preço inválido"),
  template: z.literal("premium").default("premium"),
  status: z.enum(["active", "inactive"]).default("active"),
});

type CreatePageForm = z.infer<typeof createPageSchema>;

interface CreatePageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}



export default function CreatePageModal({ open, onOpenChange }: CreatePageModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<CreatePageForm>({
    resolver: zodResolver(createPageSchema),
    defaultValues: {
      productName: "",
      chargeDescription: "",
      price: "",
      template: "premium",
      status: "active",
    },
  });

  const createPageMutation = useMutation({
    mutationFn: async (data: CreatePageForm) => {
      // Create the page with charge description
      const pageData = {
        productName: data.productName,
        productDescription: data.chargeDescription, // Map charge description to product description
        price: data.price,
        template: data.template,
        status: data.status
      };
      const response = await apiRequest("POST", "/api/payment-pages", pageData);
      const pageResult = await response.json();
      
      // Auto-generate checkout template based on charge description
      if (pageResult.id) {
        try {
          await apiRequest("POST", "/api/ai/generate-checkout", {
            pageId: pageResult.id,
            chargeDescription: data.chargeDescription,
            productName: data.productName,
            price: data.price
          });
        } catch (error) {
          console.error("Failed to generate AI checkout template:", error);
        }
      }
      
      return pageResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payment-pages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Sucesso",
        description: "Página de pagamento criada com template personalizado!",
      });
      form.reset();
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
                name="chargeDescription"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Descrição da Cobrança</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Ex: Pagamento da taxa de inscrição para trabalhar na Nubank, curso de capacitação profissional"
                        className="min-h-[80px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                    <p className="text-sm text-neutral-500 mt-1">
                      Descreva como é realizada a cobrança. A IA usará essa descrição para gerar um checkout personalizado.
                    </p>
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

            <div className="bg-gradient-to-br from-accent to-yellow-500 rounded-lg p-6 text-white">
              <h3 className="font-semibold mb-2">Template Premium</h3>
              <p className="text-sm text-white/90">
                Todas as páginas usam o template Premium com customização completa de cores, textos e elementos.
                Use a funcionalidade de edição para personalizar sua página após a criação.
              </p>
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
