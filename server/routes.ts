import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertPaymentPageSchema, insertPixPaymentSchema } from "@shared/schema";
import { createFor4PaymentsClient } from "./for4payments";
import { z } from "zod";

const createPixPaymentRequestSchema = z.object({
  paymentPageId: z.number(),
  customerName: z.string().min(1),
  customerEmail: z.string().email(),
  customerCpf: z.string().min(11),
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
      const for4payments = createFor4PaymentsClient();
      const pixResponse = await for4payments.createPixPayment({
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
      res.status(500).json({ 
        message: "Failed to create PIX payment", 
        error: error instanceof Error ? error.message : "Unknown error"
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

  const httpServer = createServer(app);
  return httpServer;
}
