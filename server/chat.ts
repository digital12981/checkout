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
    // Get default messages as base structure
    const defaultMessages = getDefaultChatMessages(productName, "Atendente");
    
    const systemPrompt = `Você é um especialista em copywriting e conversão para vendas online. 
    Sua tarefa é melhorar o CONTEÚDO das mensagens de chat mantendo a estrutura original.
    
    Produto: ${productName}
    Preço: R$ ${price}
    
    IMPORTANTE: Mantenha exatamente ${defaultMessages.length} mensagens. Apenas altere o CONTEÚDO (field "content").
    
    Diretrizes para o conteúdo:
    - Use técnicas de persuasão e urgência
    - Mantenha um tom profissional mas amigável
    - Inclua gatilhos de escassez e autoridade
    - As mensagens devem conduzir naturalmente ao pagamento
    - Personalize para o produto específico
    
    Responda APENAS com um JSON válido no formato exato:
    {
      "messages": [
        {"type": "attendant", "content": "primeira mensagem melhorada", "delay": 3000},
        {"type": "attendant", "content": "segunda mensagem melhorada", "delay": 8000}
      ]
    }
    
    Use os delays originais das mensagens base. Não adicione comentários ou texto extra.`;

    const userPrompt = `${prompt}

    Estrutura base de mensagens: ${JSON.stringify(defaultMessages)}
    
    Melhore apenas o CONTEÚDO das mensagens seguindo as diretrizes acima.`;

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

    const responseContent = response.choices[0].message.content;
    console.log("AI Response:", responseContent);

    if (!responseContent) {
      console.log("No AI response content, returning defaults");
      return defaultMessages;
    }

    let result;
    try {
      result = JSON.parse(responseContent);
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      return defaultMessages;
    }
    
    // Ensure we have the messages array and it matches the expected structure
    if (result.messages && Array.isArray(result.messages) && result.messages.length > 0) {
      console.log("Processing AI messages:", result.messages.length);
      // Validate and fix structure if needed
      return result.messages.map((msg: any, index: number) => ({
        type: msg.type || "attendant",
        content: msg.content || defaultMessages[index]?.content || "Mensagem padrão",
        delay: msg.delay || defaultMessages[index]?.delay || 3000
      }));
    } else {
      console.log("Invalid AI response structure, returning defaults");
      return defaultMessages;
    }
  } catch (error) {
    console.error("Error processing messages with AI:", error);
    // Return default messages if AI processing fails
    return getDefaultChatMessages(productName, "Atendente");
  }
}

export function getDefaultChatMessages(productName: string, attendantName: string): ChatMessage[] {
  const firstName = "Cliente";
  
  return [
    {
      type: "attendant",
      content: `Olá ${firstName}, tudo bem? Aqui é a ${attendantName || "Tereza"}, Coordenadora de RH.`,
      delay: 3000
    },
    {
      type: "attendant", 
      content: `Estou entrando em contato porque sua inscrição para ${productName} ainda não foi concluída. Entre os candidatos selecionados, alguns já confirmaram o agendamento, outros já realizaram e só está faltando você confirmar.`,
      delay: 8000
    },
    {
      type: "attendant",
      content: "Para finalizar o processo, vou apenas confirmar alguns dados rapidamente com você.",
      delay: 3000
    },
    {
      type: "attendant",
      content: "Se ainda tiver interesse na vaga você vai receber excelentes benefícios e estabilidade no serviço público.",
      delay: 4000
    },
    {
      type: "attendant",
      content: "Verifiquei aqui que você ainda não confirmou o agendamento. Todos os outros candidatos já confirmaram e vão ser convocados ainda essa semana.",
      delay: 6000
    },
    {
      type: "attendant",
      content: "Se você conseguir realizar o pagamento e confirmar em até 10 minutos, consigo segurar sua vaga e não passar para outro candidato.",
      delay: 4500
    },
    {
      type: "attendant",
      content: `${firstName}, você vai realizar o pagamento e confirmar ou deseja desistir da vaga?`,
      delay: 2800
    }
  ];
}