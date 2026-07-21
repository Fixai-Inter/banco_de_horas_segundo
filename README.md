# FIXA - Banco de Horas

Aplicação web para acompanhamento de horas semanais da equipe do segundo ano do **Fixa**, projeto integrado diretamente ao GitHub Projects.

---

## Motivação

Em projetos acadêmicos com múltiplos repositórios e membros trabalhando de forma assíncrona, é difícil ter visibilidade real de quanto cada pessoa está contribuindo semana a semana. Planilhas manuais se perdem, e ferramentas externas de time-tracking adicionam fricção desnecessária ao fluxo de trabalho, o que dificultaria nosso trabalho ao termos que adicionar as horas, comentários, detalhes de tudo que fizemos em outra plataforma.

O Projeto do Banco de Horas resolve isso de forma simples, onde usa **o próprio GitHub como fonte de dados**, sem banco de dados externo, sem backend, e sem que a equipe precise sair do ambiente que já utiliza no dia a dia.

---

##  Objetivo

Permitir que a equipe acompanhe o cumprimento da **meta mínima de 3 horas semanais** por membro (definido entre o próprio grupo), com base nas horas registradas diretamente nas issues do GitHub Projects, o que qualquer pessoa, de qualquer máquina, pode ver os mesmos dados ao abrir o site.

---

## Como funciona

### Registro de horas

As horas são registradas em dois lugares no GitHub Projects:

**Campo numérico `Horas Trabalhadas`**: preenchido na issue com o total acumulado de horas dedicadas àquela tarefa. Esse valor é usado nas métricas gerais do projeto (total por membro, por sprint, por matéria).

**Comentários com `+Xh`**: ao atualizar o campo, cada integrante adiciona um comentário na issue indicando o tempo dedidado daquela semana. É esse comentário que o sistema usa para calcular o banco de horas semanal.

Exemplo de fluxo:

```
Issue: "Modelagem Conceitual do Banco de Dados"
Assignee: alineteodoro

Semana 1 (20/jul):
  → comenta: "+2h levantamento de requisitos"
  → atualiza campo: 0 → 2

Semana 2 (27/jul):
  → comenta: "+3h diagrama ER e revisão"
  → atualiza campo: 2 → 5
```

O sistema contabiliza cada semana de forma independente, mesmo que seja a mesma issue, ou seja, nós conseguimos resolver o problema do cumprimento da meta semanal.

--- 

### Formatos aceitos nos comentários

O comentário precisa começar com os valores no seguinte formato:

| Formato | Equivalente |
|---|---|
| `+30m` | 30 minutos |
| `+2h30m` | 2 horas e 30 minutos |

O restante do comentário pode ser qualquer texto, já que o sistema só lê o início da linha.

### Campo numérico `Horas Trabalhadas`

O campo aceita os seguintes formatos:

| Valor | Interpretação |
| `30m` | 30 minutos |
| `2h30m` | 2 horas e 30 minutos |

### Métricas disponíveis

- Horas semanais por membro com um aviso se a meta foi cumprida ou não;
- Total de horas por sprint;
- Total de horas por matéria;
- Issues mais longas (por tempo de abertura);
- Contagem de revisões de PRs por membro;
- Histórico das últimas semanas por pessoa.

---

## Autenticação

A aplicação usa **Personal Access Token (PAT)** do GitHub.

### Como gerar seu token (feito uma vez por membro)

1. Acesse github.com → foto de perfil → **Settings**
2. **Developer settings** → **Personal access tokens** → **Fine-grained tokens**
3. **Generate new token**
4. Em **Resource owner**, selecione a organização `Fixai-Inter`
5. Em **Repository access**, selecione **All repositories**
6. Configure as permissões:
    **Repository permissions:** `Issues` → Read-only
    **Organization permissions:** `Projects` → Read-only, `Members` → Read-only
7. Gere e copie o token (`github_pat_...`)
8. Cole no campo de autenticação do site ao abrir

O token fica salvo na sessão do navegador e some ao fechar. Nenhuma informação sensível é armazenada no repositório ou enviada a servidores externos, mas o login de cada usuário fica guardado na máquina. Caso acesse por uma máquina que não seja a sua, não se esqueça de sair do site com o seu acesso pessoal.

---

##  Estrutura do projeto

```
src/
├── components/        # componentes de UI
├── services/
│   ├── GitHubDataService.ts    # query GraphQL + normalização dos dados
│   └── WeeklyHoursService.ts  # cálculo de horas semanais por comentários
├── auth/
│   └── GitHubAuth.tsx         # autenticação via PAT
└── App.tsx
```

## Campos do GitHub Projects utilizados

| Campo | Tipo | Uso |
| `Horas Trabalhadas` | Número | Total acumulado da issue, usado em métricas gerais |
| `Status` | Select | Situação atual da issue no kanban |
| `Sprint` | Iteration | Agrupamento por sprint(datas já bem definidas) |
| `Tipo` | Select | Diferencia Tasks de Épicos |
| `Ano` | Select | Filtra issues do 2º Ano |
| `Data de Início` | Data | Referência temporal da issue |
| `Data de Término` | Data | Referência de conclusão |

---

## Público-alvo
- **Integrantes da equipe**: acompanhamento do próprio progresso e da equipe semana a semana.
