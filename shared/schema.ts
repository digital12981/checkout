import { pgTable, text, serial, integer, boolean, timestamp, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const paymentPages = pgTable("payment_pages", {
  id: serial("id").primaryKey(),
  productName: text("product_name").notNull(),
  productDescription: text("product_description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  template: text("template").notNull().default("premium"),
  
  // Customization fields for Premium template
  primaryColor: text("primary_color").default("#3B82F6"),
  accentColor: text("accent_color").default("#10B981"),
  backgroundColor: text("background_color").default("#F8FAFC"),
  textColor: text("text_color").default("#1F2937"),
  
  // Custom texts
  customTitle: text("custom_title"),
  customSubtitle: text("custom_subtitle"),
  customButtonText: text("custom_button_text").default("Pagar com PIX"),
  customInstructions: text("custom_instructions"),
  
  // Layout options
  showLogo: boolean("show_logo").default(true),
  logoUrl: text("logo_url"),
  logoPosition: text("logo_position").default("center"), // left, center, right
  logoSize: integer("logo_size").default(64),
  headerHeight: integer("header_height").default(96),
  
  // Custom elements (JSON array of draggable elements)
  customElements: text("custom_elements").default("[]"),
  
  // Rendered template structure (saved HTML structure)
  templateStructure: text("template_structure"),
  
  // Skip form option
  skipForm: boolean("skip_form").default(false),
  
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const pixPayments = pgTable("pix_payments", {
  id: serial("id").primaryKey(),
  paymentPageId: integer("payment_page_id").references(() => paymentPages.id).notNull(),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email").notNull(),
  customerCpf: text("customer_cpf").notNull(),
  customerPhone: text("customer_phone"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  pixCode: text("pix_code"),
  pixQrCode: text("pix_qr_code"),
  transactionId: text("transaction_id"),
  status: text("status").notNull().default("pending"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertPaymentPageSchema = createInsertSchema(paymentPages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPixPaymentSchema = createInsertSchema(pixPayments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSettingSchema = createInsertSchema(settings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertPaymentPage = z.infer<typeof insertPaymentPageSchema>;
export type PaymentPage = typeof paymentPages.$inferSelect;

export type InsertPixPayment = z.infer<typeof insertPixPaymentSchema>;
export type PixPayment = typeof pixPayments.$inferSelect;

export type InsertSetting = z.infer<typeof insertSettingSchema>;
export type Setting = typeof settings.$inferSelect;
