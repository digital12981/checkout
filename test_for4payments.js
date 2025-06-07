// Test script to directly test For4Payments API
const fetch = require('node-fetch');

const API_KEY = "125984ee-223b-47be-a436-ebf62847be98";
const API_URL = "https://app.for4payments.com.br/api/v1";

async function testFor4Payments() {
  const userAgents = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36"
  ];

  const headers = {
    'Authorization': API_KEY, // No "Bearer " prefix
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'User-Agent': userAgents[0],
    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    'Cache-Control': 'no-cache',
    'X-Requested-With': 'XMLHttpRequest',
    'X-Cache-Buster': Date.now().toString(),
    'Referer': 'https://checkoutfy.replit.app/pagamento',
    'Sec-Fetch-Site': 'same-origin',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Dest': 'empty'
  };

  const paymentData = {
    name: "João Silva",
    email: "joao1234@gmail.com",
    cpf: "11111111111",
    phone: "11987654321",
    paymentMethod: "PIX",
    amount: 2500, // R$ 25.00 in cents
    items: [{
      title: "Caixa com 25",
      quantity: 1,
      unitPrice: 2500,
      tangible: false
    }]
  };

  console.log("Testing For4Payments API...");
  console.log("Headers:", JSON.stringify(headers, null, 2));
  console.log("Payment data:", JSON.stringify(paymentData, null, 2));

  try {
    const response = await fetch(`${API_URL}/transaction.purchase`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(paymentData)
    });

    console.log(`Response status: ${response.status}`);
    const responseText = await response.text();
    console.log(`Response body: ${responseText}`);

    if (response.status === 200) {
      const responseData = JSON.parse(responseText);
      console.log("SUCCESS! Payment created:", responseData);
    } else {
      console.log("ERROR: API returned non-200 status");
    }

  } catch (error) {
    console.error("Request failed:", error);
  }
}

testFor4Payments();