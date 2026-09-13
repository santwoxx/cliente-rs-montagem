# Transcrição — ajustes de 13/09/2026

Dois áudios e um print enviados pelo cliente. Transcritos com Whisper
`large-v3-turbo` (português). Os arquivos de mídia não vão para o repositório.

---

## Áudio 1 — 11/09, 10:17 (59s)

> Natan, se liga, deixa eu te falar. Eu tô agendando desse mês, né? Desde o início,
> as antigas também. E eu faço o trabalho também de desmontar e montar, que é de
> mudança, né?
>
> Então, geralmente eu desmonto num dia e monto no outro, em outro dia. E é o mesmo
> valor, né? Que é um valor total pros dois.
>
> Tem como fazer algum esquema pra, tipo, na hora que eu tô agendando, eu ponho
> "ah, desmontar tal dia e montar tal dia"? Quando eu escolhi a opção desmontar e
> montar. Às vezes vai ser no mesmo dia — tem vezes que eu faço de manhã cedo e
> monto de tarde. Mas a maioria eu desmonto em um dia e monto no outro.
>
> Tem como fazer isso? Ou eu teria que dividir o valor? Porque eu não posso pôr o
> mesmo valor, né? Porque senão dobra.

**Pedido:** serviço de mudança com **duas datas e um valor só** — desmontagem num dia,
montagem no outro (às vezes no mesmo dia, manhã e tarde). Hoje ele precisaria criar
dois agendamentos, e aí o faturamento conta o valor duas vezes.

**Situação:** ainda não implementado. É uma mudança no modelo de dados do serviço
(uma ordem com duas datas, valor único), não um ajuste de tela.

---

## Áudio 2 — 12/09, 16:33 (15s)

> É boa, mano, vem pra mim aí. Mesmo eu apagando lá — apaguei, é o outro lá, não
> cadastra, ele continua ativo. E agora tá entrando na minha conta, **tá entrando
> como administrador**.

## Print — 13/09, 12:40

Tela de Ajustes > Cadastrar Novo Funcionário, com o nome "Ataliba" e o e-mail
`ataliba-souza@hotmail.com.br`. Circulado em verde, o aviso de erro:

> "Este e-mail já tem conta no sistema. Use outro e-mail ou redefina a senha dele."

E logo abaixo, "Equipe Cadastrada: **Nenhum funcionário cadastrado ainda**".

**Três defeitos encadeados, todos corrigidos:**

| # | Defeito | Correção |
| :-- | :--- | :--- |
| 1 | O e-mail do montador estava na lista fixa de administradores, em `js/firebase-config.js` e em `firestore.rules`. Ao entrar, ele virava **administrador** e via financeiro, carteira de clientes, repasses dos outros montadores e ajustes da empresa. | E-mail removido dos dois arquivos. A lista de admin agora tem só o dono e o desenvolvedor. |
| 2 | "Remover funcionário" prometia revogar o login, mas só apagava o registro — a conta do Firebase continuava entrando. | Quem entra agora é quem está na equipe: sem cadastro ativo, o login é recusado e deslogado na hora. |
| 3 | Com a conta já existente no Firebase, o cadastro travava em "este e-mail já tem conta" e a equipe ficava vazia para sempre. | O cadastro deixou de ser beco sem saída: vincula a conta existente à equipe e oferece o envio de link de nova senha. |

> **Por que a conta não é apagada de verdade:** o Firebase no navegador não apaga a
> conta de outra pessoa — isso exige o Admin SDK rodando em servidor. Por isso a
> revogação passou a ser feita pelo cadastro da equipe, que é o que o sistema
> controla. O efeito prático para o cliente é o mesmo: sem cadastro, não entra.

### Reimplantação do `firestore.rules`

O arquivo de regras precisa ser publicado no Console do Firebase para valer —
não basta subir o código. Firebase Console > Firestore Database > Rules > colar
o conteúdo de `firestore.rules` > **Publish**.
