# Deploy no Heroku - Instruções Detalhadas

## 🚀 Passo a Passo para Deploy

### 1. Configuração Inicial
```bash
# Login no Heroku
heroku login

# Criar aplicação
heroku create your-app-name

# Definir buildpack correto
heroku buildpacks:clear
heroku buildpacks:set heroku/nodejs
```

### 2. Configurar Banco de Dados
```bash
# Adicionar PostgreSQL
heroku addons:create heroku-postgresql:essential-0

# Verificar se foi criado
heroku config:get DATABASE_URL
```

### 3. Configurar Variáveis de Ambiente
```bash
heroku config:set NODE_ENV=production
heroku config:set FOR4PAYMENTS_API_KEY=your_api_key_here
heroku config:set ANTHROPIC_API_KEY=your_api_key_here
```

### 4. Preparar e Fazer Deploy
```bash
# Preparar arquivos
git add .
git commit -m "Deploy to Heroku with ESM fixes"

# Fazer deploy
git push heroku main
```

### 5. Executar Migrações
```bash
# Aplicar schema do banco
heroku run npm run db:push

# Verificar se funcionou
heroku logs --tail
```

## 🔧 Resolver Erro ERR_MODULE_NOT_FOUND

Se a aplicação estiver crashando com ERR_MODULE_NOT_FOUND:

### Método 1: Build Específico para Heroku
```bash
# Primeiro, buildar o servidor localmente
node build-server.js

# Depois fazer deploy
git add .
git commit -m "Fix server build for Heroku"
git push heroku main
```

### Método 2: Verificar Logs
```bash
# Ver logs detalhados
heroku logs --tail

# Ver releases
heroku releases

# Ver dyno status
heroku ps
```

### Método 3: Redeploy Completo
```bash
# Limpar cache
heroku repo:reset -a your-app-name

# Fazer novo deploy
git push heroku main --force
```

## 📊 Verificar se Deploy Funcionou

### Testes Básicos
```bash
# Verificar se app responde
curl -I https://your-app-name.herokuapp.com

# Verificar status da aplicação
heroku ps:scale web=1

# Abrir no navegador
heroku open
```

### Logs para Monitoramento
```bash
# Logs em tempo real
heroku logs --tail

# Logs específicos do servidor
heroku logs --source app

# Últimos 200 logs
heroku logs -n 200
```

## 🛠️ Configurações Importantes

### Arquivos Essenciais
- `Procfile`: Define comando de inicialização
- `app.json`: Configurações da aplicação
- `package.json`: Dependências e scripts
- `build.js`: Script de build customizado

### Variáveis de Ambiente Obrigatórias
- `DATABASE_URL`: URL do PostgreSQL (automática)
- `NODE_ENV`: Deve ser "production"
- `PORT`: Porta do servidor (automática)

### Opcionais
- `FOR4PAYMENTS_API_KEY`: Para pagamentos PIX
- `ANTHROPIC_API_KEY`: Para IA de templates

## 💡 Dicas de Troubleshooting

1. **Sempre verificar logs primeiro**: `heroku logs --tail`
2. **Confirmar buildpack correto**: `heroku buildpacks`
3. **Verificar variáveis de ambiente**: `heroku config`
4. **Testar localmente antes do deploy**: `npm run build && npm start`
5. **Usar releases para tracking**: `heroku releases`

## 🔄 Atualizações Futuras

Para updates da aplicação:
```bash
git add .
git commit -m "Update: description of changes"
git push heroku main
```

Para mudanças no banco:
```bash
# Sempre após mudanças no schema
heroku run npm run db:push
```