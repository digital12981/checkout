import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface ChatMessage {
  type: 'attendant' | 'user';
  content: string;
  delay: number;
}

export async function processMessagesWithAI(
  prompt: string,
  currentMessages: ChatMessage[],
  productName: string,
  price: string
): Promise<ChatMessage[]> {
  try {
    const systemPrompt = `Você é um especialista em copywriting e conversão para vendas online. 
    Sua tarefa é criar ou melhorar mensagens de chat para uma página de vendas.
    
    Produto: ${productName}
    Preço: R$ ${price}
    
    Diretrizes:
    - Crie mensagens naturais e convincentes de uma atendente de RH
    - Use técnicas de persuasão e urgência quando apropriado
    - Mantenha um tom profissional mas amigável
    - Inclua gatilhos de escassez e autoridade quando relevante
    - As mensagens devem conduzir naturalmente ao pagamento
    - Responda APENAS com um JSON válido no formato: [{"type": "attendant", "content": "mensagem", "delay": 3000}]
    - Use delays entre 2000-8000ms para mensagens normais, mais tempo para mensagens longas
    - Máximo 6-8 mensagens por sequência`;

    const userPrompt = `${prompt}

    Mensagens atuais: ${JSON.stringify(currentMessages)}
    
    Crie uma sequência de mensagens otimizada baseada na solicitação acima.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 2000
    });

    const result = JSON.parse(response.choices[0].message.content || "[]");
    
    // Ensure the result is an array
    if (Array.isArray(result)) {
      return result;
    } else if (result.messages && Array.isArray(result.messages)) {
      return result.messages;
    } else {
      throw new Error("Invalid AI response format");
    }
  } catch (error) {
    console.error("Error processing messages with AI:", error);
    throw new Error("Failed to process messages with AI");
  }
}

export function getDefaultChatMessages(productName: string, attendantName: string): ChatMessage[] {
  const firstName = "Cliente";
  
  return [
    {
      type: "attendant",
      content: `Olá ${firstName}, tudo bem? Aqui é a ${attendantName || "Tereza"}, atendente de RH.`,
      delay: 3000
    },
    {
      type: "attendant", 
      content: `Estou entrando em contato sobre ${productName}. Você tem interesse em saber mais detalhes?`,
      delay: 4000
    },
    {
      type: "attendant",
      content: "Se tiver interesse, posso te explicar todos os benefícios e como funciona o processo.",
      delay: 3000
    },
    {
      type: "attendant",
      content: "Para prosseguir, você pode realizar o pagamento clicando no botão abaixo:",
      delay: 2000
    }
  ];
}