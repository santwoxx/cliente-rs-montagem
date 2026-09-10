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
  - Tipos de serviço pré-programados (Montagem, Instalação, Reparo, Manutenção, Consulta, Atendimento, Visita técnica, Diária) em chips, com campo livre para o detalhe.
  - Campos de **Deslocamento** e **Montador Responsável** por agendamento, além do status Cancelado.
- **Painel dos Montadores**:
  - Cadastro da equipe de montadores (incluindo o próprio dono, que também executa serviços).
  - Escolha um montador e veja total produzido, lucro líquido, concluídas, agendadas e a lista completa das montagens dele, com filtro por mês/ano/tudo.
- **Lojas Parceiras**:
  - Cadastro das lojas que repassam montagens, com contato, CNPJ e endereço.
  - Montagens agrupadas por loja, com total do período, já recebido e a receber.
  - **Nota única** somando todos os serviços da loja no período — pronta para PDF ou envio direto no WhatsApp da loja.
- **Nota de Serviço enviada direto ao cliente**:
  - Documento com logo, dados do prestador, itens, observações e dados do PIX (chave, banco e titular).
  - Botão que abre a conversa do cliente no WhatsApp já com a nota escrita — sem passo manual.
- **Tema claro e escuro**, com preferência salva no aparelho.
- **Controle Financeiro Completo**:
  - Saldo líquido em tempo real, receitas, despesas e valor a receber.
  - Gráficos visuais (Chart.js): Entradas vs Saídas e Despesas por Categoria.
  - Livro caixa com filtros por período e tipo.
- **Gestão de Clientes**:
  - Cadastro completo com busca automática de endereço por CEP (ViaCEP).
  - Ficha com histórico completo de serviços (antigos e novos) e total investido por cliente.
- **Calculadora de Montagem & Orçamentos**:
  - Tabela rápida por tipo de móvel (guarda-roupa, painel TV, rack, cozinha, etc.).
  - Geração de mensagem formatada com emojis e Chave PIX para WhatsApp.
  - Conversão de orçamento aprovado em agendamento na agenda.
- **Emissão de Recibos Profissionais**:
  - Layout pronto para impressão ou exportação em PDF.
- **Sincronização em Nuvem**:
  - Persistência e sincronização de dados via Firebase Cloud Firestore.

> As telas **Montadores** e **Lojas** são exclusivas do administrador, assim como a Gestão da Equipe.
> O histórico de pedidos do cliente que originou estas funcionalidades está em
> [TRANSCRICAO-VIDEOS.md](TRANSCRICAO-VIDEOS.md).

---

## 🛠️ Tecnologias Utilizadas

- **HTML5 & CSS3** (Vanilla CSS, Design System moderno com Plus Jakarta Sans)
- **JavaScript ES6+** (Arquitetura modular SPA)
- **Firebase v10** (Authentication e Cloud Firestore)
- **Chart.js** (Gráficos financeiros)
- **Font Awesome 6** (Ícones)
- **ViaCEP API** (Consulta automática de endereços)

---

## 🔒 Bloqueio Mensal & Licença (Variáveis de Ambiente na Vercel)

O sistema possui uma trava de segurança mensal que impede o uso do aplicativo caso o cliente não pague a mensalidade. Você pode controlar tudo pelo painel da Vercel em **Settings -> Environment Variables**:

| Variável | Valor Padrão / Exemplo | Descrição |
| :--- | :--- | :--- |
| `SYSTEM_PAID_UNTIL` | `2026-10-09` | **Data limite paga (YYYY-MM-DD)**. O sistema bloqueia automaticamente a partir dessa data. Para renovar por mais um mês após o pagamento, basta alterar para o mês seguinte (ex: `2026-11-09`). |
| `SYSTEM_STATUS` | `AUTO` | `AUTO` (bloqueia na data programada), `ACTIVE` (força liberação), ou `BLOCKED` (bloqueia na hora). |
| `DEV_PIX_KEY` | `brisasofc@gmail.com` | Sua chave PIX que aparecerá para o cliente fazer o pagamento. |
| `DEV_PIX_TYPE` | `E-mail` | Tipo da sua chave PIX (E-mail, Telefone, CPF ou CNPJ). |
| `DEV_WHATSAPP` | `5511999999999` | Seu WhatsApp para o cliente enviar o comprovante com 1 clique. |
| `DEV_MASTER_PASSWORD` | `desbloquear2026` | Senha mestra de emergência para você destravar o sistema direto na tela se precisar. |

