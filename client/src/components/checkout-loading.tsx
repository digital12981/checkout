import { Loader2 } from "lucide-react";

interface CheckoutLoadingProps {
  logoUrl?: string;
  primaryColor?: string;
  logoSize?: number;
}

export default function CheckoutLoading({ 
  logoUrl, 
  primaryColor = "#1E40AF",
  logoSize = 64 
}: CheckoutLoadingProps) {
  return (
    <div 
      className="min-h-screen w-full flex items-center justify-center"
      style={{ backgroundColor: "#FFFFFF" }}
    >
      <div className="text-center space-y-6">
        {/* Logo */}
        {logoUrl && (
          <div className="flex justify-center mb-6">
            <img 
              src={logoUrl} 
              alt="Logo" 
              className="object-contain"
              style={{ 
                height: `${logoSize}px`,
                maxWidth: '200px'
              }}
            />
          </div>
        )}
        
        {/* Loading text with spinner */}
        <div className="flex items-center justify-center gap-3">
          <span 
            className="text-lg font-medium"
            style={{ color: primaryColor }}
          >
            Carregando...
          </span>
          <Loader2 
            className="h-5 w-5 animate-spin" 
            style={{ color: primaryColor }}
          />
        </div>
      </div>
    </div>
  );
}