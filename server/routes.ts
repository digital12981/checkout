import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertPaymentPageSchema, insertPixPaymentSchema, insertSettingSchema } from "@shared/schema";
import { createFor4PaymentsClient } from "./for4payments";
import { processTemplateWithAI, generateCheckoutTemplate } from "./ai";
import { z } from "zod";

const createPixPaymentRequestSchema = z.object({
  paymentPageId: z.number(),
  customerName: z.string().min(1),
  customerEmail: z.string().email(),
  customerCpf: z.string().min(10).transform((cpf) => {
    // Remove any formatting and pad with zeros if needed
    const cleanCpf = cpf.replace(/\D/g, '');
    return cleanCpf.padStart(11, '0');
  }),
  customerPhone: z.string().optional(),
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Payment Pages CRUD
  app.get("/api/payment-pages", async (req, res) => {
    try {
      const pages = await storage.getPaymentPages();
      res.json(pages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch payment pages" });
    }
  });

  app.get("/api/payment-pages/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const page = await storage.getPaymentPage(id);
      
      if (!page) {
        return res.status(404).json({ message: "Payment page not found" });
      }
      
      res.json(page);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch payment page" });
    }
  });

  app.post("/api/payment-pages", async (req, res) => {
    try {
      const data = insertPaymentPageSchema.parse(req.body);
      const page = await storage.createPaymentPage(data);
      res.status(201).json(page);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create payment page" });
    }
  });

  app.put("/api/payment-pages/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const data = insertPaymentPageSchema.partial().parse(req.body);
      const page = await storage.updatePaymentPage(id, data);
      
      if (!page) {
        return res.status(404).json({ message: "Payment page not found" });
      }
      
      res.json(page);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update payment page" });
    }
  });

  app.patch("/api/payment-pages/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const data = insertPaymentPageSchema.partial().parse(req.body);
      const page = await storage.updatePaymentPage(id, data);
      
      if (!page) {
        return res.status(404).json({ message: "Payment page not found" });
      }
      
      res.json(page);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update payment page" });
    }
  });

  app.delete("/api/payment-pages/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deletePaymentPage(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Payment page not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete payment page" });
    }
  });

  // PIX Payments
  app.post("/api/pix-payments", async (req, res) => {
    try {
      const requestData = createPixPaymentRequestSchema.parse(req.body);
      
      // Get payment page details
      const paymentPage = await storage.getPaymentPage(requestData.paymentPageId);
      if (!paymentPage) {
        return res.status(404).json({ message: "Payment page not found" });
      }

      // Create For4Payments client and process payment
      console.log("Creating For4Payments client...");
      
      // Always fetch fresh API key from database
      console.log("Fetching fresh API key from database...");
      const setting = await storage.getSetting("for4payments_api_key");
      console.log("Raw setting from database:", setting);
      const apiKey = setting?.value || "";
      console.log("Database API key found:", apiKey ? `Yes (${apiKey.substring(0, 8)}...)` : "No");
      console.log("Full API key for debugging:", apiKey);
      
      if (!apiKey) {
        return res.status(400).json({ 
          message: "For4Payments API key not configured. Please configure it in settings." 
        });
      }
      
      const { For4PaymentsAPI } = await import("./for4payments");
      const for4payments = new For4PaymentsAPI(apiKey);
      console.log("For4Payments client created successfully with key:", apiKey.substring(0, 8) + "...");
      
      let pixResponse;
      
      // Check if we have a configured API key
      if (!apiKey || apiKey.length < 30) {
        return res.status(503).json({
          message: "Serviço de pagamento não configurado. Configure uma chave válida da For4Payments nas configurações do sistema.",
          error: "Chave da API For4Payments é obrigatória",
          suggestion: "Acesse as configurações do sistema e configure sua chave da API For4Payments"
        });
      }

      pixResponse = await for4payments.createPixPayment({
        name: requestData.customerName,
        email: requestData.customerEmail,
        cpf: requestData.customerCpf,
        phone: requestData.customerPhone,
        amount: parseFloat(paymentPage.price),
      });

      // Store payment in database
      const pixPaymentData = {
        paymentPageId: requestData.paymentPageId,
        customerName: requestData.customerName,
        customerEmail: requestData.customerEmail,
        customerCpf: requestData.customerCpf,
        customerPhone: requestData.customerPhone || null,
        amount: paymentPage.price,
        pixCode: pixResponse.pixCode,
        pixQrCode: pixResponse.pixQrCode || null,
        transactionId: pixResponse.id,
        status: pixResponse.status,
        expiresAt: pixResponse.expiresAt ? new Date(pixResponse.expiresAt) : null,
      };

      const payment = await storage.createPixPayment(pixPaymentData);
      res.status(201).json(payment);
    } catch (error) {
      console.error('PIX payment error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      // Provide specific error messages for different scenarios
      let errorMessage = "Failed to create PIX payment";
      let statusCode = 500;
      
      if (error instanceof Error) {
        if (error.message.includes("authentication") || error.message.includes("Unauthorized") || error.message.includes("For4Payments")) {
          errorMessage = "Erro de autenticação com a For4Payments. Verifique se a chave da API está válida e ativa nas configurações do sistema.";
          statusCode = 503; // Service Unavailable
        } else if (error.message.includes("Connection") || error.message.includes("fetch")) {
          errorMessage = "Payment service temporarily unavailable. Please try again in a few moments.";
          statusCode = 503;
        } else {
          errorMessage = error.message;
        }
      }
      
      res.status(statusCode).json({ 
        message: errorMessage,
        error: error instanceof Error ? error.message : "Unknown error",
        suggestion: statusCode === 503 ? "Please check your API key configuration or contact support if the issue persists." : undefined
      });
    }
  });

  app.get("/api/pix-payments", async (req, res) => {
    try {
      const payments = await storage.getPixPayments();
      res.json(payments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch PIX payments" });
    }
  });

  app.get("/api/pix-payments/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const payment = await storage.getPixPayment(id);
      
      if (!payment) {
        return res.status(404).json({ message: "PIX payment not found" });
      }
      
      res.json(payment);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch PIX payment" });
    }
  });

  // Stats endpoint
  app.get("/api/stats", async (req, res) => {
    try {
      const pages = await storage.getPaymentPages();
      const payments = await storage.getPixPayments();
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const paymentsToday = payments.filter(p => {
        const paymentDate = new Date(p.createdAt);
        paymentDate.setHours(0, 0, 0, 0);
        return paymentDate.getTime() === today.getTime();
      });

      const totalRevenue = payments
        .filter(p => p.status === 'paid' || p.status === 'completed')
        .reduce((sum, p) => sum + parseFloat(p.amount), 0);

      const conversionRate = payments.length > 0 
        ? (payments.filter(p => p.status === 'paid' || p.status === 'completed').length / payments.length) * 100
        : 0;

      res.json({
        totalPages: pages.length,
        paymentsToday: paymentsToday.length,
        totalRevenue,
        conversionRate: Math.round(conversionRate)
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Settings endpoints
  app.get("/api/settings", async (req, res) => {
    try {
      const settings = await storage.getSettings();
      const settingsObject = settings.reduce((acc, setting) => {
        acc[setting.key] = setting.value;
        return acc;
      }, {} as Record<string, string>);
      res.json(settingsObject);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  app.get("/api/settings/:key", async (req, res) => {
    try {
      const setting = await storage.getSetting(req.params.key);
      if (!setting) {
        return res.status(404).json({ message: "Setting not found" });
      }
      res.json({ key: setting.key, value: setting.value });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch setting" });
    }
  });

  app.post("/api/settings", async (req, res) => {
    try {
      const { key, value } = req.body;
      if (!key || !value) {
        return res.status(400).json({ message: "Key and value are required" });
      }
      const setting = await storage.setSetting(key, value);
      res.json(setting);
    } catch (error) {
      res.status(500).json({ message: "Failed to save setting" });
    }
  });

  app.post("/api/settings/test-for4payments", async (req, res) => {
    try {
      const { apiKey } = req.body;
      if (!apiKey) {
        return res.status(400).json({ message: "API key is required" });
      }

      // Test the API key by making a simple request
      const testResponse = await fetch("https://app.for4payments.com.br/api/v1/transaction.purchase", {
        method: 'POST',
        headers: {
          'Authorization': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: "Test",
          email: "test@test.com",
          cpf: "12345678901",
          phone: "11999999999",
          paymentMethod: "PIX",
          amount: 100,
          items: [{
            title: "Test Item",
            quantity: 1,
            unitPrice: 100,
            tangible: false
          }]
        })
      });

      if (testResponse.status === 401) {
        return res.status(401).json({ success: false, message: "API key inválida" });
      }

      // If we get any response other than 401, the key is probably valid
      res.json({ success: true, message: "Conexão estabelecida com sucesso" });
    } catch (error) {
      res.status(500).json({ success: false, message: "Erro ao testar conexão" });
    }
  });

  // AI Template Processing
  app.post("/api/ai/process-template", async (req, res) => {
    try {
      const { command, currentTemplate } = req.body;
      
      if (!command || !currentTemplate) {
        return res.status(400).json({ message: "Missing command or currentTemplate" });
      }

      const result = await processTemplateWithAI(command, currentTemplate);
      res.json(result);
    } catch (error) {
      console.error("AI processing error:", error);
      res.status(500).json({ message: "Failed to process AI command" });
    }
  });

  // AI Checkout Generation
  app.post("/api/ai/generate-checkout", async (req, res) => {
    try {
      const { pageId, chargeDescription, productName, price } = req.body;
      
      if (!pageId || !chargeDescription || !productName || !price) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const template = await generateCheckoutTemplate(chargeDescription, productName, price);
      
      if (template && template.formData) {
        // Update the payment page with the generated template
        const updateData = {
          ...template.formData,
          price: parseFloat(template.formData.price) || parseFloat(price), // Ensure numeric
          customElements: JSON.stringify(template.customElements || [])
        };
        
        console.log("Updating page with AI template data:", JSON.stringify(updateData, null, 2));
        
        const updatedPage = await storage.updatePaymentPage(pageId, updateData);
        
        if (updatedPage) {
          console.log("Page updated successfully:", JSON.stringify(updatedPage, null, 2));
          res.json({ success: true, template, updatedPage });
        } else {
          res.status(404).json({ message: "Payment page not found" });
        }
      } else {
        res.status(500).json({ message: "Failed to generate template" });
      }
    } catch (error) {
      console.error("AI checkout generation error:", error);
      res.status(500).json({ message: "Failed to generate checkout template" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
