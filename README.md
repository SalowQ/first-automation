## Automação de Redação com LLM

### Índice

1. [Contextualização do desafio](#1-contextualização-do-desafio)
2. [Justificativa do uso de IA](#2-justificativa-do-uso-de-ia)
3. [LLM utilizado](#3-llm-utilizado)
4. [Arquitetura e workflow](#4-arquitetura-e-workflow)
5. [Prompt utilizado](#5-prompt-utilizado)
6. [Explicação detalhada do prompt](#6-explicação-detalhada-do-prompt)
7. [Formato de resposta (JSON)](#7-formato-de-resposta-json)
8. [Referência do arquivo make.json](#8-referência-do-arquivo-makejson)
9. [Front-end](#9-front-end)
10. [Instalação e execução](#10-instalação-e-execução)
11. [Benefícios percebidos e desafios enfrentados](#11-benefícios-percebidos-e-desafios-enfrentados)
12. [Limites éticos e de segurança](#12-limites-éticos-e-de-segurança)
13. [Prints de funcionamento](#13-prints-de-funcionamento)
14. [Imagem do workflow](#14-imagem-do-workflow)

### 1. Contextualização do desafio

Facilitar a escrita de textos rápidos e assertivos no dia a dia utilizando modelos de linguagem e técnicas de prompt engineering para automatizar a tarefa. A proposta é que os inputs sejam simples e diretos, reduzindo o esforço cognitivo do usuário e padronizando a qualidade das mensagens institucionais.

### 2. Justificativa do uso de IA

- **Geração rápida**: reduz o tempo para redigir mensagens profissionais.
- **Consistência**: mantém tom e estrutura alinhados às diretrizes institucionais.
- **Personalização controlada**: parametrização por público-alvo, canal e objetivo.
- **Automação ponta a ponta**: integração via webhook permite orquestrar o fluxo sem intervenção manual.

### 3. LLM utilizado

Foi utilizado o **Gemini 2.5 Pro** por lidar bem com dados estruturados. Nesta aplicação, o front-end React envia um payload simples para um webhook, que consulta o LLM e retorna a resposta em JSON. A escolha do modelo se deve à sua capacidade de:

- Seguir instruções rígidas sobre formato (JSON válido);
- Manter coerência em mensagens institucionais;
- Interpretar campos estruturados (público, canal, tom, objetivo) sem perder contexto.

### 4. Arquitetura e workflow

1. Usuário informa os campos básicos (público-alvo, canal, tom, conteúdo, objetivo, assinatura) no front.
2. O front envia um POST ao webhook com esses dados e o prompt preparado.
3. O serviço do webhook chama o LLM (Gemini 2.5 Pro) e retorna um JSON com `assunto`, `mensagem` e `assinatura`.
4. O front valida e exibe a resposta, com opção de copiar o conteúdo.

![Workflow](https://github.com/SalowQ/first-automation/blob/main/assets/workflow.png?raw=true)

### 5. Prompt utilizado

Abaixo está o prompt utilizado, entre asteriscos estão as entradas vindas do webhook:

```text
Você é um assistente de Recursos Humanos responsável por redigir mensagens institucionais.
Crie uma mensagem profissional e adequada às informações abaixo.

Informações recebidas:
- Público-alvo: *publico-alvo*
- Canal de envio (e-mail, WhatsApp, intranet, mural): *canal-envio*
- Tom da mensagem (formal, acolhedor, motivacional, neutro, comemorativo): *tom-mensagem*
- Conteúdo principal: *conteudo-principal*
- Objetivo da mensagem: *objetivo-mensagem*
- Assinatura ou remetente: *assinatura-remetente*

Instruções:
1. Gere a resposta exclusivamente em formato JSON válido.
2. Não adicione comentários, explicações ou texto fora do JSON.
3. Retorne apenas os valores solicitados.
4. O JSON final deve ter exatamente estas chaves:
   - assunto
   - mensagem
   - assinatura

Agora, gere a resposta.
```

### 6. Explicação detalhada do prompt

- **Contexto inicial**: define o papel do modelo (assistente de RH) e o tipo de output esperado (mensagens institucionais). Isso reduz ambiguidades e alinha o estilo.
- **Informações recebidas**: enumera os campos de entrada (público, canal, tom, conteúdo, objetivo, assinatura), garantindo que o modelo considere todas as variáveis de personalização.
- **Instruções de formato**:
  - Resposta exclusivamente em **JSON válido**: força estrutura parseável no front.
  - **Sem comentários ou texto extra**: evita ruído e facilita validação.
  - **Apenas valores solicitados**: restringe o escopo da resposta.
  - Chaves fixas: `assunto`, `mensagem`, `assinatura` — facilita renderização e mapeamento no front.
- **Encerramento**: “Agora, gere a resposta.” sinaliza o início da produção, reduzindo divagações.

### 7. Formato de resposta (JSON)

Exemplo de resposta esperada do LLM:

```json
{
  "assunto": "[Assunto objetivo e claro]",
  "mensagem": "[Mensagem completa, adequada ao público, canal e tom]",
  "assinatura": "[Nome do remetente/área]"
}
```

Validações recomendadas no front:

- Verificar presença das três chaves obrigatórias.
- Validar que `mensagem` não está vazia e possui frases completas.
- Sanitizar conteúdo para exibição segura.

### 8. Referência do arquivo make.json

O projeto proveniente da plataforma make pode ser exportado como json e está disponível no repositório com o nome de `make.json`.

### 9. Front-end

Este projeto usa **React + Vite + TypeScript** e **Tailwind CSS**.

- `src/App.tsx`:
  - Coleta inputs do usuário (público, canal, tom, conteúdo, objetivo, assinatura).
  - Monta o payload segundo o `requestTemplate` e envia ao webhook.
  - Exibe estado de carregamento/erro e renderiza `assunto`, `mensagem`, `assinatura` após a resposta.
- `src/main.tsx`: inicializa a aplicação React e injeta no DOM.
- `src/index.css` e `tailwind.config.js`: estilização utilitária para prototipagem rápida e visual consistente.
- Integração: a resposta é validada contra as chaves exigidas e apresentada de forma copiável.

### 10. Instalação e execução

Pré-requisitos: Node.js LTS.

```bash
npm install
npm run dev
```

Arquivos úteis:

- `config.example.txt`: modelo para suas configurações locais. Duplique e ajuste conforme necessário.
- `vite.config.ts`, `tsconfig.json`, `postcss.config.js`: configuração do build e tooling.

### 11. Benefícios percebidos e desafios enfrentados

- **Benefícios**:
  - Agilidade na criação de mensagens institucionais.
  - Comunicação mais assertiva e consistente.
  - Padronização de formato via JSON e maior integrabilidade.
- **Desafios**:
  - Integração com webhook e tratamento de erros.
  - Limitações de cota e capacidade em planos gratuitos de IA.
  - Garantir aderência estrita ao formato JSON em todas as respostas.

### 12. Limites éticos e de segurança

- **Privacidade e LGPD**: evitar envio de dados pessoais/sensíveis; aplicar minimização de dados e consentimento quando aplicável.
- **Vazamento de dados**: não registrar segredos; usar canal seguro (HTTPS) e storage protegido.
- **Viés do modelo**: revisar mensagens geradas; manter diretrizes de linguagem inclusiva; monitorar saídas.
- **Transparência**: informar que mensagens podem ser assistidas por IA quando apropriado.

### 13. Prints de funcionamento

```text
docs/prints/tela-formulario.png
docs/prints/resposta-gerada.png
docs/prints/erro-validacao.png
```

### 14. Imagem do workflow

```text
docs/workflow/workflow.png
```
