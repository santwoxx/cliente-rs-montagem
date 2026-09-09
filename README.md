# RS Montagens | Sistema do Montador de Móveis

Sistema web responsivo para gestão operacional e financeira de montadores de móveis, com suporte para celular (PWA/Mobile-First) e desktop.

---

## 🚀 Funcionalidades

- **Autenticação com Firebase**:
  - Administradores: `brisasofc@gmail.com` e `rsmoveismontador@gmail.com`.
  - Funcionários: Login e senha cadastrados pelo administrador na aba de Ajustes.
- **Agenda Inteligente**:
  - Calendário mensal interativo com status por cores (Verde: Concluído, Vermelho: Agendado, Bicolor: Ambos).
  - Ações rápidas de WhatsApp, rota no Google Maps/Waze e conclusão do serviço em 1 clique.
- **Controle Financeiro Completo**:
  - Saldo líquido em tempo real, receitas, despesas e valor a receber.
  - Gráficos visuais (Chart.js): Entradas vs Saídas e Despesas por Categoria.
  - Livro caixa com filtros por período e tipo.
- **Gestão de Clientes**:
  - Cadastro completo com busca automática de endereço por CEP (ViaCEP).
  - Histórico de serviços e total investido por cliente.
- **Calculadora de Montagem & Orçamentos**:
  - Tabela rápida por tipo de móvel (guarda-roupa, painel TV, rack, cozinha, etc.).
  - Geração de mensagem formatada com emojis e Chave PIX para WhatsApp.
  - Conversão de orçamento aprovado em agendamento na agenda.
- **Emissão de Recibos Profissionais**:
  - Layout pronto para impressão ou exportação em PDF.
- **Sincronização em Nuvem**:
  - Persistência e sincronização de dados via Firebase Cloud Firestore.

---

## 🛠️ Tecnologias Utilizadas

- **HTML5 & CSS3** (Vanilla CSS, Design System moderno com Plus Jakarta Sans)
- **JavaScript ES6+** (Arquitetura modular SPA)
- **Firebase v10** (Authentication e Cloud Firestore)
- **Chart.js** (Gráficos financeiros)
- **Font Awesome 6** (Ícones)
- **ViaCEP API** (Consulta automática de endereços)

---

## 📦 Como Rodar Localmente

1. Clone o repositório:
   ```bash
   git clone https://github.com/santwoxx/cliente-rs-montagem.git
   ```
2. Abra o arquivo `index.html` em qualquer navegador web ou suba em um servidor HTTP local:
   ```bash
   python -m http.server 8080
   ```
3. Acesse `http://localhost:8080` no navegador.
