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
- **App instalável (PWA)**:
  - Instala na tela inicial do Android e abre sem barra de navegador.
  - Funciona offline: a agenda, os clientes e o financeiro continuam abrindo sem sinal.
  - Atalhos de toque longo no ícone: Nova Montagem, Agenda e Novo Cliente.
- **Pagamento do montador**:
  - Campo de quanto o montador recebe por serviço, com atalhos de porcentagem que
    já entram arredondados (30% de R$ 574 vira R$ 172, sem centavo quebrado).
  - O administrador vê valor cheio, material, repasse e sobra. **O montador vê só
    o que ele recebe** — nunca o valor cobrado do cliente nem o lucro do dono.
  - O repasse entra sozinho no livro caixa como despesa "Pagamento de Montador".
- **Fotos do móvel no agendamento**:
  - Até 6 fotos por serviço, da galeria ou da câmera, comprimidas automaticamente.
  - Miniatura que só amplia no toque, e que o montador escalado também enxerga.
- **Notificações locais**:
  - Resumo das montagens do dia em horário fixo e aviso antes de cada montagem.
- **Nota em PDF de verdade**:
  - Gera o arquivo e cai no menu de compartilhar do Android (ou baixa direto),
    em vez de depender da tela de impressão do sistema.

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


---

## 📱 Instalar no celular do montador (Android)

O sistema é um **PWA**: instala na tela inicial e abre como aplicativo.

1. Abra o site no **Chrome** do Android (precisa ser **https**, ou seja, o endereço da Vercel — não funciona por `file://`).
2. Aparece a faixa **"Instalar o RS Montagens"** no rodapé. Toque em **Instalar**.
3. Se a faixa não aparecer, vá em **Ajustes ▸ App no celular ▸ Instalar na tela inicial**, ou use o menu do Chrome (⋮) ▸ **Instalar app**.
4. Depois de instalado, **abra sempre pelo ícone RS**, não pela aba do navegador.

Segurando o dedo no ícone aparecem os atalhos **Nova Montagem**, **Agenda** e **Novo Cliente**.

### Atualizar o app depois de uma mudança no código

O service worker guarda os arquivos no celular. Ao publicar uma alteração em `css/` ou `js/`, **suba o `CACHE_VERSION` no topo do [sw.js](sw.js)** (`v1` → `v2`). Sem isso o celular pode continuar abrindo a versão antiga. Quando a versão nova chega, o app mostra um aviso *"Versão nova disponível — toque para atualizar"*.

---

## 🔔 Notificações — o que dá e o que não dá

Em **Ajustes ▸ Notificações** dá para ligar:

- **Resumo da manhã**: em horário fixo, lista quantas montagens tem no dia e a que horas começa.
- **Aviso antes da montagem**: 15, 30, 45, 60, 90 ou 120 minutos antes, com cliente, endereço e serviço. Tocar no aviso abre a ficha daquela montagem.

**Limite desta versão:** quem conta o tempo é o próprio app, sem servidor. Enquanto ele estiver instalado e em segundo plano, os avisos saem. Se o Android encerrar o app de vez (ou o montador fechá-lo pela lista de recentes), **o aviso daquele horário não dispara** — o resumo do dia é recuperado na próxima abertura, o lembrete de 30 min não.

Para disparo garantido com o app fechado seria preciso **Web Push com um servidor agendando os envios** (endpoint na Vercel + um cron a cada 10 min). Não está implementado.

---

## 💰 Pagamento do montador

No modal de agendamento, seção **Pagamento do montador** (só o administrador vê):

- Digite o valor em reais, ou toque em **30% / 40% / 50% / 60% / 70%** para calcular sobre o total — o valor entra **sempre arredondado**, sem centavo quebrado.
- **Sobra para você** = total − material − pagamento do montador.

**Quem vê o quê:**

| | Administrador | Montador (funcionário) |
| :--- | :--- | :--- |
| Valor cobrado do cliente | ✅ | ❌ |
| Gastos com material | ✅ | ❌ |
| Lucro / sobra do dono | ✅ | ❌ |
| Quanto ele recebe | ✅ | ✅ |
| Montagem de outro montador | ✅ | 🔒 bloqueada |

