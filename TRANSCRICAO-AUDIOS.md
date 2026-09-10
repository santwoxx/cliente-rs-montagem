# Transcrição dos áudios do cliente — 10/09/2026

Três mensagens de voz enviadas pelo montador depois de testar o sistema.
Transcritas com Whisper (modelo `medium`, português). Os arquivos de áudio
não vão para o repositório — só esta transcrição.

---

## Áudio 1 — 08:44 (1min02)

> Pô mano, perfeito cara, tá da hora. Deixa eu só te perguntar uma coisa, da parte do montador,
> eu não vi como que o, pra por quanto que ele vai ganhar, tá? É tipo assim, eu consigo pôr o
> montador, eu fiz uns testes lá, mudei e tal, só que eu não consigo pôr quanto que ele vai ganhar, tá ligado?
> Eu preciso que tipo assim para mim aparece o valor total né vai a 280 e para ele só
> aparece a 200 tá ligado tipo ou em forma de porcentagem é que eu acho que número
> redondo é mais fácil se eu ponho 30% às vezes vai ficar 172 e 30 centavos eu
> já arredondo tudo, tá ligado? E o bagulho do PDF. E o cadastro, eu tentei cadastrar
> um montador lá com o email, né, o login dele, e não foi.

**O que foi pedido:**

1. Definir **quanto o montador ganha** em cada serviço.
2. **Admin vê o valor cheio** (R$ 280) e **o montador vê só a parte dele** (R$ 200).
3. Preferência por **valor fixo arredondado** em vez de porcentagem quebrada.
4. "O bagulho do PDF" — frase não concluída; apurado depois como *o PDF sai em branco / não abre*.
5. **Cadastro de montador com e-mail/login não funcionou.**

**Como foi atendido:** campo "Quanto o montador recebe" com atalhos de porcentagem que já
entram arredondados; painel de valores que muda conforme quem está logado; correção do
cadastro de funcionário e mensagens de erro que dizem qual configuração do Firebase falta;
botão "Baixar PDF" gerando o arquivo de verdade.

---

## Áudio 2 — 08:47 (49s)

> Deixa eu te falar, tem como colocar foto no agendamento, porque o cliente me manda foto,
> eu dou o valor conforme o tipo de móvel, então ele me manda foto do móvel e tal,
> e aí para me lembrar, porque minha agenda, minha galeria fica entupida de foto, aí
> eu sempre vou apagando e aí tipo quando eu passar por montador também aí já
> tem a foto lá tipo ela não precisa abrir automático só ali aí cê clica e
> ela e ela abre tem como fazer algum bagulho nesse gênero aí tem que
> caber mais de uma foto que às vezes são mais de um de um armário

**O que foi pedido:**

1. **Anexar fotos ao agendamento** (o cliente manda a foto do móvel e ele precifica por ela).
2. Liberar a **galeria do celular**, que vive cheia.
3. As fotos precisam aparecer **para o montador escalado** também.
4. **Não abrir automático**: miniatura que só amplia no toque.
5. **Mais de uma foto por serviço.**

**Como foi atendido:** até 6 fotos por serviço (galeria ou câmera), comprimidas no aparelho,
em miniatura que só amplia no toque, visíveis para o montador escalado.

---

## Áudio 3 — 08:57 (30s)

> Deixa eu te falar sobre as notificações. Você consegue fazer assim? Tipo, uma notificação de manhã
> cedinho, sempre no mesmo horário, meio que com resumão, tá ligado? Você tem tais montagens e
> só com resuminha. E aí, sempre meia hora antes da montagem, ela manda outra notificação específica
> daquela montagem, tem como fazer esse tipo de notificação?

**O que foi pedido:**

1. **Resumo de manhã** em horário fixo, com as montagens do dia.
2. **Aviso 30 minutos antes** de cada montagem, específico daquela montagem.

**Como foi atendido:** notificações locais com horário do resumo e antecedência configuráveis.
Ver a seção *Notificações — o que dá e o que não dá* no [README.md](README.md): sem servidor de
push, o aviso depende de o Android não ter encerrado o app.
