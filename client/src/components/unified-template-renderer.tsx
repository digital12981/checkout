import { QrCode, ShoppingBag, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/utils";

interface CustomElement {
  id: string;
  type: string;
  position: number | string;
  content: string;
  styles: {
    color?: string;
    backgroundColor?: string;
    isBold?: boolean;
    hasBox?: boolean;
    boxColor?: string;
    imageSize?: number;
    borderRadius?: number;
    fontSize?: number;
    textAlign?: "left" | "center" | "right";
    padding?: string;
    border?: string;
    marginBottom?: string;
    marginTop?: string;
    fontWeight?: string;
    lineHeight?: string;
    borderTop?: string;
    boxShadow?: string;
  };
}

interface PageData {
  id: number;
  productName: string;
  productDescription: string;
  price: string;
  customTitle?: string;
  customSubtitle?: string;
  customButtonText?: string;
  customInstructions?: string;
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  logoUrl?: string;
  logoPosition: string;
  logoSize: number;
  headerHeight: number;
  customElements?: string;
  skipForm: boolean;
  showLogo?: boolean;
  footerText?: string;
  showFooterLogo?: boolean;
  footerLogoSize?: number;
}

interface UnifiedTemplateRendererProps {
  page: PageData;
  customElements: CustomElement[];
  children?: React.ReactNode; // Form content or payment content
  isEditor?: boolean; // Different behavior for editor vs checkout
}

export default function UnifiedTemplateRenderer({ 
  page, 
  customElements, 
  children, 
  isEditor = false 
}: UnifiedTemplateRendererProps) {
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15 * 60); // 15 minutes in seconds

  // Timer functionality for payment pages
  useEffect(() => {
    if (!isEditor && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [isEditor, timeLeft]);

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Copy PIX code functionality
  const handleCopyCode = async (pixCode: string) => {
    try {
      await navigator.clipboard.writeText(pixCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy PIX code:', err);
    }
  };
  
  // Render custom element exactly the same way in both editor and checkout
  const renderCustomElement = (element: CustomElement) => {
    if (element.type === "image") {
      return (
        <img
          src={element.content}
          alt="Custom element"
          className="mx-auto"
          style={{
            width: element.styles?.imageSize || 200,
            borderRadius: element.styles?.borderRadius || 8
          }}
          onError={(e) => {
            e.currentTarget.src = "https://via.placeholder.com/200x100?text=Imagem+não+encontrada";
          }}
        />
      );
    }

    return (
      <div
        className={`${element.styles?.hasBox ? 'border' : ''} ${
          element.type?.includes('footer') || Number(element.position) >= 100 ? 'w-full -mx-6 px-6 rounded-none' : 'rounded'
        }`}
        style={{
          color: element.styles?.color || "#000000",
          backgroundColor: element.styles?.backgroundColor || (element.styles?.hasBox ? element.styles?.boxColor || "#ffffff" : "transparent"),
          borderColor: element.styles?.hasBox ? element.styles?.boxColor || "#e5e7eb" : "transparent",
          fontWeight: element.styles?.fontWeight || (element.styles?.isBold ? "bold" : "normal"),
          fontSize: element.styles?.fontSize ? `${element.styles.fontSize}px` : "16px",
          textAlign: element.type?.includes('footer') || Number(element.position) >= 100 ? "center" : (element.styles?.textAlign || "left"),
          borderRadius: element.type?.includes('footer') || Number(element.position) >= 100 ? "0" : `${element.styles?.borderRadius || 4}px`,
          padding: element.styles?.padding || "8px",
          border: element.styles?.border,
          marginBottom: element.styles?.marginBottom,
          marginTop: element.type?.includes('footer') || Number(element.position) >= 100 ? "32px" : element.styles?.marginTop,
          lineHeight: element.styles?.lineHeight,
          borderTop: element.styles?.borderTop,
          boxShadow: element.styles?.boxShadow,
          width: element.type?.includes('footer') || Number(element.position) >= 100 ? "100vw" : "auto",
          marginLeft: element.type?.includes('footer') || Number(element.position) >= 100 ? "-50vw" : "0",
          left: element.type?.includes('footer') || Number(element.position) >= 100 ? "50%" : "auto",
          position: element.type?.includes('footer') || Number(element.position) >= 100 ? "relative" : "static"
        } as any}
        dangerouslySetInnerHTML={{ __html: element.content?.replace(/\n/g, '<br/>') || "" }}
      />
    );
  };

  // Filter elements by position exactly the same way
  const filterElementsByPosition = (position: "top" | "middle" | "bottom" | "footer") => {
    switch (position) {
      case "top":
        return customElements.filter(el => 
          el.position === "top" || (typeof el.position === "number" && el.position >= 0 && el.position < 10)
        ).sort((a, b) => {
          const posA = typeof a.position === "string" ? 0 : Number(a.position);
          const posB = typeof b.position === "string" ? 0 : Number(b.position);
          return posA - posB;
        });
      
      case "middle":
        return customElements.filter(el => 
          el.position === "middle" || (typeof el.position === "number" && el.position >= 10 && el.position < 100)
        ).sort((a, b) => {
          const posA = typeof a.position === "string" ? 50 : Number(a.position);
          const posB = typeof b.position === "string" ? 50 : Number(b.position);
          return posA - posB;
        });
      
      case "bottom":
        return customElements.filter(el => 
          el.position === "bottom" || (typeof el.position === "number" && el.position >= 100 && el.position < 1000)
        ).sort((a, b) => {
          const posA = typeof a.position === "string" ? 100 : Number(a.position);
          const posB = typeof b.position === "string" ? 100 : Number(b.position);
          return posA - posB;
        });
      
      case "footer":
        return customElements.filter(el => 
          typeof el.position === "number" && el.position >= 1000
        ).sort((a, b) => {
          const posA = typeof a.position === "string" ? 1000 : Number(a.position);
          const posB = typeof b.position === "string" ? 1000 : Number(b.position);
          return posA - posB;
        });
      
      default:
        return [];
    }
  };

  const topElements = filterElementsByPosition("top");
  const middleElements = filterElementsByPosition("middle");
  const bottomElements = filterElementsByPosition("bottom");
  const footerElements = filterElementsByPosition("footer");

  // Calculate dynamic header height based on content
  const calculateDynamicHeaderHeight = () => {
    let baseHeight = 60; // Minimum base height
    
    // Add space for logo if present
    if (page.showLogo && page.logoUrl) {
      baseHeight += page.logoSize + 16; // Logo size + margin
    }
    
    // Add space for title (approximate)
    if (page.customTitle) {
      baseHeight += 32; // Title space
    }
    
    // Add space for subtitle (approximate)
    if (page.customSubtitle) {
      baseHeight += 28; // Subtitle space
    }
    
    // Add space for top elements
    baseHeight += topElements.length * 24;
    
    // Ensure reasonable bounds
    return Math.max(120, Math.min(baseHeight, 350));
  };

  // No editor, usar sempre a altura manual configurada pelo usuário
  const dynamicHeaderHeight = page.headerHeight;

  return (
    <div 
      className="min-h-screen w-full"
      data-capture-target="preview-content"
      style={{ backgroundColor: page.backgroundColor }}
    >
      {/* Header */}
      <div 
        className="w-full text-white text-center relative overflow-hidden flex flex-col justify-center"
        style={{ 
          backgroundColor: page.primaryColor,
          height: `${dynamicHeaderHeight}px`,
          paddingLeft: '16px',
          paddingRight: '16px',
          paddingTop: '8px',
          paddingBottom: '8px'
        }}
      >
        <div className="flex flex-col items-center" style={{ gap: '2px' }}>
          {/* Top custom elements */}
          {topElements.map(element => (
            <div key={element.id}>
              {renderCustomElement(element)}
            </div>
          ))}

          {/* Logo */}
          {page.showLogo && page.logoUrl && (
            <div className={`flex ${page.logoPosition === 'left' ? 'justify-start' : page.logoPosition === 'right' ? 'justify-end' : 'justify-center'} w-full`} style={{ marginBottom: '-2px' }}>
              <img 
                src={page.logoUrl} 
                alt="Logo" 
                className="object-contain rounded"
                style={{ 
                  width: `${page.logoSize}px`, 
                  height: `${page.logoSize}px`,
                  maxWidth: '90%',
                  maxHeight: `${Math.min(page.logoSize, dynamicHeaderHeight - 80)}px`
                }}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          )}

          {/* Title */}
          {page.customTitle && (
            <h1 
              className="font-bold"
              style={{ 
                fontSize: '16px',
                lineHeight: '1.1',
                maxWidth: '98%',
                margin: '0',
                marginTop: '-1px'
              }}
            >
              {page.customTitle}
            </h1>
          )}
          
          {/* Subtitle */}
          {page.customSubtitle && (
            <p 
              className="text-white/90"
              style={{ 
                fontSize: '14px',
                lineHeight: '1.2',
                maxWidth: '98%',
                margin: '0'
              }}
            >
              {page.customSubtitle}
            </p>
          )}
        </div>
      </div>

      {/* Main content area */}
      <div className="w-full p-6 bg-white flex justify-center">
        <div className="w-full max-w-md">
          
          {/* Middle custom elements */}
          {middleElements.map(element => (
            <div key={element.id} className="mb-4">
              {renderCustomElement(element)}
            </div>
          ))}

          {/* Form or Payment content */}
          {children}

          {/* Enhanced PIX Payment Interface - shown when payment is active */}
          {!isEditor && typeof children === 'object' && (children as any)?.props?.pixPayment && (
            <div className="space-y-6">

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <div className="text-center space-y-2">
                  <div className="flex items-center justify-center gap-2 text-yellow-800">
                    <span className="text-sm font-medium">Aguardando pagamento...</span>
                    <div className="animate-spin h-4 w-4 border-2 border-yellow-600 border-t-transparent rounded-full"></div>
                  </div>
                  <div className="text-xl font-bold text-yellow-800">
                    Expira em {formatTime(timeLeft)}
                  </div>
                </div>
              </div>

              <div className="text-center mb-6">
                <p className="text-sm text-neutral-600 mb-4">
                  Escaneie o QR Code com seu app de pagamento
                </p>
                <div className="flex justify-center mb-4">
                  <img 
                    src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Logo%E2%80%94pix_powered_by_Banco_Central_%28Brazil%2C_2020%29.svg/2560px-Logo%E2%80%94pix_powered_by_Banco_Central_%28Brazil%2C_2020%29.svg.png"
                    alt="PIX Logo"
                    className="h-8 object-contain"
                  />
                </div>
              </div>

              <div className="text-center mb-6">
                <div className="w-48 h-48 bg-white border-2 border-neutral-200 rounded-lg mx-auto flex items-center justify-center mb-4">
                  {(children as any)?.props?.pixPayment?.pixQrCode ? (
                    <img 
                      src={(children as any).props.pixPayment.pixQrCode} 
                      alt="QR Code PIX" 
                      className="w-40 h-40 object-contain" 
                    />
                  ) : (
                    <div className="w-40 h-40 bg-black/10 rounded flex items-center justify-center">
                      <QrCode className="w-16 h-16 text-neutral-400" />
                    </div>
                  )}
                </div>
              </div>

              {/* PIX Code */}
              <div className="bg-neutral-50 rounded-lg p-4 mb-4">
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Código PIX Copia e Cola:
                </label>
                <div className="space-y-2">
                  <input
                    readOnly
                    value={(children as any)?.props?.pixPayment?.pixCode || ""}
                    className="w-full text-sm font-mono bg-white p-3 border rounded-md"
                  />
                  <Button
                    onClick={() => handleCopyCode((children as any)?.props?.pixPayment?.pixCode || "")}
                    className="w-full shadow-lg transform transition-all duration-150 active:scale-95"
                    style={{
                      backgroundColor: '#48AD45',
                      borderRadius: '4px',
                      boxShadow: '0 4px 8px rgba(72, 173, 69, 0.3), 0 2px 4px rgba(0, 0, 0, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)'
                    }}
                  >
                    {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                    {copied ? "Copiado!" : "Copiar Código PIX"}
                  </Button>
                </div>
              </div>

              <div className="text-center">
                <p className="text-sm text-neutral-600 mb-2">
                  O pagamento será confirmado automaticamente
                </p>
                <p className="text-xs text-neutral-500">
                  Você receberá uma confirmação por email
                </p>
              </div>
            </div>
          )}

          {/* Bottom custom elements */}
          {bottomElements.map(element => (
            <div key={element.id} className="mt-4">
              {renderCustomElement(element)}
            </div>
          ))}
        </div>
      </div>

      {/* Footer elements */}
      <div className="w-full mt-6">
        {footerElements.map(element => (
          <div 
            key={element.id} 
            className="w-full"
            style={{
              backgroundColor: page.primaryColor,
              color: "#ffffff",
              textAlign: "center",
              padding: "20px",
              fontSize: "14px",
              borderTop: `1px solid ${page.primaryColor}`
            }}
          >
            <div dangerouslySetInnerHTML={{ __html: element.content?.replace(/\n/g, '<br/>') || "" }} />
          </div>
        ))}
      </div>

      {/* Configurable Footer */}
      <footer 
        className="w-full py-6 px-6 text-white text-center"
        style={{ backgroundColor: page.primaryColor }}
      >
        <div className="max-w-md mx-auto">
          <div className="text-base font-medium mb-3">
            {(page as any).footerText || "INSS 2025"}
          </div>
          {(page as any).showFooterLogo && page.logoUrl && (
            <div className="flex justify-center">
              <img 
                src={page.logoUrl} 
                alt="Logo" 
                className="object-contain"
                style={{ 
                  height: `${(page as any).footerLogoSize || 48}px`,
                  maxWidth: '200px'
                }}
              />
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}