> Para isso funcionar, o montador precisa estar **vinculado ao login dele**. Ao cadastrar um funcionário em *Ajustes ▸ Gestão da Equipe*, o montador é criado e vinculado sozinho. Para um montador já existente, edite-o em **Montadores** e preencha o campo **E-mail de login**, usando exatamente o mesmo e-mail da conta de acesso.

O repasse vira automaticamente uma despesa no livro caixa (categoria **Pagamento de Montador**), marcada como paga quando o serviço é concluído. Quando quem monta é o próprio dono (montador marcado como "sou eu"), não há repasse e nada é lançado.

---

## 📷 Fotos do móvel

O cliente manda a foto no WhatsApp, você anexa no agendamento e limpa a galeria do celular.

- Até **6 fotos por serviço**, pela **galeria** ou pela **câmera**.
- São reduzidas automaticamente (máx. ~1100px, ~130 KB cada) antes de subir.
- Ficam como miniatura: **não abrem sozinhas**, só ampliam no toque.
- O montador escalado vê as fotos no celular dele; só o administrador pode apagá-las.

**Onde ficam guardadas:** cada serviço tem seu próprio documento no Firestore (`app_data/service_photos_<id>`). O app inteiro guarda os serviços num documento único, e documento do Firestore estoura em 1 MB — se as fotos fossem junto, meia dúzia de agendamentos derrubaria a sincronização de tudo.

> ⚠️ **Publique as regras atualizadas do Firestore.** O arquivo [firestore.rules](firestore.rules) foi alterado para permitir que funcionários gravem fotos. Sem publicar, só o administrador consegue anexar. No Console do Firebase: **Firestore Database ▸ Rules ▸ Publicar**, ou `firebase deploy --only firestore:rules`.

---

## 🧾 Nota em PDF

O botão **Gerar PDF** chamava `window.print()`, que no celular abre a tela de impressão do Android e nem sempre chega a um arquivo. Agora são dois botões:

- **Baixar PDF** — gera o arquivo de verdade (html2pdf). No Android abre o menu de compartilhar, dá para mandar no WhatsApp da loja na hora; onde isso não existe, baixa normalmente.
- **Imprimir** — continua disponível para quem quiser a impressora.

---

## 🛠️ Cadastro de funcionário não funciona?

O cadastro depende de duas chaves no Console do Firebase. Agora o sistema **diz exatamente qual delas está faltando** em vez de mostrar o erro cru:

| Mensagem | O que fazer |
| :--- | :--- |
| *"O login por e-mail/senha está DESLIGADO no Firebase"* | **Authentication ▸ Sign-in method** ▸ ative **E-mail/senha**. |
| *"O Firebase está bloqueando a criação de contas pelo app"* | **Authentication ▸ Settings ▸ User actions** ▸ marque **Enable create (sign-up)**. |
| *"Este e-mail já tem conta no sistema"* | Use outro e-mail ou apague a conta antiga em **Authentication ▸ Users**. |

Junto com a correção, o `uid` do funcionário passou a ser lido **antes** de encerrar a conexão temporária do Firebase — antes disso o cadastro podia ir para o Firestore sem identificador.

---

## 🧪 Rodando na sua máquina

Service worker e instalação **exigem http/https** — abrir o `index.html` com dois cliques (`file://`) não registra o PWA.

```bash
python -m http.server 8000
# depois abra http://127.0.0.1:8000
```

Em `localhost` o Chrome trata como origem segura, então dá para testar instalação, offline e notificações.

---

## ⚡ Desempenho

O sistema travava alguns décimos de segundo a cada montagem salva. Medido com 900 serviços,
1.800 lançamentos, 400 clientes, 60 lojas e 40 montadores, num celular emulado 4× mais lento
que um desktop:

| | Antes | Depois |
| :--- | ---: | ---: |
| Atualizar as telas depois de salvar | 468 ms | **1 ms** |
| `JSON.parse` por atualização | 174 | **0** |
| Tela de Clientes | 112 ms | **1,5 ms** |
| Tela de Lojas | 159 ms | **0,4 ms** |
| Tela de Montadores | 93 ms | **1,4 ms** |
| Início (KPIs) | 6,6 ms | **0,3 ms** |

O que mudou:

- **Cache em memória no `StorageManager`.** Cada leitura de serviços/clientes/lançamentos
  refazia o `JSON.parse` da base inteira. Uma única atualização de tela chegava a fazer 174.
  Agora a base interpretada fica na memória e o `localStorage` é só a cópia em disco.
