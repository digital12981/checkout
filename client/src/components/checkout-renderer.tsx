import { QrCode, ShoppingBag, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

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
  };
}

interface PaymentPage {
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
}

interface CheckoutRendererProps {
  page: PaymentPage;
  pixPayment?: any;
  formContent?: React.ReactNode;
}

export default function CheckoutRenderer({ page, pixPayment, formContent }: CheckoutRendererProps) {
  const [copied, setCopied] = useState(false);
  
  // Parse custom elements exactly like in the editor
  let customElements: CustomElement[] = [];
  try {
    customElements = JSON.parse(page.customElements || "[]");
  } catch (error) {
    console.error("Error parsing custom elements:", error);
  }

  const handleCopyCode = async () => {
    if (pixPayment?.pixCode) {
      await navigator.clipboard.writeText(pixPayment.pixCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Render custom element exactly like in the editor
  const renderCustomElement = (element: CustomElement) => {
    if (element.type === "image") {
      return (
        <img
          src={element.content}
          alt="Custom element"
          className="mx-auto"
          style={{
            width: element.styles.imageSize || 200,
            borderRadius: element.styles.borderRadius || 8
          }}
          onError={(e) => {
            e.currentTarget.src = "https://via.placeholder.com/200x100?text=Imagem+não+encontrada";
          }}
        />
      );
    }

    return (
      <div
        className={`${element.styles.hasBox ? 'border' : ''} ${
          element.type?.includes('footer') || element.position >= 100 ? 'w-full -mx-6 px-6 rounded-none' : 'rounded'
        }`}
        style={{
          color: element.styles.color || "#000000",
          backgroundColor: element.styles.backgroundColor || (element.styles.hasBox ? element.styles.boxColor || "#ffffff" : "transparent"),
          borderColor: element.styles.hasBox ? element.styles.boxColor || "#e5e7eb" : "transparent",
          fontWeight: element.styles.fontWeight || (element.styles.isBold ? "bold" : "normal"),
          fontSize: element.styles.fontSize || "16px",
          textAlign: element.type?.includes('footer') || element.position >= 100 ? "center" : (element.styles.textAlign || "left"),
          borderRadius: element.type?.includes('footer') || element.position >= 100 ? "0" : `${element.styles.borderRadius || 4}px`,
          padding: element.styles.padding || "8px",
          border: element.styles.border,
          marginBottom: element.styles.marginBottom,
          marginTop: element.type?.includes('footer') || element.position >= 100 ? "32px" : element.styles.marginTop,
          lineHeight: element.styles.lineHeight,
          borderTop: element.styles.borderTop,
          width: element.type?.includes('footer') || element.position >= 100 ? "100vw" : "auto",
          marginLeft: element.type?.includes('footer') || element.position >= 100 ? "-50vw" : "0",
          left: element.type?.includes('footer') || element.position >= 100 ? "50%" : "auto",
          position: element.type?.includes('footer') || element.position >= 100 ? "relative" : "static"
        } as any}
        dangerouslySetInnerHTML={{ __html: element.content.replace(/\n/g, '<br/>') }}
      />
    );
  };

  // Filter elements by position exactly like in the editor
  const topElements = customElements.filter(el => 
    el.position === "top" || (typeof el.position === "number" && el.position >= 0 && el.position < 10)
  ).sort((a, b) => {
    const posA = typeof a.position === "string" ? 0 : Number(a.position);
    const posB = typeof b.position === "string" ? 0 : Number(b.position);
    return posA - posB;
  });

  const middleElements = customElements.filter(el => 
    el.position === "middle" || (typeof el.position === "number" && Number(el.position) >= 10 && Number(el.position) < 100)
  ).sort((a, b) => {
    const posA = typeof a.position === "string" ? 50 : Number(a.position);
    const posB = typeof b.position === "string" ? 50 : Number(b.position);
    return posA - posB;
  });

  const bottomElements = customElements.filter(el => 
    el.position === "bottom" || (typeof el.position === "number" && Number(el.position) >= 100 && Number(el.position) < 1000)
  ).sort((a, b) => {
    const posA = typeof a.position === "string" ? 100 : Number(a.position);
    const posB = typeof b.position === "string" ? 100 : Number(b.position);
    return posA - posB;
  });

  const footerElements = customElements.filter(el => 
    typeof el.position === "number" && Number(el.position) >= 1000
  ).sort((a, b) => {
    const posA = typeof a.position === "string" ? 1000 : Number(a.position);
    const posB = typeof b.position === "string" ? 1000 : Number(b.position);
    return posA - posB;
  });

  return (
    <div 
      className="min-h-screen w-full"
      style={{ backgroundColor: page.backgroundColor }}
    >
      {/* Header - exactly like editor */}
      <div 
        className="w-full p-6 text-white text-center flex flex-col justify-center"
        style={{ 
          backgroundColor: page.primaryColor,
          height: `${page.headerHeight}px`
        }}
      >
        {page.showLogo && (
          <div className={`mb-4 flex ${page.logoPosition === 'left' ? 'justify-start' : page.logoPosition === 'right' ? 'justify-end' : 'justify-center'}`}>
            {page.logoUrl ? (
              <img 
                src={page.logoUrl} 
                alt="Logo" 
                className="object-contain rounded"
                style={{ width: `${page.logoSize}px`, height: `${page.logoSize}px` }}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <div className="bg-white/20 rounded-full flex items-center justify-center"
                style={{ width: `${page.logoSize}px`, height: `${page.logoSize}px` }}>
                <ShoppingBag className="w-8 h-8" />
              </div>
            )}
          </div>
        )}

        <h1 className="text-2xl font-bold mb-2">
          {page.customTitle || page.productName}
        </h1>
        <p className="text-white/90">
          {page.customSubtitle || page.productDescription}
        </p>
      </div>

      {/* Main content area */}
      <div className="w-full p-6 bg-white flex justify-center">
        <div className="w-full max-w-md">
          
          {/* Top custom elements */}
          {topElements.map(element => (
            <div key={element.id} className="mb-4">
              {renderCustomElement(element)}
            </div>
          ))}

          {/* Form or Payment content */}
          {!pixPayment ? (
            <>
              {/* Middle elements before form */}
              {middleElements.map(element => (
                <div key={element.id} className="mb-4">
                  {renderCustomElement(element)}
                </div>
              ))}
              
              {/* Form content */}
              {formContent}
            </>
          ) : (
            <>
              <div className="text-center mb-6">
                <div className="text-lg font-semibold text-neutral-800 mb-4">
                  Valor: {formatCurrency(page.price)}
                </div>
              </div>

              <div className="text-center space-y-4 mb-6">
                <div className="flex items-center justify-center gap-2 text-lg font-semibold text-neutral-800">
                  <span>Aguardando pagamento...</span>
                  <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                </div>
                <div className="text-3xl font-bold text-blue-600">
                  15:00
                </div>
                <p className="text-sm text-neutral-600">
                  Escaneie o QR Code com seu app de pagamento
                </p>
              </div>

              {/* Middle elements before payment */}
              {middleElements.map(element => (
                <div key={element.id} className="mb-4">
                  {renderCustomElement(element)}
                </div>
              ))}

              {/* QR Code */}
              <div className="text-center mb-6">
                <div className="w-48 h-48 bg-white border-2 border-neutral-200 rounded-lg mx-auto flex items-center justify-center mb-4">
                  {pixPayment.pixQrCode ? (
                    <img 
                      src={pixPayment.pixQrCode} 
                      alt="QR Code PIX" 
                      className="w-44 h-44 rounded"
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
                    value={pixPayment.pixCode || ""}
                    className="w-full text-sm font-mono bg-white p-3 border rounded-md"
                  />
                  <Button
                    onClick={handleCopyCode}
                    className="w-full"
                    style={{ backgroundColor: page.accentColor }}
                  >
                    {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                    {copied ? "Copiado!" : "Copiar Código PIX"}
                  </Button>
                </div>
              </div>

              <div className="text-center">
                <p className="text-sm text-neutral-600 mb-2">
                  {page.customInstructions || "Após o pagamento, você receberá a confirmação por email."}
                </p>
                <p className="text-xs text-neutral-600 mt-2">
                  O pagamento será confirmado automaticamente
                </p>
              </div>
            </>
          )}

          {/* Bottom custom elements */}
          {bottomElements.map(element => (
            <div key={element.id} className="mt-4">
              {renderCustomElement(element)}
            </div>
          ))}
        </div>
      </div>

      {/* Footer elements - exactly like editor */}
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
            <div dangerouslySetInnerHTML={{ __html: element.content.replace(/\n/g, '<br/>') }} />
          </div>
        ))}
      </div>
    </div>
  );
}