import fetch from 'node-fetch';

async function testFor4Payments() {
  try {
    const response = await fetch('https://app.for4payments.com.br/api/v1/pix/charge', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': '893adcb5-27a5-4ec7-b17a-15ae52b5457c'
      },
      body: JSON.stringify({
        name: 'João da Silva',
        email: 'joao@example.com',
        cpf: '12345678901',
        phone: '11987654321',
        amount: 50.00,
        description: 'Teste de pagamento PIX'
      })
    });

    console.log('Status:', response.status);
    console.log('Headers:', response.headers.raw());
    
    const text = await response.text();
    console.log('Response:', text);
    
    if (response.ok) {
      console.log('✅ For4Payments API está funcionando!');
    } else {
      console.log('❌ Erro na API For4Payments');
    }
    
  } catch (error) {
    console.error('Erro de conexão:', error.message);
  }
}

testFor4Payments();