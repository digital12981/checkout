import express from "express";
import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

// Get __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple log function
function log(message, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

// Database setup
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool });

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Basic API routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mock routes for essential endpoints
app.get('/api/payment-pages', (req, res) => {
  res.json([{
    id: 1,
    productName: "Serviço de Exemplo",
    productDescription: "Descrição do serviço",
    price: "100.00",
    primaryColor: "#007bff",
    accentColor: "#28a745",
    backgroundColor: "#ffffff",
    textColor: "#000000",
    logoPosition: "center",
    logoSize: 100,
    headerHeight: 80,
    skipForm: false
  }]);
});

app.get('/api/stats', (req, res) => {
  res.json({
    totalPages: 1,
    paymentsToday: 0,
    totalRevenue: "0.00",
    conversionRate: 0
  });
});

app.get('/api/payment-pages/:id', (req, res) => {
  const id = parseInt(req.params.id);
  if (id === 1) {
    res.json({
      id: 1,
      productName: "Serviço de Exemplo",
      productDescription: "Descrição do serviço",
      price: "100.00",
      primaryColor: "#007bff",
      accentColor: "#28a745",
      backgroundColor: "#ffffff",
      textColor: "#000000",
      logoPosition: "center",
      logoSize: 100,
      headerHeight: 80,
      skipForm: false
    });
  } else {
    res.status(404).json({ message: "Payment page not found" });
  }
});

// Serve checkout pages
app.get('/checkout/:id', (req, res) => {
  const id = req.params.id;
  res.send(`
    <html>
      <head>
        <title>Checkout - CheckoutFy</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
          .checkout-container { background: #f8f9fa; padding: 30px; border-radius: 8px; text-align: center; }
          .btn { background: #007bff; color: white; padding: 12px 24px; border: none; border-radius: 4px; cursor: pointer; }
          .btn:hover { background: #0056b3; }
        </style>
      </head>
      <body>
        <div class="checkout-container">
          <h1>CheckoutFy</h1>
          <h2>Página de Pagamento #${id}</h2>
          <p>Serviço: Serviço de Exemplo</p>
          <p>Valor: R$ 100,00</p>
          <p><strong>Sistema em modo de demonstração</strong></p>
          <p>Configure suas API keys para processar pagamentos reais.</p>
          <button class="btn" onclick="alert('Demo mode - configure API keys')">Pagar com PIX</button>
        </div>
      </body>
    </html>
  `);
});

// Serve static files
const publicPath = path.resolve(process.cwd(), "public");
if (fs.existsSync(publicPath)) {
  app.use(express.static(publicPath));
  app.use("*", (req, res) => {
    res.sendFile(path.resolve(publicPath, "index.html"));
  });
} else {
  app.use("*", (req, res) => {
    res.send(`
      <html>
        <body>
          <h1>CheckoutFy</h1>
          <p>Servidor funcionando! Timestamp: ${new Date().toISOString()}</p>
          <p>Ambiente: ${process.env.NODE_ENV}</p>
        </body>
      </html>
    `);
  });
}

// Start server
const port = process.env.PORT || 5000;
app.listen(port, "0.0.0.0", () => {
  log(`serving on port ${port}`);
});