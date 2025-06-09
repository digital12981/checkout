import { QrCode, ShoppingBag } from "lucide-react";

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

  return (
    <div 
      className="min-h-screen w-full"
      style={{ backgroundColor: page.backgroundColor }}
    >
      {/* Header */}
      <div 
        className="w-full p-6 text-white text-center flex flex-col justify-center"
        style={{ 
          backgroundColor: page.primaryColor,
          height: `${page.headerHeight}px`
        }}
      >
        {/* Top custom elements */}
        {topElements.map(element => (
          <div key={element.id} className="mb-4">
            {renderCustomElement(element)}
          </div>
        ))}

        {/* Logo */}
        {page.showLogo && page.logoUrl && (
          <div className={`mb-4 flex ${page.logoPosition === 'left' ? 'justify-start' : page.logoPosition === 'right' ? 'justify-end' : 'justify-center'}`}>
            <img 
              src={page.logoUrl} 
              alt="Logo" 
              className="object-contain rounded"
              style={{ width: `${page.logoSize}px`, height: `${page.logoSize}px` }}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        )}

        {/* Title and subtitle */}
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
          
          {/* Middle custom elements */}
          {middleElements.map(element => (
            <div key={element.id} className="mb-4">
              {renderCustomElement(element)}
            </div>
          ))}

          {/* Form or Payment content */}
          {children}

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
    </div>
  );
}