# CheckoutFy - Payment Page Builder

## Overview

CheckoutFy is a full-stack web application for creating and managing customizable payment pages with PIX integration. The application allows users to build payment pages with custom styling, manage payments, and integrate with the For4Payments API for processing PIX transactions in Brazil.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **UI Components**: Radix UI primitives with custom Tailwind CSS styling
- **Form Handling**: React Hook Form with Zod validation
- **Styling**: Tailwind CSS with custom design system

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Language**: TypeScript with ES modules
- **API Design**: RESTful API with JSON responses
- **Session Management**: Express sessions with PostgreSQL storage
- **External API**: For4Payments integration for PIX payment processing

### Database Architecture
- **Database**: PostgreSQL with Drizzle ORM
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Connection**: Neon serverless PostgreSQL with connection pooling

## Key Components

### Database Schema
- **users**: User authentication and management
- **payment_pages**: Customizable payment page configurations with template data
- **pix_payments**: PIX payment transaction records
- **settings**: Application-wide configuration settings

### Payment Processing
- **For4Payments Integration**: Third-party API for PIX payment processing
- **Payment Flow**: Customer form → PIX code generation → QR code display → Payment tracking
- **Template System**: Customizable HTML templates with drag-and-drop elements

### Template Engine
- **Custom Elements**: Draggable components (text, images, separators)
- **Style Customization**: Colors, fonts, layouts, and branding options
- **HTML Editor**: Direct HTML editing capabilities for advanced customization
- **AI Integration**: Anthropic Claude for intelligent template generation

### Authentication & Security
- **Session-based**: Express sessions stored in PostgreSQL
- **API Security**: Input validation with Zod schemas
- **Environment Variables**: Secure configuration management

## Data Flow

1. **Page Creation**: Users create payment pages with product details and customization
2. **Template Generation**: AI or manual template creation with custom styling
3. **Customer Checkout**: Customers access payment pages and fill forms
4. **Payment Processing**: Integration with For4Payments API for PIX generation
5. **Payment Tracking**: Real-time payment status updates and management

## External Dependencies

### Core Dependencies
- **@anthropic-ai/sdk**: AI-powered template generation
- **@neondatabase/serverless**: PostgreSQL database connection
- **drizzle-orm**: Type-safe database operations
- **@tanstack/react-query**: Server state management
- **@radix-ui/react-***: Accessible UI components

### Payment Integration
- **For4Payments API**: Brazilian PIX payment processing
- **API Key Management**: Secure credential storage and rotation

### Development Tools
- **Vite**: Development server and build tool
- **TypeScript**: Type safety and developer experience
- **ESBuild**: Fast JavaScript bundling for production

## Deployment Strategy

### Development Environment
- **Replit Integration**: Configured for Replit development environment
- **Hot Reloading**: Vite development server with HMR
- **Database**: Neon PostgreSQL with development credentials

### Production Build
- **Frontend**: Vite build process generates optimized static assets
- **Backend**: ESBuild bundles Node.js server with external dependencies
- **Database**: Production PostgreSQL with connection pooling

### Environment Configuration
- **Port Configuration**: Configurable ports for development and production
- **Database URL**: Environment-specific database connections
- **API Keys**: Secure environment variable management

## Changelog

- July 3, 2025: Configurado deploy para Heroku
  - Criado Procfile e app.json para configuração Heroku
  - Ajustado servidor para usar variável PORT do Heroku
  - Movidas dependências de build para produção
  - Adicionado suporte a PostgreSQL do Heroku
  - Removido runtime.txt que causava conflito com buildpack Python
  - Configurado engines no package.json para forçar Node.js
  - Criado script de build customizado (build.js) para resolver problemas de módulos ESM
  - Atualizado Procfile para usar arquivo compilado diretamente
  - Adicionado tsconfig.server.json para build otimizado do servidor
  - Criada documentação completa de deploy com troubleshooting
- June 19, 2025: Implementado rodapé configurável com logo
  - Adicionado rodapé com cor do header e texto branco
  - Logo redimensionável e texto editável ("INSS 2025")
  - Sincronização completa entre editor e checkout final
- June 18, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.