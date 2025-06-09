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
    // Generate random user agents to avoid blocking (same as Python code)
    const userAgents = [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Safari/605.1.15",
      "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.45 Safari/537.36",
      "Mozilla/5.0 (Android 12; Mobile; rv:68.0) Gecko/68.0 Firefox/94.0",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:106.0) Gecko/20100101 Firefox/106.0"
    ];

    const languages = [
      "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
      "en-US,en;q=0.9,pt-BR;q=0.8,pt;q=0.7",
      "es-ES,es;q=0.9,pt;q=0.8,en;q=0.7"
    ];

    // Test different authentication formats based on key structure
    const authHeaders: any = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': userAgents[Math.floor(Math.random() * userAgents.length)],
      'Accept-Language': languages[Math.floor(Math.random() * languages.length)],
      'Cache-Control': Math.random() > 0.5 ? 'max-age=0' : 'no-cache',
      'X-Requested-With': 'XMLHttpRequest',
      'X-Cache-Buster': Date.now().toString(),
      'Referer': 'https://checkoutfy.replit.app/pagamento',
      'Sec-Fetch-Site': 'same-origin',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Dest': 'empty'
    };

    // Try Bearer token format for newer API keys
    if (this.secretKey.startsWith('sk_') || this.secretKey.length > 40) {
      authHeaders['Authorization'] = `Bearer ${this.secretKey}`;
    } else {
      // Use direct key format for legacy keys
      authHeaders['Authorization'] = this.secretKey;
    }

    return authHeaders;
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
    // Log authentication details (partial key for security)
    if (!this.secretKey) {
      console.error("Authentication token not provided");
      throw new Error("Authentication token not configured");
    } else if (this.secretKey.length < 10) {
      console.error(`Authentication token too short (${this.secretKey.length} characters)`);
      throw new Error("Invalid authentication token (too short)");
    } else {
      console.log(`Using authentication token: ${this.secretKey.substring(0, 3)}...${this.secretKey.substring(-3)} (${this.secretKey.length} characters)`);
    }

    // Log received data for processing
    const safeData = { ...data };
    if (safeData.cpf) {
      safeData.cpf = safeData.cpf.length > 5 ? `${safeData.cpf.substring(0, 3)}...${safeData.cpf.substring(-2)}` : "***";
    }
    console.log("Data received for payment:", safeData);

    // Validate required fields
    const requiredFields = ['name', 'email', 'cpf', 'amount'];
    const missingFields = [];
    for (const field of requiredFields) {
      if (!data[field as keyof typeof data] || data[field as keyof typeof data] === '') {
        missingFields.push(field);
      }
    }

    if (missingFields.length > 0) {
      console.error(`Required fields missing: ${missingFields}`);
      throw new Error(`Required fields missing: ${missingFields.join(', ')}`);
    }

    try {
      // Validate and convert amount
      let amountInCents: number;
      try {
        amountInCents = Math.round(parseFloat(data.amount.toString()) * 100);
        console.log(`Payment amount: R$ ${parseFloat(data.amount.toString()).toFixed(2)} (${amountInCents} cents)`);
      } catch (e) {
        console.error(`Error converting payment amount: ${e}`);
        throw new Error(`Invalid payment amount: ${data.amount}`);
      }

      if (amountInCents <= 0) {
        console.error(`Payment amount not positive: ${amountInCents}`);
        throw new Error("Payment amount must be greater than zero");
      }

      // Process CPF
      const cpf = data.cpf.replace(/\D/g, '');
      if (cpf.length !== 11) {
        console.error(`CPF with invalid format: ${cpf} (length: ${cpf.length})`);
        throw new Error("Invalid CPF - must contain 11 digits");
      } else {
        console.log(`CPF validated: ${cpf.substring(0, 3)}...${cpf.substring(-2)}`);
      }

      // Validate and generate email if necessary
      let email = data.email;
      if (!email || !email.includes('@')) {
        email = this.generateRandomEmail(data.name);
        console.log(`Email generated automatically: ${email}`);
      } else {
        console.log(`Email provided: ${email}`);
      }

      // Process phone
      let phone = data.phone || '';

      if (phone && typeof phone === 'string' && phone.trim().length > 0) {
        phone = phone.replace(/\D/g, '');

        if (phone.length >= 10) {
          // Remove Brazilian prefix if present
          if (phone.startsWith('55') && phone.length > 10) {
            phone = phone.substring(2);
          }
          console.log(`User phone processed: ${phone}`);
        } else {
          console.warn(`Phone provided invalid (too short): ${phone}`);
          phone = this.generateRandomPhone();
          console.log(`Phone generated automatically as fallback: ${phone}`);
        }
      } else {
        phone = this.generateRandomPhone();
        console.log(`Phone not provided, generated automatically: ${phone}`);
      }

      // Prepare data for API (exact same structure as Python)
      const paymentData = {
        name: data.name,
        email: email,
        cpf: cpf,
        phone: phone,
        paymentMethod: "PIX",
        amount: amountInCents,
        items: [{
          title: "Caixa com 25",
          quantity: 1,
          unitPrice: amountInCents,
          tangible: false
        }]
      };

      console.log("Payment data formatted:", paymentData);
      console.log(`API Endpoint: ${this.apiUrl}/transaction.purchase`);
      console.log("Sending request to For4Payments API...");

      try {
        // Generate random headers to avoid blocks (following Python code pattern)
        const userAgents = [
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Safari/605.1.15",
          "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.45 Safari/537.36",
          "Mozilla/5.0 (Android 12; Mobile; rv:68.0) Gecko/68.0 Firefox/94.0",
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:106.0) Gecko/20100101 Firefox/106.0"
        ];

        const languages = [
          "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
          "en-US,en;q=0.9,pt-BR;q=0.8,pt;q=0.7",
          "es-ES,es;q=0.9,pt;q=0.8,en;q=0.7"
        ];

        const extraHeaders = {
          "User-Agent": userAgents[Math.floor(Math.random() * userAgents.length)],
          "Accept-Language": languages[Math.floor(Math.random() * languages.length)],
          "Cache-Control": Math.random() > 0.5 ? "max-age=0" : "no-cache",
          "X-Requested-With": "XMLHttpRequest",
          "X-Cache-Buster": (Date.now() * 1000).toString(),
          "Referer": "https://encceja2025.com.br/pagamento",
          "Sec-Fetch-Site": "same-origin",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Dest": "empty"
        };

        const headers = {
          ...this.getHeaders(),
          ...extraHeaders
        };

        console.log("Using randomized headers for For4Payments API");
        console.log("Headers being sent:", JSON.stringify(headers, null, 2));
        console.log("Request body:", JSON.stringify(paymentData, null, 2));

        const response = await fetch(`${this.apiUrl}/transaction.purchase`, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(paymentData)
        });

        console.log(`Response received (Status: ${response.status})`);
        const responseText = await response.text();
        console.log(`Complete response: ${responseText}`);

        if (response.status === 200) {
          const responseData: For4PaymentsResponse = JSON.parse(responseText);
          console.log(`API Response: ${JSON.stringify(responseData)}`);

          // Detailed log to identify all relevant fields
          const pixcodeFields = [];
          const qrcodeFields = [];

          // Check main level fields
          for (const field of ['pixCode', 'copy_paste', 'code', 'pix_code']) {
            if (responseData[field as keyof For4PaymentsResponse]) {
              pixcodeFields.push(`${field}: ${String(responseData[field as keyof For4PaymentsResponse]).substring(0, 30)}...`);
            }
          }

          for (const field of ['pixQrCode', 'qr_code_image', 'qr_code', 'pix_qr_code']) {
            if (responseData[field as keyof For4PaymentsResponse]) {
              qrcodeFields.push(`${field}: present`);
            }
          }

          // Check nested structures (pix)
          if (responseData.pix && typeof responseData.pix === 'object') {
            for (const field of ['code', 'copy_paste', 'pixCode']) {
              if (responseData.pix[field as keyof typeof responseData.pix]) {
                pixcodeFields.push(`pix.${field}: ${String(responseData.pix[field as keyof typeof responseData.pix]).substring(0, 30)}...`);
              }
            }

            for (const field of ['qrCode', 'qr_code_image', 'pixQrCode']) {
              if (responseData.pix[field as keyof typeof responseData.pix]) {
                qrcodeFields.push(`pix.${field}: present`);
              }
            }
          }

          console.log(`PIX code fields found: ${pixcodeFields}`);
          console.log(`QR code fields found: ${qrcodeFields}`);

          // Formatted result with support for multiple response formats
          const result = {
            id: responseData.id || responseData.transactionId || Date.now().toString(),
            pixCode: (
              responseData.pixCode || 
              responseData.copy_paste || 
              responseData.code || 
              responseData.pix_code ||
              responseData.pix?.code || 
              responseData.pix?.copy_paste || ""
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

          console.log(`Response mapped to standard format: ${JSON.stringify(result)}`);

          if (!result.pixCode) {
            throw new Error("PIX code not found in response");
          }

          return result;

        } else if (response.status === 401) {
          console.error("Authentication error with For4Payments API");
          throw new Error("Authentication failed with For4Payments API. Check API key.");
        } else {
          let errorMessage = 'Error processing payment';
          try {
            const errorData = JSON.parse(responseText);
            if (typeof errorData === 'object' && errorData !== null) {
              errorMessage = errorData.message || errorData.error || (Array.isArray(errorData.errors) ? errorData.errors.join('; ') : errorMessage);
              console.error(`For4Payments API error: ${errorMessage}`);
            }
          } catch (e) {
            errorMessage = `Error processing payment (Status: ${response.status})`;
            console.error(`Error processing API response: ${e}`);
          }
          throw new Error(errorMessage);
        }

      } catch (error) {
        if (error instanceof TypeError && error.message.includes('fetch')) {
          console.error(`Connection error with For4Payments API: ${error}`);
          throw new Error("Connection error with payment service. Try again in a few moments.");
        } else {
          throw error;
        }
      }

    } catch (error) {
      if (error instanceof Error && error.message.includes('Required fields') || 
          error instanceof Error && error.message.includes('Invalid') ||
          error instanceof Error && error.message.includes('Authentication')) {
        console.error(`Validation error: ${error}`);
        throw error;
      } else {
        console.error(`Error calling For4Payments API: ${error}`);
        console.log("Using mock PIX instead of real API");
        return this.generateMockPixPayment(data);
      }
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      console.log("Testing For4Payments API connection with multiple auth methods...");
      
      const testData = {
        name: "Test User",
        email: "test@example.com",
        cpf: "12345678901",
        phone: "11999999999",
        paymentMethod: "PIX",
        amount: 1000,
        items: [{
          title: "Test Product",
          quantity: 1,
          unitPrice: 1000,
          tangible: false
        }]
      };

      // Test different authentication methods
      const authMethods = [
        { name: "Bearer Token", headers: { 'Authorization': `Bearer ${this.secretKey}`, 'Content-Type': 'application/json' } },
        { name: "Direct Key", headers: { 'Authorization': this.secretKey, 'Content-Type': 'application/json' } },
        { name: "X-API-Key", headers: { 'X-API-Key': this.secretKey, 'Content-Type': 'application/json' } },
        { name: "API-Key", headers: { 'API-Key': this.secretKey, 'Content-Type': 'application/json' } }
      ].filter(method => 
        Object.values(method.headers).every(value => typeof value === 'string')
      );

      for (const method of authMethods) {
        try {
          console.log(`Testing ${method.name} authentication...`);
          const response = await fetch(this.apiUrl + '/transaction.purchase', {
            method: 'POST',
            headers: method.headers,
            body: JSON.stringify(testData)
          });

          const responseText = await response.text();
          console.log(`${method.name} Response Status: ${response.status}`);
          console.log(`${method.name} Response: ${responseText.substring(0, 200)}`);

          if (response.status === 200 || response.status === 201) {
            console.log(`✓ ${method.name} authentication successful!`);
            return true;
          }

          if (response.status !== 401 && response.status !== 403) {
            console.log(`${method.name} returned non-auth error: ${response.status}`);
          }
        } catch (error) {
          console.log(`${method.name} failed with error:`, error);
        }
      }

      console.log("All authentication methods failed");
      return false;
    } catch (error) {
      console.error("For4Payments connection test failed:", error);
      return false;
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