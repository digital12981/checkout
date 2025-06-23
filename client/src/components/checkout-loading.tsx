import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface CheckoutLoadingProps {
  pageId?: string;
}

export default function CheckoutLoading({ pageId }: CheckoutLoadingProps) {
  // Fetch page data to get logo and colors
  const { data: pageData } = useQuery({
    queryKey: [`/api/payment-pages/${pageId}`],
    enabled: !!pageId,
  });

  const logoUrl = pageData?.logoUrl;
  const logoSize = pageData?.logoSize || 64;

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
          <span className="text-lg font-medium text-gray-700">
            Carregando...
          </span>
          <Loader2 className="h-5 w-5 animate-spin text-gray-700" />
        </div>
      </div>
    </div>
  );
}