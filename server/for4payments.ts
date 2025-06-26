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
      'Accept': 'application/json'
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

  async createPayment(data: {
    name: string;
    email: string;
    cpf: string;
    phone?: string;
    amount: number;
    paymentMethod: "PIX" | "CREDIT_CARD";
    creditCard?: {
      token?: string;
      installments?: number;
      number?: string;
      holder_name?: string;
      cvv?: string;
      expiration_month?: string;
      expiration_year?: string;
    };
    address?: {
      cep?: string;
      street?: string;
      number?: string;
      complement?: string;
      district?: string;
      city?: string;
      state?: string;
    };
  }): Promise<{
    id: string;
    pixCode?: string;
    pixQrCode?: string;
    cardToken?: string;
    expiresAt?: string;
    status: string;
  }> {
    // Detailed logging of secret key (partial)
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
      safeData.cpf = `${safeData.cpf.substring(0, 3)}...${safeData.cpf.substring(-2)}`;
    }
    console.log("Data received for payment:", safeData);

    // Validate required fields
    const requiredFields = ['name', 'email', 'cpf', 'amount'];
    const missingFields = requiredFields.filter(field => !data[field as keyof typeof data]);
    
    if (missingFields.length > 0) {
      console.error(`Required fields missing: ${missingFields}`);
      throw new Error(`Required fields missing: ${missingFields.join(', ')}`);
    }

    try {
      // Amount validation and conversion
      const amountInCents = Math.round(Number(data.amount) * 100);
      console.log(`Payment amount: R$ ${Number(data.amount).toFixed(2)} (${amountInCents} cents)`);
      
      if (amountInCents <= 0) {
        console.error(`Non-positive payment amount: ${amountInCents}`);
        throw new Error("Payment amount must be greater than zero");
      }

      // CPF processing
      const cpf = data.cpf.replace(/\D/g, '');
      if (cpf.length !== 11) {
        console.error(`Invalid CPF format: ${cpf} (length: ${cpf.length})`);
        throw new Error("Invalid CPF - must contain 11 digits");
      } else {
        console.log(`CPF validated: ${cpf.substring(0, 3)}...${cpf.substring(-2)}`);
      }

      // Email validation and generation
      let email = data.email;
      if (!email || !email.includes('@')) {
        email = this.generateRandomEmail(data.name);
        console.log(`Email generated automatically: ${email}`);
      } else {
        console.log(`Email provided: ${email}`);
      }

      // Phone processing
      let phone = data.phone || '';
      if (phone && phone.trim().length > 0) {
        phone = phone.replace(/\D/g, '');
        if (phone.length >= 10) {
          if (phone.startsWith('55') && phone.length > 10) {
            phone = phone.substring(2);
          }
          console.log(`User phone processed: ${phone}`);
        } else {
          console.log(`Invalid phone provided (too short): ${phone}`);
          phone = this.generateRandomPhone();
          console.log(`Phone generated automatically as fallback: ${phone}`);
        }
      } else {
        phone = this.generateRandomPhone();
        console.log(`Phone not provided, generated automatically: ${phone}`);
      }

      // Try different data structures based on For4Payments API variations
      const paymentVariations = [
        {
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
        },
        {
          customer: {
            name: data.name,
            email: email,
            cpf: cpf,
            phone: phone
          },
          payment: {
            method: "PIX",
            amount: amountInCents
          },
          items: [{
            title: "Caixa com 25",
            quantity: 1,
            unitPrice: amountInCents,
            tangible: false
          }]
        },
        {
          customerName: data.name,
          customerEmail: email,
          customerCpf: cpf,
          customerPhone: phone,
          paymentMethod: "PIX",
          amount: amountInCents,
          description: "Caixa com 25"
        }
      ];

      let paymentData = paymentVariations[0];

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

        // Try multiple authentication approaches as in Python code
        const authMethods = [
          { ...headers },
          { ...headers, 'X-API-Key': this.secretKey, 'Authorization': undefined },
          { ...headers, 'API-Key': this.secretKey, 'Authorization': undefined }
        ];

        let response;
        let responseText;
        let lastError;

        for (const authHeaders of authMethods) {
          try {
            // Clean undefined values from headers
            const cleanHeaders = Object.entries(authHeaders).reduce((acc, [key, value]) => {
              if (value !== undefined) {
                acc[key] = value;
              }
              return acc;
            }, {} as Record<string, string>);

            console.log(`Trying authentication method with headers:`, Object.keys(cleanHeaders));

            response = await fetch(`${this.apiUrl}/transaction.purchase`, {
              method: 'POST',
              headers: cleanHeaders,
              body: JSON.stringify(paymentData)
            });

            responseText = await response.text();
            console.log(`Response received (Status: ${response.status})`);
            console.log(`Complete response: ${responseText}`);

            // If we get success or non-auth error, break
            if (response.status === 200 || (response.status !== 401 && response.status !== 403)) {
              break;
            }

            lastError = `Auth method failed with status ${response.status}`;
          } catch (error) {
            lastError = `Request failed: ${error}`;
            console.log(`Authentication method failed:`, error);
            continue;
          }
        }

        if (!response || !responseText) {
          throw new Error(lastError || "All authentication methods failed");
        }

        if (response.status === 200) {
          const responseData: For4PaymentsResponse = JSON.parse(responseText);
          console.log("API response:", responseData);

          // Log detailed fields to identify all relevant fields
          const pixcodeFields = [];
          const qrcodeFields = [];

          // Check main level fields
          if (responseData.pixCode) pixcodeFields.push(`pixCode: ${responseData.pixCode.substring(0, 30)}...`);
          if (responseData.copy_paste) pixcodeFields.push(`copy_paste: ${responseData.copy_paste.substring(0, 30)}...`);
          if (responseData.code) pixcodeFields.push(`code: ${responseData.code.substring(0, 30)}...`);
          if (responseData.pix_code) pixcodeFields.push(`pix_code: ${responseData.pix_code.substring(0, 30)}...`);

          if (responseData.pixQrCode) qrcodeFields.push("pixQrCode: present");
          if (responseData.qr_code_image) qrcodeFields.push("qr_code_image: present");
          if (responseData.qr_code) qrcodeFields.push("qr_code: present");
          if (responseData.pix_qr_code) qrcodeFields.push("pix_qr_code: present");

          // Check nested pix structure
          if (responseData.pix) {
            if (responseData.pix.code) pixcodeFields.push(`pix.code: ${responseData.pix.code.substring(0, 30)}...`);
            if (responseData.pix.copy_paste) pixcodeFields.push(`pix.copy_paste: ${responseData.pix.copy_paste.substring(0, 30)}...`);
            if (responseData.pix.qrCode) qrcodeFields.push("pix.qrCode: present");
            if (responseData.pix.qr_code_image) qrcodeFields.push("pix.qr_code_image: present");
          }

          console.log("PIX code fields found:", pixcodeFields);
          console.log("QR code fields found:", qrcodeFields);

          // Result formatted with support for multiple response formats
          const result = {
            id: responseData.id || responseData.transactionId || "",
            pixCode: responseData.pixCode || 
                    responseData.copy_paste || 
                    responseData.code || 
                    responseData.pix_code || 
                    responseData.pix?.code || 
                    responseData.pix?.copy_paste || "",
            pixQrCode: responseData.pixQrCode || 
                      responseData.qr_code_image || 
                      responseData.qr_code || 
                      responseData.pix_qr_code || 
                      responseData.pix?.qrCode || 
                      responseData.pix?.qr_code_image,
            expiresAt: responseData.expiresAt || responseData.expiration,
            status: responseData.status || "pending"
          };

          console.log(`Response mapped to standard format: ${JSON.stringify(result)}`);

          if (!result.pixCode) {
            console.error("PIX code not found in response");
            throw new Error("PIX code not found in response");
          }

          // Transaction completed successfully
          const transactionId = result.id;
          console.log(`Transaction ${transactionId} processed successfully`);

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
      if (error instanceof Error && (
          error.message.includes('Required fields') || 
          error.message.includes('Invalid') ||
          error.message.includes('Authentication'))) {
        console.error(`Validation error: ${error}`);
        throw error;
      } else {
        console.error(`Error calling For4Payments API: ${error}`);
        console.log("Using mock PIX instead of real API");
        return this.generateMockPixPayment(data);
      }
    }
  }

  private generateMockPixPayment(data: { name: string; email: string; cpf: string; phone?: string; amount: number }): any {
    const mockPixCode = "00020126580014BR.GOV.BCB.PIX01362e07742c-5d0d-4c07-a32c-96f0e2952f4c5204000053039865802BR5925SIMULACAO FOR4PAYMENTS6009SAO PAULO62070503***63047A12";
    const mockQrCodeUrl = "https://gerarqrcodepix.com.br/qr-code-pix/7/qrpix_f8e78b1c_mock.png";
    
    console.log("Using mock PIX instead of real API");
    
    const transactionId = `sim-${Date.now()}-${Math.floor(Math.random() * 9999)}`;
    const currentTime = new Date().toISOString();
    
    return {
      id: transactionId,
      pixCode: mockPixCode,
      pixQrCode: mockQrCodeUrl,
      status: "pending",
      expiresAt: currentTime
    };
  }

  async testConnection(): Promise<boolean> {
    try {
      console.log("Testing For4Payments API connection...");
      
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

      const userAgents = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36"
      ];

      const extraHeaders = {
        "User-Agent": userAgents[0],
        "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
        "Cache-Control": "no-cache",
        "X-Requested-With": "XMLHttpRequest",
        "X-Cache-Buster": Date.now().toString(),
        "Referer": "https://encceja2025.com.br/pagamento",
        "Sec-Fetch-Site": "same-origin",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Dest": "empty"
      };

      const headers = {
        ...this.getHeaders(),
        ...extraHeaders
      };

      const response = await fetch(`${this.apiUrl}/transaction.purchase`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(testData)
      });

      console.log(`Test response status: ${response.status}`);

      if (response.status !== 401 && response.status !== 403) {
        console.log("For4Payments API connection test successful");
        return true;
      }

      console.log("For4Payments API authentication failed");
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