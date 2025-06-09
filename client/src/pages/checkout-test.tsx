import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { formatCpf, formatPhone } from "@/lib/utils";

export default function CheckoutTest() {
  const [, params] = useRoute("/checkout-test/:id");
  const [timeLeft, setTimeLeft] = useState(15 * 60);

  // Timer
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    console.log('Form submitted:', {
      name: formData.get('customerName'),
      email: formData.get('customerEmail'),
      cpf: formData.get('customerCpf'),
      phone: formData.get('customerPhone')
    });
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="bg-blue-600 text-white p-6 rounded-t-lg text-center">
          <h1 className="text-xl font-bold">Teste de Formulário</h1>
          <p>Verificação de funcionalidade</p>
        </div>

        {/* Timer */}
        <div className="bg-amber-50 p-3 text-center border-x border-gray-200">
          <div className="flex items-center justify-center mb-2">
            <svg className="animate-spin h-4 w-4 mr-2 text-amber-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-sm font-medium text-amber-600">Aguardando pagamento...</span>
          </div>
          <div className="text-lg font-bold font-mono text-amber-700">
            {formatTime(timeLeft)}
          </div>
        </div>

        {/* Form */}
        <div className="bg-white p-6 rounded-b-lg border border-gray-200">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="customerName" className="block text-sm font-medium text-gray-700 mb-1">
                Nome completo
              </label>
              <input
                id="customerName"
                name="customerName"
                type="text"
                required
                placeholder="Digite seu nome"
                className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="customerEmail" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="customerEmail"
                name="customerEmail"
                type="email"
                required
                placeholder="seu@email.com"
                className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="customerCpf" className="block text-sm font-medium text-gray-700 mb-1">
                CPF
              </label>
              <input
                id="customerCpf"
                name="customerCpf"
                type="text"
                required
                maxLength={14}
                placeholder="000.000.000-00"
                onChange={(e) => e.target.value = formatCpf(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="customerPhone" className="block text-sm font-medium text-gray-700 mb-1">
                Telefone
              </label>
              <input
                id="customerPhone"
                name="customerPhone"
                type="tel"
                required
                placeholder="(11) 99999-9999"
                onChange={(e) => e.target.value = formatPhone(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-3 px-6 rounded font-semibold hover:bg-blue-700 transition-colors"
            >
              Testar Formulário
            </button>
          </form>
        </div>

        {/* Test Info */}
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-sm text-yellow-800">
            <strong>Teste:</strong> Se conseguir preencher os campos acima, o problema está no componente principal.
            Timer: {formatTime(timeLeft)}
          </p>
        </div>
      </div>
    </div>
  );
}