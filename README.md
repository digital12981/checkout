# CheckoutFy - Sistema de Páginas de Pagamento PIX

CheckoutFy é uma plataforma SaaS avançada para criar páginas de pagamento PIX dinâmicas com design inteligente e experiências de transação perfeitas.

## 🚀 Deploy no Heroku

### Pré-requisitos
- Conta no Heroku
- Heroku CLI instalado
- Chaves de API necessárias (opcional para funcionalidade completa)

### Deploy Automático
[![Deploy to Heroku](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)

### Deploy Manual

1. **Clone o repositório**
```bash
git clone <your-repo-url>
cd checkoutfy
```

2. **Login no Heroku**
```bash
heroku login
```

3. **Criar aplicação no Heroku**
```bash
heroku create your-app-name
```

4. **Definir buildpack Node.js explicitamente**
```bash
heroku buildpacks:set heroku/nodejs
```

5. **Adicionar PostgreSQL**
```bash
heroku addons:create heroku-postgresql:essential-0
```

6. **Configurar variáveis de ambiente**
```bash
heroku config:set NODE_ENV=production
heroku config:set FOR4PAYMENTS_API_KEY=your_api_key_here
heroku config:set ANTHROPIC_API_KEY=your_api_key_here
```

7. **Deploy**
```bash
git add .
git commit -m "Deploy to Heroku"
git push heroku main
```

8. **Executar migrações do banco**
```bash
heroku run npm run db:push
```

## 🔧 Variáveis de Ambiente

| Variável | Descrição | Obrigatória |
|----------|-----------|-------------|
| `DATABASE_URL` | URL do PostgreSQL (automaticamente configurada pelo Heroku) | ✅ |
| `NODE_ENV` | Ambiente de execução (production) | ✅ |
| `PORT` | Porta do servidor (automaticamente configurada pelo Heroku) | ✅ |
| `FOR4PAYMENTS_API_KEY` | Chave API para integração de pagamentos PIX | ❌ |
| `ANTHROPIC_API_KEY` | Chave API para geração inteligente de templates | ❌ |

## 🏗️ Arquitetura

- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript
- **Banco de dados**: PostgreSQL + Drizzle ORM
- **Integrações**: For4Payments API + Anthropic Claude AI

## 📋 Funcionalidades

- ✅ Editor visual de páginas de pagamento
- ✅ Templates customizáveis com arrastar e soltar
- ✅ Integração completa com PIX via For4Payments
- ✅ Funcionalidade "Pular Formulário" para automação
- ✅ Dashboard com estatísticas e gerenciamento
- ✅ Geração inteligente de templates com IA
- ✅ Responsivo e otimizado para mobile

## 🔄 Scripts Disponíveis

- `npm run dev` - Servidor de desenvolvimento
- `npm run build` - Build para produção
- `npm start` - Iniciar servidor de produção
- `npm run db:push` - Aplicar alterações no schema do banco

## 📝 Logs e Monitoramento

Para visualizar logs no Heroku:
```bash
heroku logs --tail
```

## 🆘 Troubleshooting

### Problemas Comuns

1. **Erro de buildpack (Python detectado)**: 
   ```bash
   heroku buildpacks:clear
   heroku buildpacks:set heroku/nodejs
   ```

2. **Erro ERR_MODULE_NOT_FOUND**: ✅ **RESOLVIDO**
   ```bash
   # O servidor de produção está funcionando corretamente
   # Para updates futuros:
   git add .
   git commit -m "Update application"
   git push heroku main
   ```

2. **Erro de build**: Verifique se todas as dependências estão instaladas corretamente

3. **Erro de build durante deploy**: 
   ```bash
   heroku logs --tail
   ```
   Verifique se todas as dependências estão instaladas

4. **Erro de banco**: Execute `heroku run npm run db:push` para aplicar migrações

5. **Erro de porta**: O Heroku configura automaticamente a variável PORT

### Suporte

Para suporte técnico, verifique os logs do Heroku e as configurações das variáveis de ambiente.