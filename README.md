# Meta Ads Analytics Tool

Uma ferramenta avançada para geração e análise de relatórios do Meta Ads (Facebook e Instagram), com autenticação via Facebook Login e integração com outras plataformas como Google Analytics (planejado para versões futuras).

## 📋 Conteúdo

- [Visão Geral](#visão-geral)
- [Funcionalidades](#funcionalidades)
- [Tecnologias](#tecnologias)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Requisitos](#requisitos)
- [Instalação e Configuração](#instalação-e-configuração)
- [Uso](#uso)
- [Manutenção](#manutenção)
- [Como Contribuir](#como-contribuir)
- [Próximas Etapas](#próximas-etapas)

## 🌐 Visão Geral

O Meta Ads Analytics Tool é uma solução completa para análise de campanhas publicitárias no Facebook e Instagram. Ela permite aos usuários conectar suas contas de anúncios, visualizar métricas importantes e gerar relatórios personalizados para otimizar seus investimentos em marketing digital.

## ✨ Funcionalidades

- **Autenticação Segura**:
  - Login com email/senha
  - Login via Facebook
  - Gerenciamento de sessões JWT

- **Integração com Meta Ads**:
  - Conexão com contas de anúncios do Meta
  - Acesso a campanhas, conjuntos de anúncios e anúncios
  - Obtenção de métricas e insights de performance

- **Relatórios e Análises**:
  - Dashboard com métricas-chave
  - Visualização de gastos, impressões, cliques e CTR
  - Gráficos de performance temporal
  - Comparação entre campanhas

- **Armazenamento e Persistência**:
  - Banco de dados PostgreSQL para armazenamento de dados do usuário e relatórios
  - Cache Redis para tokens e dados frequentemente acessados

- **Infraestrutura**:
  - Implantação com Docker, Traefik e Portainer
  - Monitoramento com Prometheus e Grafana (opcional)

## 🛠️ Tecnologias

### Backend
- Node.js com Express
- PostgreSQL para banco de dados
- Redis para cache
- JWT para autenticação
- API do Meta Marketing para integração com anúncios

### Frontend
- React com Hooks
- Material-UI para componentes de interface
- Chart.js para visualizações
- Axios para requisições HTTP

### Infraestrutura
- Docker e Docker Compose
- Traefik para roteamento e SSL
- Portainer para gerenciamento de contêineres

## 📁 Estrutura do Projeto

```
meta-ads-analytics/
├── backend/                # API Node.js/Express
│   ├── src/
│   │   ├── controllers/    # Controladores da API
│   │   ├── middleware/     # Middleware (auth, error handling)
│   │   ├── models/         # Modelos de dados
│   │   ├── routes/         # Rotas da API
│   │   ├── services/       # Serviços de negócios
│   │   └── app.js          # Aplicação Express principal
│   ├── Dockerfile          # Configuração do Docker para o backend
│   └── package.json        # Dependências do Node.js
├── frontend/               # Aplicação React
│   ├── public/             # Arquivos estáticos
│   ├── src/
│   │   ├── components/     # Componentes React reutilizáveis
│   │   ├── context/        # Context API (autenticação)
│   │   ├── pages/          # Páginas/componentes de rotas
│   │   ├── services/       # Serviços para API
│   │   └── App.js          # Componente principal do React
│   ├── Dockerfile          # Configuração do Docker para o frontend
│   └── package.json        # Dependências do React
├── docker/                 # Configurações para serviços de infraestrutura
├── init-scripts/           # Scripts de inicialização do banco de dados
├── letsencrypt/            # Certificados SSL (gerados pelo Traefik)
├── docker-compose.yml      # Configuração do Docker Compose
└── .env                    # Variáveis de ambiente
```

## 📋 Requisitos

- Docker e Docker Compose
- Conta de desenvolvedor no Meta for Developers (https://developers.facebook.com)
- Aplicativo registrado no Meta com permissões de Marketing API

## 🚀 Instalação e Configuração

### 1. Clone o repositório

```bash
git clone https://github.com/seu-usuario/meta-ads-analytics.git
cd meta-ads-analytics
```

### 2. Configure as variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto:

```
# Domínio
DOMAIN=seu-dominio.com

# PostgreSQL
POSTGRES_USER=postgres
POSTGRES_PASSWORD=sua_senha_segura
POSTGRES_DB=meta_ads

# Redis
REDIS_PASSWORD=sua_senha_segura_redis

# Meta API
META_APP_ID=seu_app_id_do_meta
META_APP_SECRET=seu_app_secret_do_meta

# JWT
JWT_SECRET=seu_jwt_secret_altamente_seguro

# Traefik Dashboard (usuário:senha criptografada)
TRAEFIK_BASIC_AUTH=admin:$$apr1$$....
```

No diretório `frontend`, crie também um arquivo `.env`:

```
REACT_APP_API_URL=https://api.seu-dominio.com/api
REACT_APP_FACEBOOK_APP_ID=seu_app_id_do_meta
```

### 3. Configure seu aplicativo no Meta for Developers

1. Acesse https://developers.facebook.com e crie um novo aplicativo
2. Adicione o produto "Marketing API" ao seu aplicativo
3. Configure as URLs de redirecionamento OAuth para:
   - https://seu-dominio.com/connect-meta/callback
   - http://localhost:3000/connect-meta/callback (para desenvolvimento)
4. Adicione as permissões necessárias: `ads_management`, `ads_read`, `business_management`
5. Copie o App ID e App Secret para o arquivo `.env`

### 4. Inicie os contêineres

```bash
docker-compose up -d
```

## 💻 Uso

### Acesso à aplicação

- Frontend: https://seu-dominio.com
- API: https://api.seu-dominio.com
- Portainer: https://portainer.seu-dominio.com
- Traefik Dashboard: https://traefik.seu-dominio.com

### Fluxo de utilização básico

1. Registre-se ou faça login na aplicação
2. Conecte sua conta do Meta Ads
3. Explore suas contas de anúncios, campanhas e conjuntos de anúncios
4. Visualize relatórios e métricas no dashboard
5. Crie e salve relatórios personalizados

## 🔧 Manutenção

### Acessando logs

```bash
# Logs do backend
docker-compose logs -f api

# Logs do frontend
docker-compose logs -f frontend

# Logs do PostgreSQL
docker-compose logs -f postgres
```

### Backup do banco de dados

```bash
docker-compose exec postgres pg_dump -U postgres meta_ads > backup_$(date +%Y%m%d).sql
```

### Atualização da aplicação

```bash
# Atualize o repositório local
git pull

# Reconstrua e reinicie os contêineres
docker-compose down
docker-compose up -d --build
```

## 🤝 Como Contribuir

Agradecemos o seu interesse em contribuir para o Meta Ads Analytics Tool! Aqui estão as diretrizes para ajudar você a começar.

### Processo de Contribuição

1. **Fork o repositório**
   - Crie um fork deste repositório na sua conta do GitHub

2. **Clone o seu fork**
   ```bash
   git clone https://github.com/seu-usuario/meta-ads-analytics.git
   cd meta-ads-analytics
   ```

3. **Crie uma branch para sua feature**
   ```bash
   git checkout -b feature/nome-da-sua-feature
   ```

4. **Desenvolva sua feature**
   - Implemente sua feature ou correção
   - Adicione testes, se aplicável
   - Siga as convenções de código descritas abaixo

5. **Faça commit das suas alterações**
   ```bash
   git commit -m "feat: descrição da sua feature"
   ```

6. **Push para o seu fork**
   ```bash
   git push origin feature/nome-da-sua-feature
   ```

7. **Crie um Pull Request**
   - Abra um Pull Request do seu fork para o repositório principal
   - Descreva detalhadamente o que sua alteração faz
   - Referencie issues relacionadas, se houver

### Convenções de Código

- **JavaScript/React**: Seguimos o padrão Airbnb para JavaScript e React
- **Commits**: Utilizamos o padrão de [Conventional Commits](https://www.conventionalcommits.org/)
  - `feat:` para novas funcionalidades
  - `fix:` para correções de bugs
  - `docs:` para alterações na documentação
  - `style:` para alterações que não afetam o código (formatação, etc)
  - `refactor:` para refatoração de código
  - `test:` para adição ou modificação de testes
  - `chore:` para tarefas de manutenção

### Reportando Bugs

Se você encontrar um bug, por favor crie uma issue no repositório com as seguintes informações:

- Título claro descrevendo o problema
- Passos detalhados para reproduzir o bug
- Comportamento esperado vs. comportamento atual
- Screenshots ou logs, se possível
- Ambiente (navegador, sistema operacional, versão do Node.js, etc)

### Sugerindo Melhorias

Para sugerir melhorias ou novas funcionalidades:

- Verifique se a sugestão já não existe nas issues
- Crie uma nova issue com o prefixo [Sugestão] no título
- Descreva detalhadamente a funcionalidade e por que ela seria útil
- Se possível, forneça exemplos de como essa funcionalidade poderia ser implementada

### Processo de Revisão

Depois de submeter um Pull Request:

1. Os mantenedores revisarão seu código
2. Podem ser solicitadas alterações ou esclarecimentos
3. Uma vez aprovado, seu PR será mesclado ao branch principal
4. Seu nome será adicionado à lista de contribuidores

Agradecemos novamente por contribuir para o nosso projeto!



## 🚀 Próximas Etapas

- [ ] Implementação da integração com Google Analytics
- [ ] Adição de mais visualizações e tipos de relatórios
- [ ] Suporte para exportação de relatórios (CSV, PDF)
- [ ] Alertas e notificações de performance
- [ ] Análises preditivas para otimização de campanhas

---

## 📝 Licença

Este projeto está licenciado sob a [MIT License](LICENSE).

---

Desenvolvido para SpeedFunnels - 2025
