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

    const systemPrompt = `You are a UI/UX designer. Modify payment templates while preserving PIX functionality.

CRITICAL RULES:
1. NEVER break PIX payment functionality
2. If showLogo=true, KEEP logoUrl exactly as is - DO NOT modify base64 data
3. RESPECT ELEMENT POSITIONING:
   - Header area (positions -10 to -1): Only small text elements that don't interfere with logo
   - Form area (positions 0-99): Customer form elements
   - Payment area (positions 100+): Payment confirmation elements
4. COLOR CONTRAST: Never use same colors for text and background
   - Light backgrounds: use dark text (#1F2937, #000000)
   - Dark backgrounds: use light text (#FFFFFF, #F8FAFC)
   - Red backgrounds: use white text
5. For countdown/urgency elements: place at positions 15-20 (below form fields)
6. Return ONLY valid JSON without explanations

POSITIONING GUIDE:
- Header (-10 to -1): Small text only, don't interfere with logo space
- Form area (0-99): Customer input fields and related elements
- Payment area (100+): PIX QR codes and payment confirmation

STYLE INHERITANCE: Use existing template colors and maintain visual consistency.

EXAMPLES:
- Countdown timer: position 15, red background (#EF4444) with white text (#FFFFFF)
- Urgency text: position 20, orange background (#F97316) with white text
- Below logo elements: positions 0-10

${brandResearch ? "Brand: " + brandResearch : ""}

Return JSON:`;

    // Simplify the template data to reduce token count
    const simplifiedTemplate = {
      formData: {
        ...currentTemplate.formData,
        logoUrl: currentTemplate.formData.logoUrl ? "EXISTING_LOGO" : undefined
      },
      customElements: currentTemplate.customElements
    };

    const userPrompt = `Template: ${JSON.stringify(simplifiedTemplate)}
Command: "${command}"
Return modified JSON:`;

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
        
        // Find JSON object boundaries and validate
        const jsonStart = jsonText.indexOf('{');
        let jsonEnd = jsonText.lastIndexOf('}');
        
        if (jsonStart !== -1 && jsonEnd !== -1) {
          jsonText = jsonText.substring(jsonStart, jsonEnd + 1);
          
          // Check for unterminated strings and fix common issues
          let braceCount = 0;
          let inString = false;
          let lastValidPos = jsonEnd;
          
          for (let i = 0; i < jsonText.length; i++) {
            const char = jsonText[i];
            if (char === '"' && (i === 0 || jsonText[i-1] !== '\\')) {
              inString = !inString;
            } else if (!inString) {
              if (char === '{') braceCount++;
              else if (char === '}') {
                braceCount--;
                if (braceCount === 0) {
                  lastValidPos = i;
                  break;
                }
              }
            }
          }
          
          if (braceCount > 0 || inString) {
            // Try to fix by truncating at last valid position
            jsonText = jsonText.substring(0, lastValidPos + 1);
          }
        }
        
        const result = JSON.parse(jsonText);
        
        // Restore original logo data if Claude used placeholder
        if (result.formData && result.formData.logoUrl === "EXISTING_LOGO") {
          result.formData.logoUrl = currentTemplate.formData.logoUrl;
          result.formData.showLogo = currentTemplate.formData.showLogo;
        } else if (currentTemplate.formData.logoUrl && result.formData && !result.formData.logoUrl) {
          result.formData.logoUrl = currentTemplate.formData.logoUrl;
          result.formData.showLogo = currentTemplate.formData.showLogo;
        }
        
        return result;
      } catch (parseError) {
        console.error("Error parsing AI response:", parseError);
        console.error("Raw response:", content.text);
        
        // Try to extract partial data or return original template
        try {
          // Attempt to fix common JSON issues and try again
          let fixedText = content.text;
          
          // Remove any truncated base64 data that might be causing issues
          fixedText = fixedText.replace(/"logoUrl"\s*:\s*"data:image\/[^"]*$/g, '"logoUrl": "PRESERVED"');
          fixedText = fixedText.replace(/,\s*$/g, '');
          
          // Ensure proper closing braces
          const openBraces = (fixedText.match(/\{/g) || []).length;
          const closeBraces = (fixedText.match(/\}/g) || []).length;
          const missingBraces = openBraces - closeBraces;
          
          if (missingBraces > 0) {
            fixedText += '}}'.repeat(missingBraces);
          }
          
          const fixedResult = JSON.parse(fixedText);
          
          // Restore original logo if it was marked as PRESERVED
          if (fixedResult.formData && fixedResult.formData.logoUrl === "PRESERVED") {
            fixedResult.formData.logoUrl = currentTemplate.formData.logoUrl;
            fixedResult.formData.showLogo = currentTemplate.formData.showLogo;
          }
          
          return fixedResult;
        } catch (secondError) {
          console.error("Failed to fix JSON response:", secondError);
          return currentTemplate;
        }
      }
    }

    return currentTemplate;
  } catch (error) {
    console.error("Error processing template with AI:", error);
    throw error;
  }
}