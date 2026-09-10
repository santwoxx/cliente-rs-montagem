# Transcrição dos vídeos do cliente e ajustes aplicados

Transcrição dos três vídeos de feedback (WhatsApp, 09/09/2026) e o que foi
implementado no sistema a partir de cada pedido.

Transcrito com Whisper `large-v3-turbo` a partir do áudio dos MP4.
Os vídeos são gravações de tela do aplicativo instalável ("Autônomos Agenda"),
usadas pelo cliente como referência do que ele quer aqui no sistema web.

---

## Vídeo 1 — Agendamento e nota fiscal (1:50)

> **[00:00]** E no agendamento você pode deixar igualzinho tá aqui, que eu gostei.
> Vem aqui ó, agendar, aí no cliente ó, você escolhe na agenda, aí você põe o nome
> do cliente.
>
> **[00:14]** Aí aqui ó, tipo de serviço — pode até deixar esses assim ó, Montagem,
> Instalação, pode deixar esses pré-programado, porque aí o resto eu vou pôr aqui
> nos detalhes, tipo Reparo, reparo etc.
>
> **[00:37]** Aí aqui eu tenho que mudar manual. O teu ficou legal: quando você
> clica ele mostra o bagulho, o reloginho.
>
> **[00:49]** Aí aqui o valor. Beleza. Aí cadastrar. Aí aqui, apareceu aqui.
>
> **[01:03]** Aí a nota fiscal. Eu vou te enviar a nota fiscal pra tu ver. Essa nota
> aqui ó, eu gostei — eu achei que pode até manter bem parecido com a dele,
> observação tal. Eu vou te mandar esses daqui pra tu ver como é que tá, que eu curti.
>
> **[01:20]** Ó, envio a nota. Só que ó, **a nota dele não vai direto para a pessoa.
> Aí se for direto para a pessoa fica melhor.** Ó, eu vou te enviar — ó, esses já vai direto.

### O que foi feito

| Pedido | Implementação |
| :--- | :--- |
| Manter o fluxo de agendamento | Modal reorganizado na mesma ordem: cliente → tipo de serviço → montador/loja → data/hora → valores |
| Tipos de serviço pré-programados | 8 chips clicáveis (Montagem, Instalação, Reparo, Manutenção, Consulta, Atendimento, Visita técnica, Diária) + campo livre. O detalhe continua na descrição e nas observações |
| Seletor nativo de data/hora ("o reloginho") | Mantidos `input type="date"` e `type="time"` — era o ponto que ele elogiou em relação ao outro app |
| Layout da nota com observações | Nota reescrita com logo, dados do prestador, tabela de itens, observações, forma de pagamento e dados do PIX |
| **Nota indo direto para a pessoa** | Botão **"Enviar nota ao cliente"** na ficha do serviço e no rodapé da nota: monta o texto completo e abre a conversa do cliente no WhatsApp |

---

## Vídeo 2 — Ajustes, clientes e início (1:50)

> **[00:00]** O painel aqui né, o painel tema escuro né. Aí aqui ó os dados: aí nome,
> razão social, profissão ou CNPJ né, telefone, endereço, pá. Os dados do PIX né,
> a logo — para que é o que faz aquele bagulho lá de enviar.
>
> **[00:27]** Aí o resto aqui é só o link das redes né, do Google Meu Negócio né,
> pras pessoas falar lá né, postar aqui da estrelinha, ou do Facebook, Instagram.
>
> **[00:38]** Só que isso aqui eu não uso — **YouTube, TikTok**, não uso. Pode até
> deixar o do Instagram. **Instagram, Facebook, Google Meu Negócio só.**
>
> **[00:47]** Aí aqui, não sei do que que isso aqui, dados que não faz nada.
>
> **[00:54]** E aí aqui, arranque para tirar. Aí clientes, um bagulhinho de pesquisa
> né e tal, aí se der para vincular lá no coisa.
>
> **[01:00]** Aí o que eu gostei foi tipo aqui ó, no cliente né, eu venho aqui ó,
> já mostra o histórico de tudo que ele tem, dá para abrir mesmo os antigos, mesmo os
> novos, tá vendo ó, concluído, dá pra abrir e ver tudo certinho.
>
> **[01:14]** Aí agenda, aquele esquema né, fica a agenda aqui com as coisas embaixo.
> No início fica o painel né, de valores e tal, aí os próximos agendamentos e o
> cadastro, e o cadastro e o agendamento.