- **Só a tela visível é redesenhada.** Salvar uma montagem redesenhava as seis telas, inclusive
  as escondidas. Agora as outras ficam marcadas e se atualizam quando ele abre cada uma.
- **Índice de serviços por loja, montador, cliente e data.** As listas varriam os 900 serviços
  uma vez por linha (60 lojas × 900 serviços por tela). O índice é montado uma vez e descartado
  quando os serviços mudam.

---

## 💸 Custo zero

O sistema roda inteiro dentro da camada gratuita. Nada aqui exige plano pago:

| Serviço | Plano | Limite | Uso do sistema |
| :--- | :--- | :--- | :--- |
| **Vercel** | Hobby (grátis) | site estático + funções | 1 função (`/api/license`) |
| **Firebase Auth** | Spark (grátis) | ilimitado para e-mail/senha | login do dono e da equipe |
| **Firestore** | Spark (grátis) | 20 mil gravações e 50 mil leituras por dia | muito abaixo disso |
| **Firestore (espaço)** | Spark (grátis) | 1 GB | dados + fotos |

Duas providências foram tomadas para não estourar a cota:

- **Gravações agrupadas.** Concluir uma montagem gravava serviço, receita, despesa de material
  e repasse do montador — quatro gravações na nuvem em menos de um segundo, cada uma subindo a
  base inteira. Agora as alterações se acumulam por 2,5 s e sobem juntas, e o envio pendente é
  despejado quando o app vai para segundo plano (`pagehide`), sem perder nada.
- **Aviso de base grande.** Cada coleção vive num documento só, e documento do Firestore
  **para de aceitar gravação em 1 MB**. Sem aviso, a sincronização pararia um dia em silêncio e
  o montador só descobriria ao trocar de celular. O sistema avisa a partir de 750 KB, e o uso
  atual aparece em **Ajustes ▸ Backup e Segurança**.

> **Quando a base chegar perto de 1 MB** (algo como 2.000 a 2.500 serviços, anos de trabalho),
> baixe o backup e arquive os serviços antigos. A alternativa definitiva seria passar cada
> serviço a um documento próprio no Firestore — continua de graça, mas é uma refatoração.

**O que custaria dinheiro** (e por isso não foi feito): notificação push garantida com o app
fechado precisaria de um agendador — Vercel Cron no plano Hobby só roda 1× por dia, e rodar de
10 em 10 minutos exigiria o Vercel Pro (~US$ 20/mês) ou um cron externo gratuito.

---

## 🆕 Primeiro acesso do montador

O sistema é entregue **vazio**: sem clientes, sem agenda, sem lançamentos, sem lojas e sem
equipe. Os dados de exemplo que acompanhavam as primeiras versões (Rodrigo Silva, Mariana
Santos, Loja TokLar, o histórico de setembro) foram removidos, e quem já tinha aberto o
sistema tem esses registros apagados sozinho na primeira vez que abrir esta versão —
**pelos ids fixos que eles sempre tiveram, então nada que ele já cadastrou é tocado.**

A limpeza roda duas vezes de propósito: no boot, para o aparelho, e logo depois do login,
quando o Firestore já respondeu — senão a nuvem devolveria os exemplos que acabaram de sair.

Ordem sugerida para começar:

1. **Ajustes ▸ Dados do Montador** — nome, WhatsApp, CNPJ e a **chave PIX** (ela vai impressa
   na nota que o cliente final recebe, então não pode ficar em branco).
2. **Ajustes ▸ Logo** — a logo aparece no topo da nota de serviço.
3. **Montadores** — cadastre-se como montador marcando *"Sou eu (dono da empresa)"*.
4. **Ajustes ▸ Meta de Faturamento** — vem em R$ 5.000 por padrão.
5. **Orçamentos ▸ tabela de preços** — já vem preenchida com valores de referência por tipo
   de móvel; ajuste para os preços dele.

Continua vindo pronto: os **tipos de serviço** (Montagem, Instalação, Reparo…) e a
**tabela de preços**. São ponto de partida editável, não dados de exemplo.

### Recomeçar do zero

**Ajustes ▸ Recomeçar do zero** apaga todas as montagens, clientes, lançamentos, lojas,
montadores e fotos — no aparelho **e na nuvem**, com dupla confirmação. O perfil, a chave PIX,
a logo e a tabela de preços continuam. Não há como desfazer: baixe o backup antes.
