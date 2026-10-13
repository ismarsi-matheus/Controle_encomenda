# Bastidor de Pedidos

Controle de encomendas personalizadas das duas lojas: **Bordados e Aviamentos** e **Papelaria Criativa**.
Cadastro do pedido (peça, o que personalizar, onde, técnica), pagamento, prazo, etapas e histórico.
Feito para usar no celular.

- `/login`: página de entrada (usuário e senha).
- `/`: pedidos em aberto e histórico. Quem não está logado é mandado para `/login`.
- Os dados (clientes, valores, telefones) só saem do servidor para quem está logado.

## Colocar no ar pela primeira vez

### 1. Subir o código para o GitHub
1. Em <https://github.com/new>, crie um repositório **privado** chamado `bastidor-de-pedidos`, sem README.
2. Nesta pasta, rode:
   ```bash
   git remote add origin https://github.com/SEU-USUARIO/bastidor-de-pedidos.git
   git push -u origin main
   ```

### 2. Importar na Vercel
1. Em <https://vercel.com/new>, clique em **Import** no repositório `bastidor-de-pedidos`.
2. Deixe **Framework Preset** como **Other** e não mude mais nada.
3. Clique em **Deploy**. A primeira versão sobe, mas o login ainda não funciona: faltam os passos 3 e 4.

### 3. Criar o banco de dados (grátis)
1. No projeto da Vercel, abra a aba **Storage**.
2. Clique em **Create Database**, escolha **Upstash** e depois **Upstash for Redis**. Escolha a região **São Paulo (gru1)** se aparecer, e o plano **Free**.
3. Na tela seguinte, conecte o banco ao projeto `bastidor-de-pedidos`, marcando todos os ambientes.

A Vercel cria sozinha as variáveis `KV_REST_API_URL` e `KV_REST_API_TOKEN`.

### 4. Cadastrar os usuários
1. No projeto, vá em **Settings → Environment Variables**.
2. Adicione a variável **`USUARIOS`** com o formato `usuario:senha`, separando as pessoas por vírgula:
   ```
   maria:Rosa#2026bordado, joao:Caneca!Planner77
   ```
   - O usuário não diferencia maiúsculas de minúsculas (`Maria` = `maria`).
   - Use senhas fortes, com pelo menos 10 caracteres, misturando letras, números e símbolos.
3. Salve e vá em **Deployments**. No último deploy, clique em **⋯ → Redeploy** para valer.

Pronto: abra o endereço do projeto (ex.: `https://bastidor-de-pedidos.vercel.app`). Ele leva para a tela de login e, depois de entrar, vai direto para as encomendas.

## No dia a dia

- **Instalar no celular:** abra o site e escolha **Adicionar à tela inicial**: no iPhone, pelo botão Compartilhar do Safari; no Android, pelo menu ⋮ do Chrome. Ele fica como um app.
- **Acesso de qualquer lugar:** basta ter internet e entrar com o usuário e a senha.
- **Quanto tempo fica logado:** 30 dias em cada aparelho. Para sair, use **Sair** no topo.
- **Pessoa nova:** acrescente `nome:senha` em `USUARIOS` e faça um **Redeploy**.
- **Alguém saiu da equipe:** apague essa pessoa de `USUARIOS` e faça um **Redeploy**. Ela perde o acesso na hora.
- **Trocar senha:** edite `USUARIOS` e faça um **Redeploy**. Mudar a lista desconecta todos os aparelhos, e cada um entra de novo.
- **Senha errada demais:** depois de 8 erros seguidos, aquele aparelho fica 15 minutos sem poder tentar.

## Como o projeto está organizado

```
public/index.html   página de pedidos (só funciona logado)
public/login.html   página de login
api/login.js        confere usuário e senha e cria a sessão (cookie seguro, 30 dias)
api/logout.js       encerra a sessão
api/sessao.js       diz se o aparelho está logado
api/pedidos.js      lista, cria, edita e apaga pedidos (exige login)
api/_lib.js         funções comuns (banco, sessão, usuários)
vercel.json         configuração e cabeçalhos de segurança
```

Variáveis de ambiente: veja `.env.example`.

Para alterar o sistema, edite os arquivos e faça `git push`. A Vercel publica a nova versão sozinha em cerca de 1 minuto.

> O arquivo `pedidos-bordados.html` na raiz é a versão antiga, feita para rodar dentro do claude.ai. A Vercel não usa esse arquivo.
