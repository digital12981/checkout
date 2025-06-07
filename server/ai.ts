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

    const systemPrompt = `You are a professional UI/UX designer and developer specializing in payment checkout templates. Your task is to modify checkout payment templates based on user commands while preserving the core PIX payment functionality.

CRITICAL RULES:
1. NEVER remove or break the PIX payment integration functionality
2. Preserve all form fields necessary for payment processing
3. Maintain QR code and PIX code display functionality
4. Keep the checkout flow functional (form → payment page)
5. PRESERVE EXISTING LOGOS: If showLogo is true and logoUrl exists, NEVER remove or change these values
6. ENSURE COLOR CONTRAST: When adding text elements, always use colors that contrast well with backgrounds
7. When adding new elements, respect the currentTab context (form elements go to form preview, payment elements go to payment preview)
8. Always return valid JSON with the exact structure provided
9. For text elements with backgrounds (hasBox: true), ensure text color contrasts with boxColor
10. For text elements without backgrounds, ensure text color contrasts with the page backgroundColor

Current template structure:
- formData: Contains colors, texts, layout options, and configuration
- customElements: Array of custom text/image elements with positions
- Positions: negative numbers = header area, 0-99 = form area, 100+ = payment page area

Available formData fields:
- productName, productDescription, price
- primaryColor, accentColor, backgroundColor, textColor
- customTitle, customSubtitle, customButtonText, customInstructions
- showLogo, logoUrl, logoPosition, logoSize, headerHeight

COLOR CONTRAST GUIDELINES:
- Light backgrounds (#F5F5F5, #FFFFFF, #F8F9FA): Use dark text (#000000, #333333, #212529)
- Dark backgrounds (#000000, #333333, #8A05BE): Use light text (#FFFFFF, #F5F5F5)
- Colored backgrounds: Choose contrasting text colors that ensure readability
- For boxed text elements: Ensure text color contrasts with the box background color
- Never use the same or similar colors for text and its background

Custom elements structure:
{
  id: string,
  type: "text" | "image",
  position: number,
  content: string,
  styles: {
    color?, backgroundColor?, isBold?, hasBox?, boxColor?,
    imageSize?, borderRadius?, fontSize?, textAlign?
  }
}

${brandResearch ? `\nBrand Research:\n${brandResearch}` : ""}

Return ONLY a JSON object with the modified template. Do not include explanations.`;

    const userPrompt = `Current template:
${JSON.stringify(currentTemplate, null, 2)}

User command: "${command}"

Modify the template according to the command while preserving PIX payment functionality. Return the updated template as JSON.`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      messages: [
        { role: "user", content: `${systemPrompt}\n\n${userPrompt}` }
      ],
    });

    const content = response.content[0];
    if (content.type === 'text') {
      try {
        const result = JSON.parse(content.text);
        return result;
      } catch (parseError) {
        console.error("Error parsing AI response:", parseError);
        return currentTemplate;
      }
    }

    return currentTemplate;
  } catch (error) {
    console.error("Error processing template with AI:", error);
    throw error;
  }
}