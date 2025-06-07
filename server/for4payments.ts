import { type PixPayment } from "@shared/schema";

interface For4PaymentsResponse {
  id?: string;
  transactionId?: string;
  pixCode?: string;
  copy_paste?: string;
  code?: string;
  pix_code?: string;
  pixQrCode?: string;
  qr_code_image?: string;
  qr_code?: string;
  pix_qr_code?: string;
  expiresAt?: string;
  expiration?: string;
  status?: string;
  pix?: {
    code?: string;
    copy_paste?: string;
    qrCode?: string;
    qr_code_image?: string;
  };
}

export class For4PaymentsAPI {
  private apiUrl = "https://app.for4payments.com.br/api/v1";
  private secretKey: string;

  constructor(secretKey: string) {
    this.secretKey = secretKey;
  }

  private getHeaders() {
    return {
      'Authorization': this.secretKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
      'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      'Cache-Control': 'no-cache',
      'X-Requested-With': 'XMLHttpRequest',
      'Referer': 'https://checkoutfy.com/pagamento',
      'Sec-Fetch-Site': 'same-origin',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Dest': 'empty'
    };
  }

  private generateRandomEmail(name: string): string {
    const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const domains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];
    const domain = domains[Math.floor(Math.random() * domains.length)];
    return `${cleanName}${randomNum}@${domain}`;
  }

  private generateRandomPhone(): string {
    const ddd = Math.floor(11 + Math.random() * 88);
    const number = Math.floor(100000000 + Math.random() * 900000000);
    return `${ddd}${number}`;
  }

  async createPixPayment(data: {
    name: string;
    email: string;
    cpf: string;
    phone?: string;
    amount: number;
  }): Promise<{
    id: string;
    pixCode: string;
    pixQrCode?: string;
    expiresAt?: string;
    status: string;
  }> {
    if (!this.secretKey) {
      throw new Error("For4Payments API key not configured");
    }

    // Validate and process amount
    const amountInCents = Math.round(data.amount * 100);
    if (amountInCents <= 0) {
      throw new Error("Amount must be greater than zero");
    }

    // Process CPF
    const cpf = data.cpf.replace(/\D/g, '');
    if (cpf.length !== 11) {
      throw new Error("Invalid CPF - must contain 11 digits");
    }

    // Validate and generate email if needed
    let email = data.email;
    if (!email || !email.includes('@')) {
      email = this.generateRandomEmail(data.name);
    }

    // Process phone
    let phone = data.phone || '';
    if (phone) {
      phone = phone.replace(/\D/g, '');
      if (phone.startsWith('55') && phone.length > 10) {
        phone = phone.substring(2);
      }
    }
    if (!phone || phone.length < 10) {
      phone = this.generateRandomPhone();
    }

    const paymentData = {
      name: data.name,
      email: email,
      cpf: cpf,
      phone: phone,
      paymentMethod: "PIX",
      amount: amountInCents,
      items: [{
        title: "Pagamento via CheckoutFy",
        quantity: 1,
        unitPrice: amountInCents,
        tangible: false
      }]
    };

    try {
      const response = await fetch(`${this.apiUrl}/transaction.purchase`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(paymentData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`For4Payments API error (${response.status}): ${errorText}`);
      }

      const responseData: For4PaymentsResponse = await response.json();

      return {
        id: responseData.id || responseData.transactionId || `tx_${Date.now()}`,
        pixCode: (
          responseData.pixCode || 
          responseData.copy_paste || 
          responseData.code || 
          responseData.pix_code ||
          responseData.pix?.code || 
          responseData.pix?.copy_paste || 
          ''
        ),
        pixQrCode: (
          responseData.pixQrCode || 
          responseData.qr_code_image || 
          responseData.qr_code || 
          responseData.pix_qr_code ||
          responseData.pix?.qrCode || 
          responseData.pix?.qr_code_image
        ),
        expiresAt: responseData.expiresAt || responseData.expiration,
        status: responseData.status || 'pending'
      };
    } catch (error) {
      console.error('For4Payments API error:', error);
      throw new Error(`Payment processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export async function createFor4PaymentsClient(): Promise<For4PaymentsAPI> {
  // First try environment variable
  let secretKey = process.env.FOR4PAYMENTS_API_KEY || process.env.FOR4PAYMENTS_SECRET_KEY || "";
  console.log("Environment API key found:", secretKey ? "Yes" : "No");
  
  // If not found in env, try to get from database settings
  if (!secretKey) {
    try {
      console.log("Fetching API key from database...");
      const { storage } = await import("./storage");
      const setting = await storage.getSetting("for4payments_api_key");
      secretKey = setting?.value || "";
      console.log("Database API key found:", secretKey ? `Yes (${secretKey.substring(0, 8)}...)` : "No");
    } catch (error) {
      console.log("Could not fetch API key from database:", error);
    }
  }
  
  if (!secretKey) {
    throw new Error("For4Payments API key not found. Please configure it in settings.");
  }
  
  console.log("Using API key:", secretKey.substring(0, 8) + "...");
  return new For4PaymentsAPI(secretKey);
}
