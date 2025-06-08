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

    const systemPrompt = `Designer specialist. Create contextual elements based on product description.

RULES:
- Use product context to create relevant content
- For footers: include company/institution name from description
- For text blocks: match the product/service theme
- customElements must have: id, type, position, content, styles
- Position footers at 150+
- Return ONLY JSON changes
- Keep response under 300 characters

JSON format:
{"formData": {}, "customElements": [{"id":"","type":"","position":0,"content":"","styles":{}}]}`;

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

Product context: "${currentTemplate.formData.productDescription || currentTemplate.formData.productName}"

Command: "${command}"

Create elements based on the product context above. Return JSON:
{
  "formData": { /* only modified fields */ },
  "customElements": [ /* contextual elements, max 1 */ ]
}

Keep under 400 chars. Use suggestedColors.`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 600,
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
        
        // Ensure customElements have required fields
        if (result.customElements) {
          result.customElements = result.customElements.map((element: any, index: number) => ({
            id: element.id || `ai-element-${Date.now()}-${index}`,
            type: element.type || 'text',
            position: element.position || (element.type === 'footer' ? 150 : 50),
            content: element.content || '',
            styles: element.styles || element.style || {}
          }));
        }
        
        return result;
      } catch (parseError) {
        console.error("Error parsing AI response:", parseError);
        console.error("Raw response:", content.text);
        
        // Try to extract partial data or return original template
        try {
          let fixedText = content.text;
          
          // Remove markdown code blocks
          fixedText = fixedText.replace(/```json/g, '').replace(/```/g, '').trim();
          
          // Find the first complete JSON object
          const jsonStart = fixedText.indexOf('{');
          if (jsonStart === -1) throw new Error('No JSON found');
          
          // Try to find the matching closing brace
          let braceCount = 0;
          let jsonEnd = -1;
          
          for (let i = jsonStart; i < fixedText.length; i++) {
            if (fixedText[i] === '{') braceCount++;
            if (fixedText[i] === '}') {
              braceCount--;
              if (braceCount === 0) {
                jsonEnd = i;
                break;
              }
            }
          }
          
          if (jsonEnd === -1) {
            // JSON is incomplete, try to extract just formData
            const formDataStart = fixedText.indexOf('"formData"');
            if (formDataStart > -1) {
              const beforeFormData = fixedText.substring(0, formDataStart);
              const simpleJson = beforeFormData + '"formData": {}}';
              const minimalResult = JSON.parse(simpleJson);
              
              // Try to extract individual properties
              const colorMatch = fixedText.match(/"primaryColor"\s*:\s*"([^"]+)"/);
              const accentMatch = fixedText.match(/"accentColor"\s*:\s*"([^"]+)"/);
              
              if (colorMatch || accentMatch) {
                minimalResult.formData = {};
                if (colorMatch) minimalResult.formData.primaryColor = colorMatch[1];
                if (accentMatch) minimalResult.formData.accentColor = accentMatch[1];
              }
              
              return {
                formData: minimalResult.formData || {},
                customElements: currentTemplate.customElements || []
              };
            }
            throw new Error('Could not find complete JSON');
          }
          
          const validJson = fixedText.substring(jsonStart, jsonEnd + 1);
          const fixedResult = JSON.parse(validJson);
          
          // Restore original logo if it was marked as PRESERVED
          if (fixedResult.formData && fixedResult.formData.logoUrl === "PRESERVED") {
            fixedResult.formData.logoUrl = currentTemplate.formData.logoUrl;
            fixedResult.formData.showLogo = currentTemplate.formData.showLogo;
          }
          
          // Ensure customElements have required fields
          if (fixedResult.customElements) {
            fixedResult.customElements = fixedResult.customElements.map((element: any, index: number) => ({
              id: element.id || `ai-element-${Date.now()}-${index}`,
              type: element.type || 'text',
              position: element.position || (element.type === 'footer' ? 150 : 50),
              content: element.content || '',
              styles: element.styles || element.style || {}
            }));
          }

          return fixedResult;
        } catch (secondError) {
          console.error("Failed to fix JSON response:", secondError);
          
          // As a last resort, try to extract just the formData portion
          try {
            // Try to find complete formData object
            const formDataPattern = /"formData"\s*:\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/;
            const formDataMatch = content.text.match(formDataPattern);
            if (formDataMatch) {
              const formDataStr = `{"formData":{${formDataMatch[1]}}}`;
              const partialResult = JSON.parse(formDataStr);
              return {
                formData: partialResult.formData,
                customElements: currentTemplate.customElements || []
              };
            }
            
            // Try to extract individual properties from formData
            const properties = [];
            const propertyPattern = /"(\w+)"\s*:\s*"([^"]+)"/g;
            let match;
            while ((match = propertyPattern.exec(content.text)) !== null) {
              properties.push(`"${match[1]}":"${match[2]}"`);
            }
            
            if (properties.length > 0) {
              const formDataStr = `{"formData":{${properties.join(',')}}}`;
              const partialResult = JSON.parse(formDataStr);
              return {
                formData: { ...currentTemplate.formData, ...partialResult.formData },
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