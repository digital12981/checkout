import { 
  users, 
  paymentPages, 
  pixPayments,
  type User, 
  type InsertUser,
  type PaymentPage,
  type InsertPaymentPage,
  type PixPayment,
  type InsertPixPayment
} from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Payment Pages
  getPaymentPages(): Promise<PaymentPage[]>;
  getPaymentPage(id: number): Promise<PaymentPage | undefined>;
  createPaymentPage(page: InsertPaymentPage): Promise<PaymentPage>;
  updatePaymentPage(id: number, page: Partial<InsertPaymentPage>): Promise<PaymentPage | undefined>;
  deletePaymentPage(id: number): Promise<boolean>;
  
  // PIX Payments
  getPixPayments(): Promise<PixPayment[]>;
  getPixPayment(id: number): Promise<PixPayment | undefined>;
  getPixPaymentsByPageId(pageId: number): Promise<PixPayment[]>;
  createPixPayment(payment: InsertPixPayment): Promise<PixPayment>;
  updatePixPayment(id: number, payment: Partial<InsertPixPayment>): Promise<PixPayment | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private paymentPages: Map<number, PaymentPage>;
  private pixPayments: Map<number, PixPayment>;
  private currentUserId: number;
  private currentPageId: number;
  private currentPaymentId: number;

  constructor() {
    this.users = new Map();
    this.paymentPages = new Map();
    this.pixPayments = new Map();
    this.currentUserId = 1;
    this.currentPageId = 1;
    this.currentPaymentId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getPaymentPages(): Promise<PaymentPage[]> {
    return Array.from(this.paymentPages.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getPaymentPage(id: number): Promise<PaymentPage | undefined> {
    return this.paymentPages.get(id);
  }

  async createPaymentPage(insertPage: InsertPaymentPage): Promise<PaymentPage> {
    const id = this.currentPageId++;
    const now = new Date();
    const page: PaymentPage = { 
      ...insertPage,
      productDescription: insertPage.productDescription || null,
      template: insertPage.template || "modern",
      status: insertPage.status || "active",
      id, 
      createdAt: now,
      updatedAt: now
    };
    this.paymentPages.set(id, page);
    return page;
  }

  async updatePaymentPage(id: number, updateData: Partial<InsertPaymentPage>): Promise<PaymentPage | undefined> {
    const existing = this.paymentPages.get(id);
    if (!existing) return undefined;

    const updated: PaymentPage = {
      ...existing,
      ...updateData,
      updatedAt: new Date()
    };
    this.paymentPages.set(id, updated);
    return updated;
  }

  async deletePaymentPage(id: number): Promise<boolean> {
    return this.paymentPages.delete(id);
  }

  async getPixPayments(): Promise<PixPayment[]> {
    return Array.from(this.pixPayments.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getPixPayment(id: number): Promise<PixPayment | undefined> {
    return this.pixPayments.get(id);
  }

  async getPixPaymentsByPageId(pageId: number): Promise<PixPayment[]> {
    return Array.from(this.pixPayments.values()).filter(
      payment => payment.paymentPageId === pageId
    );
  }

  async createPixPayment(insertPayment: InsertPixPayment): Promise<PixPayment> {
    const id = this.currentPaymentId++;
    const now = new Date();
    const payment: PixPayment = { 
      ...insertPayment,
      customerPhone: insertPayment.customerPhone || null,
      pixCode: insertPayment.pixCode || null,
      pixQrCode: insertPayment.pixQrCode || null,
      transactionId: insertPayment.transactionId || null,
      status: insertPayment.status || "pending",
      expiresAt: insertPayment.expiresAt || null,
      id, 
      createdAt: now,
      updatedAt: now
    };
    this.pixPayments.set(id, payment);
    return payment;
  }

  async updatePixPayment(id: number, updateData: Partial<InsertPixPayment>): Promise<PixPayment | undefined> {
    const existing = this.pixPayments.get(id);
    if (!existing) return undefined;

    const updated: PixPayment = {
      ...existing,
      ...updateData,
      updatedAt: new Date()
    };
    this.pixPayments.set(id, updated);
    return updated;
  }
}

export const storage = new MemStorage();