### O que foi feito

| Pedido | Implementação |
| :--- | :--- |
| Tema escuro | Interruptor claro/escuro em Ajustes → Aparência, com preferência salva e gráficos que acompanham o tema |
| Dados completos do profissional | Nome/Razão social, Profissão, CNPJ ou MEI, Telefone, Endereço e Cidade/Estado |
| Dados do PIX | Chave, Tipo, **Banco** e **Nome do titular** — usados nas mensagens e na nota |
| Logo na nota | Upload de logo (até 900 KB), com pré-visualização e opção de remover; aparece no topo da nota |
| Só Google, Facebook e Instagram | Cadastradas exatamente essas três redes. **YouTube e TikTok não foram incluídos**, conforme pedido |
| Seção "dados que não faz nada" | Não existe neste sistema — nada a remover |
| Histórico completo no cliente | Já existia e foi mantido; agora cada item do histórico mostra também o tipo de serviço e o total com deslocamento |

> **Observação:** o pedido "se der para vincular lá no coisa" (importar contatos do
> WhatsApp/agenda do celular ao cadastrar cliente) **não foi implementado**: um site
> não tem acesso à agenda do aparelho. Isso exige o aplicativo instalável (Android)
> ou a API de contatos, que só funciona em alguns navegadores e com permissão
> explícita do usuário. Fica registrado para ser decidido separadamente.

---

## Vídeo 3 — Painel dos montadores e lojas (1:35)

> **[00:00]** E aí aqui no ajustes né, você coloca que nem já tá lá né, eu vi que tá
> lá cadastro né, dos montadores.
>
> **[00:09]** Aí **onde tá em ranking você pode pôr esse ranking, trocar para painel
> dos montadores** né, com ele. E aí eu... aqui eu vou ver tipo quanto que o montador...
> **quais montagens que o montador fez.** Assim aqui vai, eu escolho tal montador, aí
> aparece as montagens que ele fez. Aí o outro montador, as montagens que ele fez também.
>
> **[00:40]** E aqui loja, aí você pode pôr loja, pra fazer aquele esquema lá.
> **Pra mim saber qual, tipo, essa loja, essa loja e essa loja. Essa loja eu fiz essas
> montagens, essa loja eu fiz essas montagens.**
>
> **[00:54]** Aí o da loja, fazer tipo a nota lá, **fazer uma nota que some tudo,
> todos os itens.**
>
> **[01:10]** Aí tipo aqui ó, **onde está agenda tem uma opção aqui montador, aí eu
> escolho qual montador que vai ser** — que vai ser eu mesmo né, aí eu faço.
> É, deixa um com meu nome porque eu também trabalho, ou os outros montador.

### O que foi feito

| Pedido | Implementação |
| :--- | :--- |
| Ranking → **Painel dos Montadores** | Nova aba "Montadores". Escolhe o montador e vê total produzido, lucro líquido, concluídas, agendadas e a lista completa das montagens dele. Filtro por mês/ano/tudo |
| Cadastro dos montadores | Cadastro próprio (nome, WhatsApp e marcação "sou eu"), separado do login de funcionário que já existia em Ajustes |
| **Loja** = lojas parceiras | Nova aba "Lojas": cadastro de lojas e, ao abrir uma loja, a lista de todas as montagens dela com total, já recebido e a receber |
| **Nota que soma tudo** | Botão "Gerar nota única" monta um documento com todos os serviços da loja no período, somando o total, pronto para PDF. E "Enviar nota à loja" manda essa nota consolidada direto no WhatsApp da loja |
| Montador no agendamento | Campo "Montador Responsável" no modal de agendamento, já sugerindo o dono ("eu") |

---

## Ajustes técnicos incluídos junto

- **Deslocamento** como campo próprio no serviço, somando no total que o cliente paga
  (era assim no app de referência). Lucro líquido = total − material.
- **Status "Cancelado"**, além de Agendado e Concluído. Cancelar retira o serviço do
  financeiro; reabrir e excluir também mantêm o caixa em sincronia.
- Correção de dois defeitos de layout que já existiam: a agenda estourava a largura da
  tela no desktop (`1fr` sem `minmax(0, …)`) e o cabeçalho gerava rolagem horizontal no
  celular.
- Regras do Firestore atualizadas: lojas e montadores são escrita exclusiva do
  administrador, como já eram as configurações e o financeiro.
