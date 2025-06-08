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

export async function generateCheckoutTemplate(chargeDescription: string, productName: string, price: string): Promise<any> {
  try {
    const systemPrompt = `You are a UI/UX designer creating checkout templates for payment pages based on charge descriptions.

CRITICAL RULES:
1. Generate complete checkout template with colors, texts, and custom elements
2. Extract brand context from description (e.g., "Nubank" = purple theme, "PagBank" = green theme)
3. Create urgency and trust elements appropriate to the charge type
4. Use professional color schemes and readable typography
5. Return ONLY valid JSON

TEMPLATE STRUCTURE:
- formData: {productName, productDescription, price, primaryColor, accentColor, backgroundColor, textColor, customTitle, customSubtitle, customButtonText, customInstructions, showLogo: false, logoUrl: "", logoPosition: "center", logoSize: 64, headerHeight: 96}
- customElements: [{id, type, position, content, styles}] - Include footer elements at positions 200+ with matching styling

BRAND COLORS:
- Nubank: primary #8A05BE, accent #8A05BE, bg #F8FAFC, text #1F2937
- PagBank: primary #00AA55, accent #00AA55, bg #F8FAFC, text #1F2937
- Itau: primary #EC7000, accent #EC7000, bg #F8FAFC, text #1F2937
- Default: primary #6366F1, accent #6366F1, bg #F8FAFC, text #1F2937

Return JSON:`;

    const userPrompt = `Generate checkout template for:
Product: "${productName}"
Price: R$ ${price}
Charge: "${chargeDescription}"

Requirements:
1. Set accentColor to match primaryColor for consistent button styling
2. Add footer elements at positions 200+ with contact info and trust elements
3. Footer should use same color as header (primaryColor)
4. Include contextual footer text based on the charge description
5. Ensure all buttons use the accentColor for proper visibility

Create appropriate styling, colors, and elements based on the charge context.`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 3000,
      messages: [
        { role: "user", content: `${systemPrompt}\n\n${userPrompt}` }
      ],
    });

    const content = response.content[0];
    if (content.type === 'text') {
      try {
        let jsonText = content.text.trim();
        
        // Remove markdown code blocks
        if (jsonText.startsWith('```json')) {
          jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (jsonText.startsWith('```')) {
          jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        
        // Find the main JSON object boundaries
        const jsonStart = jsonText.indexOf('{');
        let jsonEnd = -1;
        let braceCount = 0;
        
        for (let i = jsonStart; i < jsonText.length; i++) {
          if (jsonText[i] === '{') braceCount++;
          if (jsonText[i] === '}') {
            braceCount--;
            if (braceCount === 0) {
              jsonEnd = i;
              break;
            }
          }
        }
        
        if (jsonStart !== -1 && jsonEnd !== -1) {
          jsonText = jsonText.substring(jsonStart, jsonEnd + 1);
        }
        
        const result = JSON.parse(jsonText);
        return result;
      } catch (parseError) {
        console.error("Error parsing AI checkout generation:", parseError);
        // Return default template if parsing fails
        return {
          formData: {
            productName,
            productDescription: chargeDescription,
            price,
            primaryColor: "#6366F1",
            accentColor: "#6366F1", // Match primary color for button visibility
            backgroundColor: "#F8FAFC",
            textColor: "#1F2937",
            customTitle: "",
            customSubtitle: "",
            customButtonText: "Pagar com PIX",
            customInstructions: "",
            showLogo: false,
            logoUrl: "",
            logoPosition: "center",
            logoSize: 64,
            headerHeight: 96
          },
          customElements: [
            {
              id: `footer_text_${Date.now()}`,
              type: "text",
              position: 200,
              content: "Pagamento 100% seguro e protegido",
              styles: {
                color: "#FFFFFF",
                backgroundColor: "#6366F1",
                textAlign: "center",
                fontSize: 14,
                hasBox: true,
                boxColor: "#6366F1"
              }
            }
          ]
        };
      }
    }

    return null;
  } catch (error) {
    console.error("Error generating checkout template:", error);
    throw error;
  }
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

STYLE INHERITANCE: Generate elements using existing template colors in lighter/darker tones.
- Use primaryColor as base: create lighter background versions (add opacity or lighten)
- Text should be darker version of primaryColor or high contrast color
- Maintain visual harmony with existing design

EXAMPLES:
- If primaryColor is #8615D3 (purple): use #F3E8FF (light purple bg) with #4C1D95 (dark purple text)
- If primaryColor is #0EA5E9 (blue): use #DBEAFE (light blue bg) with #1E40AF (dark blue text)
- Position countdown/urgency: 15-20 (below form fields)

${brandResearch ? "Brand: " + brandResearch : ""}

Return JSON:`;

    // Generate color palette based on existing primary color
    const generateColorPalette = (primaryColor: string) => {
      // Common color combinations for different primary colors
      const colorMappings: Record<string, { lightBg: string, darkText: string }> = {
        '#8615D3': { lightBg: '#F3E8FF', darkText: '#4C1D95' }, // Purple
        '#8A05BE': { lightBg: '#F3E8FF', darkText: '#4C1D95' }, // Nubank Purple
        '#0EA5E9': { lightBg: '#DBEAFE', darkText: '#1E40AF' }, // Blue
        '#00AA55': { lightBg: '#D1FAE5', darkText: '#065F46' }, // Green (PagBank)
        '#EC7000': { lightBg: '#FED7AA', darkText: '#9A3412' }, // Orange (Itau)
        '#CC092F': { lightBg: '#FECACA', darkText: '#7F1D1D' }, // Red (Bradesco)
      };
      
      return colorMappings[primaryColor] || { lightBg: '#F3F4F6', darkText: '#1F2937' };
    };

    const colorPalette = generateColorPalette(currentTemplate.formData.primaryColor);

    // Simplify the template data to reduce token count
    const simplifiedTemplate = {
      formData: {
        ...currentTemplate.formData,
        logoUrl: currentTemplate.formData.logoUrl ? "EXISTING_LOGO" : undefined
      },
      customElements: currentTemplate.customElements,
      suggestedColors: colorPalette
    };

    const userPrompt = `Template: ${JSON.stringify(simplifiedTemplate)}
Command: "${command}"
Use suggestedColors for new elements. Return modified JSON:`;

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
          
          // Remove markdown code blocks
          fixedText = fixedText.replace(/```json/g, '').replace(/```/g, '').trim();
          
          // Remove any truncated base64 data that might be causing issues
          fixedText = fixedText.replace(/"logoUrl"\s*:\s*"data:image\/[^"]*$/g, '"logoUrl": "PRESERVED"');
          
          // Fix unterminated strings and arrays
          // Find the last complete JSON structure
          let lastValidEnd = fixedText.length;
          
          // Look for unterminated strings
          const openQuoteMatches = (fixedText.match(/"/g) || []).length;
          if (openQuoteMatches % 2 !== 0) {
            // Odd number of quotes means unterminated string
            const lastCompleteQuote = fixedText.lastIndexOf('"}');
            const lastCompleteArray = fixedText.lastIndexOf('}]');
            lastValidEnd = Math.max(lastCompleteQuote + 2, lastCompleteArray + 2);
          }
          
          // Look for unterminated arrays
          if (fixedText.includes('[') && !fixedText.includes(']')) {
            const lastArrayStart = fixedText.lastIndexOf('[');
            const beforeArray = fixedText.substring(0, lastArrayStart);
            const lastCompleteProperty = beforeArray.lastIndexOf('"}');
            if (lastCompleteProperty > 0) {
              lastValidEnd = lastCompleteProperty + 2;
            }
          }
          
          if (lastValidEnd < fixedText.length) {
            fixedText = fixedText.substring(0, lastValidEnd);
          }
          
          // Remove trailing commas
          fixedText = fixedText.replace(/,\s*$/g, '');
          
          // Ensure proper closing braces
          const openBraces = (fixedText.match(/\{/g) || []).length;
          const closeBraces = (fixedText.match(/\}/g) || []).length;
          const missingBraces = openBraces - closeBraces;
          
          if (missingBraces > 0) {
            fixedText += '}'.repeat(missingBraces);
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
          
          // As a last resort, try to extract just the formData portion
          try {
            const formDataMatch = content.text.match(/"formData"\s*:\s*\{([^}]+)\}/);
            if (formDataMatch) {
              const formDataStr = `{"formData":{${formDataMatch[1]}}}`;
              const partialResult = JSON.parse(formDataStr);
              return {
                formData: partialResult.formData,
                customElements: currentTemplate.customElements || []
              };
            }
          } catch (thirdError) {
            console.error("Failed to extract partial data:", thirdError);
          }
          
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