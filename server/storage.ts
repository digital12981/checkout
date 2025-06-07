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
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

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

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getPaymentPages(): Promise<PaymentPage[]> {
    return await db.select().from(paymentPages).orderBy(desc(paymentPages.createdAt));
  }

  async getPaymentPage(id: number): Promise<PaymentPage | undefined> {
    const [page] = await db.select().from(paymentPages).where(eq(paymentPages.id, id));
    return page || undefined;
  }

  async createPaymentPage(insertPage: InsertPaymentPage): Promise<PaymentPage> {
    const [page] = await db
      .insert(paymentPages)
      .values(insertPage)
      .returning();
    return page;
  }

  async updatePaymentPage(id: number, updateData: Partial<InsertPaymentPage>): Promise<PaymentPage | undefined> {
    const [page] = await db
      .update(paymentPages)
      .set(updateData)
      .where(eq(paymentPages.id, id))
      .returning();
    return page || undefined;
  }

  async deletePaymentPage(id: number): Promise<boolean> {
    const result = await db.delete(paymentPages).where(eq(paymentPages.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getPixPayments(): Promise<PixPayment[]> {
    return await db.select().from(pixPayments).orderBy(desc(pixPayments.createdAt));
  }

  async getPixPayment(id: number): Promise<PixPayment | undefined> {
    const [payment] = await db.select().from(pixPayments).where(eq(pixPayments.id, id));
    return payment || undefined;
  }

  async getPixPaymentsByPageId(pageId: number): Promise<PixPayment[]> {
    const payments = await db.select().from(pixPayments).where(eq(pixPayments.paymentPageId, pageId));
    return payments;
  }

  async createPixPayment(insertPayment: InsertPixPayment): Promise<PixPayment> {
    const [payment] = await db
      .insert(pixPayments)
      .values(insertPayment)
      .returning();
    return payment;
  }

  async updatePixPayment(id: number, updateData: Partial<InsertPixPayment>): Promise<PixPayment | undefined> {
    const [payment] = await db
      .update(pixPayments)
      .set(updateData)
      .where(eq(pixPayments.id, id))
      .returning();
    return payment || undefined;
  }
}

export const storage = new DatabaseStorage();
