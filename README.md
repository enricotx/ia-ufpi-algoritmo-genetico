# Algoritmo Genético: seleção de projetos de melhoria do campus

Atividade Prática de Inteligência Artificial — UFPI, período 2026.2

**Aplicação:** https://enricotx.github.io/ia-ufpi-algoritmo-genetico/
**Código-fonte:** https://github.com/enricotx/ia-ufpi-algoritmo-genetico
**Testes no navegador:** https://enricotx.github.io/ia-ufpi-algoritmo-genetico/testes.html

## Autores
- [Nome Completo] — [matrícula]
- [Nome Completo] — [matrícula]

## Problema
Selecionar projetos de melhoria de um campus, cada um com custo em reais e benefício em pontos,
maximizando a soma dos benefícios sem ultrapassar o orçamento. Benefícios aditivos, sem dependências
entre projetos, cada projeto escolhido no máximo uma vez (problema da mochila 0/1).

## Modelo e algoritmo
_TODO: cromossomo binário; população inicial; reparação (menor razão benefício/custo, empate → menor
índice); aptidão; torneio (candidatos distintos, empate → menor índice); cruzamento de um ponto
(corte entre o 1º e o penúltimo gene, taxa por par); mutação por inversão (taxa por gene); elitismo;
ordem dos sorteios; registro do melhor acumulado._

## Como usar
_TODO: passo a passo dos campos e botões (Executar, Pausar, Avançar uma geração, Reiniciar)._

Para rodar localmente, abra a pasta no VS Code e use a extensão Live Server, ou rode
`python -m http.server` e acesse `http://localhost:8000`. Abrir o `index.html` direto pelo
explorador de arquivos não funciona, porque o código usa módulos ES.

## Parâmetros
| Campo | Intervalo | Valor inicial |
| --- | --- | --- |
| Orçamento (R$) | ≥ 0, até 2 casas decimais | 7.000,00 |
| Tamanho da população | inteiro ≥ 2 | 20 |
| Número de gerações | inteiro ≥ 1 | 50 |
| Taxa de cruzamento (%) | 0 a 100, por par | 80 |
| Taxa de mutação (%) | 0 a 100, por gene | 5 |
| Tamanho do torneio | inteiro de 2 até a população | 2 |
| Indivíduos de elite | inteiro de 0 até a população − 1 | 1 |
| Semente aleatória | inteiro | 42 |

## Estrutura do código
| Arquivo | Função |
| --- | --- |
| `index.html` | aplicação |
| `testes.html` | executa os testes da seção 6 do enunciado |
| `css/estilo.css` | estilos (padrão do grupo) |
| `js/nucleo.js` | algoritmo genético: funções puras, sem DOM |
| `js/prng.js` | gerador pseudoaleatório com semente (Mulberry32) |
| `js/validacao.js` | leitura e validação dos campos |
| `js/formato.js` | formatação pt-BR |
| `js/graficos.js` | gráficos e animações |
| `js/ui.js` | eventos, estado da execução e logs |
| `js/testes.js` | casos de teste |

## Bibliotecas auxiliares
| Biblioteca | Versão | Finalidade |
| --- | --- | --- |
| Chart.js | 4.4.1 | gráfico do histórico por geração |

O gerador pseudoaleatório com semente (Mulberry32) é implementação própria, em `js/prng.js`.
Nenhuma biblioteca de IA ou otimização foi usada.

## Testes de validação
_TODO: para cada item da seção 6 do enunciado — Entradas e parâmetros · Esperado · Obtido · Conclusão._

### 6.2 — Avaliação de uma solução
### 6.3 — Reparação de uma solução inviável
### 6.4 — Cruzamento, mutação, limites das taxas e seleção
### 6.5 — Execução completa
### 6.6 — Limites de orçamento
### Validação da interface

## Análise dos resultados
_TODO: comparação de mutação 1% × 20% (sementes 1 a 5): média do melhor benefício final,
quantas execuções atingiram 12 e interpretação._

## Limitações
_TODO_
