import Anthropic from '@anthropic-ai/sdk';

// the newest Anthropic model is "claude-sonnet-4-20250514" which was released May 14, 2025. Use this by default unless user has already selected claude-3-7-sonnet-20250219
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface TemplateData {
  formData: any;
  customElements: any[];
  currentTab?: string;
}

function getBrandColors(brandName: string): string {
  const brandColors: Record<string, any> = {
    'nubank': {
      primaryColor: '#8A05BE',
      accentColor: '#FFFFFF',
      backgroundColor: '#F5F5F5',
      textColor: '#000000',
      designNotes: 'Purple primary with white accents and clean minimalist design'
    },
    'pagbank': {
      primaryColor: '#00AA55',
      accentColor: '#FFFFFF',
      backgroundColor: '#F8F9FA',
      textColor: '#212529',
      designNotes: 'Green primary with white accents and modern interface'
    },
    'itau': {
      primaryColor: '#EC7000',
      accentColor: '#FFFFFF',
      backgroundColor: '#F5F5F5',
      textColor: '#333333',
      designNotes: 'Orange primary with clean white backgrounds'
    },
    'bradesco': {
      primaryColor: '#CC092F',
      accentColor: '#FFFFFF',
      backgroundColor: '#F8F9FA',
      textColor: '#212529',
      designNotes: 'Red primary with white accents and professional look'
    }
  };
  
  const brand = brandColors[brandName.toLowerCase()];
  return brand ? JSON.stringify(brand) : '{}';
}

export async function processTemplateWithAI(command: string, currentTemplate: TemplateData): Promise<any> {
  try {
    // Check if the command mentions specific brands and get their colors
    let brandResearch = "";
    const brandMatch = command.match(/\b(nubank|pagbank|pix|itau|bradesco|santander|banco do brasil|bb|caixa|inter|c6|picpay|stone|cielo|mercado pago|paypal)\b/i);
    
    if (brandMatch) {
      const brandName = brandMatch[1];
      const research = getBrandColors(brandName);
      brandResearch = `Brand research for ${brandName}: ${research}`;
    }

    const systemPrompt = `You are a professional UI/UX designer. Modify payment templates based on commands while preserving PIX functionality.

RULES:
1. NEVER break PIX payment functionality
2. PRESERVE logos: If showLogo=true and logoUrl exists, keep them unchanged
3. ENSURE text contrast: Light backgrounds use dark text, dark backgrounds use light text
4. Return ONLY valid JSON, no explanations or markdown
5. For urgency elements: Add countdown timers, limited offers, "Últimas unidades", scarcity messages
6. Position elements: negative=header, 0-99=form, 100+=payment page

Current template structure:
- formData: Contains colors, texts, layout options, and configuration
- customElements: Array of custom text/image elements with positions
Text element: {id, type:"text", position, content, styles:{color, backgroundColor, isBold, hasBox, boxColor, fontSize, textAlign}}
Image element: {id, type:"image", position, content, styles:{imageSize, borderRadius}}

${brandResearch ? `Brand: ${brandResearch}` : ""}

Return JSON only:`;

    const userPrompt = `Current template:
${JSON.stringify(currentTemplate, null, 2)}

User command: "${command}"

Modify the template according to the command while preserving PIX payment functionality. Return the updated template as JSON.`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [
        { role: "user", content: `${systemPrompt}\n\n${userPrompt}` }
      ],
    });

    const content = response.content[0];
    if (content.type === 'text') {
      try {
        // Clean the response to extract JSON
        let jsonText = content.text.trim();
        
        // Remove markdown code blocks if present
        if (jsonText.startsWith('```json')) {
          jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (jsonText.startsWith('```')) {
          jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        
        // Find JSON object boundaries
        const jsonStart = jsonText.indexOf('{');
        const jsonEnd = jsonText.lastIndexOf('}');
        
        if (jsonStart !== -1 && jsonEnd !== -1) {
          jsonText = jsonText.substring(jsonStart, jsonEnd + 1);
        }
        
        const result = JSON.parse(jsonText);
        return result;
      } catch (parseError) {
        console.error("Error parsing AI response:", parseError);
        console.error("Raw response:", content.text);
        return currentTemplate;
      }
    }

    return currentTemplate;
  } catch (error) {
    console.error("Error processing template with AI:", error);
    throw error;
  }
}