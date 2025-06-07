import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

// the newest Anthropic model is "claude-sonnet-4-20250514" which was released May 14, 2025. Use this by default unless user has already selected claude-3-7-sonnet-20250219
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface TemplateData {
  formData: any;
  customElements: any[];
  currentTab?: string;
}

export async function researchBrandGuidelines(brandName: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a brand design expert. Provide accurate brand color palettes and design guidelines for companies. Return information in JSON format with keys: primaryColor, accentColor, backgroundColor, textColor, and designNotes."
        },
        {
          role: "user",
          content: `Provide the official brand colors and design guidelines for ${brandName}. Include hex color codes for primary color, accent color, background color, and text color commonly used in their payment interfaces.`
        }
      ],
      response_format: { type: "json_object" },
    });

    return response.choices[0].message.content || "{}";
  } catch (error) {
    console.error("Error researching brand guidelines:", error);
    return "{}";
  }
}

export async function processTemplateWithAI(command: string, currentTemplate: TemplateData): Promise<any> {
  try {
    // First, check if the command mentions specific brands and research them
    let brandResearch = "";
    const brandMatch = command.match(/\b(nubank|pagbank|pix|itau|bradesco|santander|banco do brasil|bb|caixa|inter|c6|picpay|stone|cielo|mercado pago|paypal)\b/i);
    
    if (brandMatch) {
      const brandName = brandMatch[1];
      const research = await researchBrandGuidelines(brandName);
      brandResearch = `Brand research for ${brandName}: ${research}`;
    }

    const systemPrompt = `You are a professional UI/UX designer and developer specializing in payment checkout templates. Your task is to modify checkout payment templates based on user commands while preserving the core PIX payment functionality.

CRITICAL RULES:
1. NEVER remove or break the PIX payment integration functionality
2. Preserve all form fields necessary for payment processing
3. Maintain QR code and PIX code display functionality
4. Keep the checkout flow functional (form → payment page)
5. When adding new elements, respect the currentTab context (form elements go to form preview, payment elements go to payment preview)
6. Always return valid JSON with the exact structure provided

Current template structure:
- formData: Contains colors, texts, layout options, and configuration
- customElements: Array of custom text/image elements with positions
- Positions: negative numbers = header area, 0-99 = form area, 100+ = payment page area

Available formData fields:
- productName, productDescription, price
- primaryColor, accentColor, backgroundColor, textColor
- customTitle, customSubtitle, customButtonText, customInstructions
- showLogo, logoUrl, logoPosition, logoSize, headerHeight

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