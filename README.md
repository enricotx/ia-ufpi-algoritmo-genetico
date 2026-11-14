# Algoritmo Genético: seleção de projetos de melhoria do campus

Atividade Prática de Inteligência Artificial — UFPI, período 2026.2

**Aplicação:** https://jpedro-doc.github.io/ia-ufpi-algoritmo-genetico/
**Código-fonte:** https://github.com/jpedro-doc/ia-ufpi-algoritmo-genetico
**Testes no navegador:** https://jpedro-doc.github.io/ia-ufpi-algoritmo-genetico/testes.html

## Autores
- João Pedro <!-- nome completo --> — matrícula <!-- preencher -->
- Enrico <!-- nome completo --> — matrícula <!-- preencher -->

## Problema
Um campus tem orçamento limitado e uma lista de projetos de melhoria, cada um com nome, custo em reais e benefício em pontos. O objetivo é escolher projetos (cada um no máximo uma vez) que maximizem a soma dos benefícios sem ultrapassar o orçamento. Os benefícios são aditivos e não há dependência entre projetos. É uma mochila 0/1 resolvida com algoritmo genético. A aplicação começa com os quatro projetos da seção 6.1 e permite editar, adicionar e remover projetos, mantendo entre 4 e 15.

## Modelo e algoritmo

**Representação.** Cromossomo binário com um gene por projeto, na ordem da tabela (genes A, B, C, …). Gene 1 = projeto selecionado. Ex.: `1010` seleciona A e C.

**Avaliação e reparação.** Custos e orçamento são convertidos para **centavos inteiros** (`Math.round(valor * 100)`), o que deixa a comparação com o orçamento exata. Antes de avaliar, todo cromossomo é reparado: enquanto o custo passa do orçamento, sai o projeto selecionado de **menor razão benefício/custo**; em empate, sai o de **menor índice**. A comparação é feita por multiplicação cruzada (`b_i · c_j < b_j · c_i`), sem divisão, para não depender de arredondamento. A aptidão é o benefício total da solução já reparada, e o cromossomo guardado na população é o reparado. A seleção vazia é válida e tem aptidão 0.

**Operadores.**
- *Seleção por torneio:* sorteia `k` candidatos **distintos** (Fisher-Yates parcial) da população anterior; vence o de maior aptidão e, em empate, o de menor índice. Cada pai sai de um torneio independente, então o mesmo indivíduo pode ser os dois pais.
- *Cruzamento de um ponto:* aplicado por par se `rng() < taxaCruzamento`. O corte é sorteado em `[1, n−1]` (após o gene `corte`). Filho 1 = início do pai 1 + fim do pai 2; filho 2 = o contrário. Sem cruzamento, os filhos são cópias dos pais.
- *Mutação por inversão:* um sorteio por gene de cada filho; o gene inverte se `rng() < taxaMutacao`.
- *Elitismo:* os `elite` melhores (empate → menor índice) são copiados sem mutação e sem nova avaliação.

**Ordem dos sorteios** (faz parte do resultado; gerador Mulberry32, `js/prng.js`):
1. Geração 0: para cada indivíduo e, dentro dele, para cada gene, `rng() < 0.5 ? 1 : 0`. Repara e avalia cada um. A geração 0 entra no histórico.
2. Elitismo (não sorteia nada).
3. Enquanto houver vaga, para cada par: torneio do pai 1 (`k` sorteios), torneio do pai 2 (`k` sorteios), sorteio do cruzamento e, se ocorrer, do corte, `n` sorteios de mutação do filho 1 e depois `n` do filho 2. Em seguida repara e avalia os filhos.
4. Se resta só uma vaga, entra apenas o filho 1. O filho 2 é sorteado do mesmo jeito (a ordem dos sorteios não muda) e aparece no log como descartado.

**Casos-limite.** Os pais vêm sempre da população anterior. O melhor acumulado só muda quando aparece aptidão estritamente maior. O histórico tem `gerações + 1` registros. Com orçamento 0, toda a população vira `0000` após a reparação.

**Arquitetura.** O algoritmo fica em `js/nucleo.js`, com funções puras, sem DOM e sem o gerador nativo do JavaScript. Cada operador tem uma função **determinística**, que recebe a decisão pronta (`cruzarEmPonto(p1, p2, corte)`, `inverterGenes(c, indices)`, `vencedorTorneio(candidatos, aptidoes)`), e uma **sorteadora**, que sorteia com o `rng` e chama a primeira (`cruzar`, `mutar`, `selecionarPorTorneio`). Uma geração é `passo(estado, parametros, rng) → { estado, eventos }`. A interface transforma os eventos em log, tabelas e animação. Pausar é só parar de chamar `passo`, e a velocidade muda apenas o intervalo entre chamadas, sem consumir números do `rng`.

## Como usar
1. Abra a aplicação. Os valores iniciais são os do teste 6.5, então **Executar** já reproduz o teste.
2. Edite a tabela de projetos (nome, custo em R$, benefício). **+ Adicionar projeto** e **×** ficam bloqueados fora de 4 a 15 itens. **Restaurar valores iniciais** volta aos dados da seção 6.
3. Ajuste os parâmetros. Campos inválidos ficam com borda vermelha e mensagem embaixo, e o topo do painel mostra quantos são; a execução fica bloqueada até a correção. Use vírgula ou ponto como separador decimal, sem separador de milhar.
4. Botões:
   - **Executar** roda até a última geração (ou retoma após pausar).
   - **Pausar** preserva o estado.
   - **Avançar uma geração** produz exatamente uma geração, continua pausado e toca a animação do par 1.
   - **Reiniciar** limpa o histórico e recria o gerador com a semente configurada.
   - **Intervalo entre gerações** controla a velocidade.
5. Alterar qualquer campo depois de executar pausa a execução e mostra *Configuração alterada — clique em Reiniciar*.
6. Em **Animação das operações**, escolha um par da geração atual e clique em **▶ Animar par**. A animação mostra o torneio, os pais, o corte, a troca de segmentos, os bits mutados (laranja), a remoção na reparação (bit riscado em vermelho) e a vaga de cada filho.
7. **Log da execução** tem um painel por geração, o mais recente aberto. **Copiar log** copia a execução inteira em texto.

**Rodar localmente:** os scripts são módulos ES e não abrem por `file://`. Rode `python3 -m http.server` na pasta e acesse `http://localhost:8000/` (ou use a extensão Live Server do VS Code).

## Parâmetros
| Campo | Intervalo | Valor inicial |
| --- | --- | --- |
| Projetos (nome, custo, benefício) | 4 a 15 itens; nome não vazio; custo > 0 com até 2 casas; benefício ≥ 0 | A, B, C, D da seção 6.1 |
| Orçamento disponível (R$) | ≥ 0, até 2 casas | 7000,00 |
| Tamanho da população | inteiro, 2 a 1000 | 20 |
| Número de gerações | inteiro, 1 a 10000 | 50 |
| Taxa de cruzamento (%) | 0 a 100, por par | 80 |
| Taxa de mutação (%) | 0 a 100, por gene | 5 |
| Tamanho do torneio | inteiro, 2 até o tamanho da população | 2 |
| Indivíduos de elite | inteiro, 0 até população − 1 | 1 |
| Semente aleatória | inteiro, 0 a 4294967295 | 42 |

Torneio e elite são revalidados sempre que o tamanho da população muda. Os limites superiores de população, gerações, valores em reais (R$ 1 trilhão) e semente não vêm do enunciado. Foram adicionados para manter os centavos exatos e o navegador responsivo (ver Limitações).

## Estrutura do código
| Arquivo | Papel |
| --- | --- |
| `index.html` | aplicação |
| `testes.html` | roda todos os testes da seção 6 e mostra PASSOU/FALHOU |
| `css/estilo.css` | cores e layout do padrão do grupo |
| `js/prng.js` | gerador com semente Mulberry32, `inteiroEntre`, `sortearDistintos` |
| `js/nucleo.js` | algoritmo: `avaliar`, `reparar`, `cruzarEmPonto`, `inverterGenes`, `vencedorTorneio`, sorteadoras, `inicializar`, `passo`, `executar` |
| `js/validacao.js` | `lerNumero` e validação conjunta de todos os campos |
| `js/formato.js` | formatação pt-BR (reais, decimais, %) |
| `js/graficos.js` | gráfico de evolução (Chart.js) e animação dos operadores em SVG |
| `js/ui.js` | eventos da tela, estados da execução, tabelas e logs |
| `js/testes.js` | casos de teste (importa `nucleo.js`) |

## Bibliotecas auxiliares
| Biblioteca | Versão | Finalidade |
| --- | --- | --- |
| Chart.js | 4.4.1 (CDN jsDelivr) | gráfico de evolução da aptidão |

O gerador pseudoaleatório (Mulberry32) é implementação própria, em `js/prng.js`. O algoritmo genético, a animação (SVG) e a validação não usam nenhuma biblioteca.

## Testes de validação
Todos os casos abaixo rodam em [`testes.html`](testes.html): **27 de 27 passaram**. Os testes controlados chamam direto as funções determinísticas, com corte, genes e candidatos forçados.

### 6.2 — Avaliação de uma solução
- **Entradas e parâmetros:** cromossomo `1100`; orçamento R$ 7.000.
- **Esperado:** projetos A e B; custo R$ 7.000; benefício 12; saldo R$ 0; viável; aptidão 12.
- **Obtido:** A e B; custo R$ 7.000,00; benefício 12; saldo R$ 0,00; nenhuma remoção; aptidão 12.
- **Conclusão:** passou.

### 6.2 — Tabela das soluções viáveis
- **Entradas e parâmetros:** as 16 combinações de 4 genes, orçamento R$ 7.000.
- **Esperado:** exatamente as 9 viáveis do enunciado, com os mesmos custos e benefícios; ótimo `1100` (12).
- **Obtido:** `0000` (R$ 0; 0), `1000` (R$ 4.000; 7), `0100` (R$ 3.000; 5), `0010` (R$ 2.000; 3), `0001` (R$ 5.000; 8), `1100` (R$ 7.000; 12), `1010` (R$ 6.000; 10), `0110` (R$ 5.000; 8), `0011` (R$ 7.000; 11). Ótimo `1100`, 12.
- **Conclusão:** passou.

### 6.3 — Reparação de uma solução inviável
- **Entradas e parâmetros:** `1111`; orçamento R$ 7.000.
- **Esperado:** `1111` (R$ 14.000; 23) → remove C → `1101` (R$ 12.000; 20) → remove D → `1100` (R$ 7.000; 12).
- **Obtido:** idêntico: remoções nos índices de C e D, nessa ordem, com os mesmos custos e benefícios intermediários; aptidão final 12.
- **Conclusão:** passou.

### 6.4 — Cruzamento e mutação com escolhas controladas
- **Entradas e parâmetros:** pai 1 `1100`, pai 2 `0011`, corte após o 2º gene; mutação forçada só no 1º gene do filho 1.
- **Esperado:** cruzamento `1111` e `0000`; mutação `0111` e `0000`; reparação `0111 → 0101 → 0100` (remove C, depois D) e `0000` sem mudança; filho 1 R$ 3.000 e aptidão 5, filho 2 R$ 0 e aptidão 0.
- **Obtido:** idêntico em todas as etapas, registradas separadamente.
- **Conclusão:** passou.

### 6.4 — Limites das taxas
- **Entradas e parâmetros:** mutação 0% e 100% (sementes 1 a 50, cromossomo `1010`); cruzamento 0% e 100% (sementes 1 a 50 e 1 a 200).
- **Esperado:** 0% não inverte nenhum gene; 100% inverte todos antes da reparação; cruzamento 0% copia os pais; cruzamento 100% sempre cruza, com corte entre o 1º e o penúltimo gene.
- **Obtido:** 0% → `1010` sem genes invertidos; 100% → `0101` com os 4 genes invertidos; cruzamento 0% → `1100` e `0011`; cruzamento 100% → sempre ocorreu, com cortes observados {1, 2, 3}.
- **Conclusão:** passou.

### 6.4 — Seleção por torneio
- **Entradas e parâmetros:** candidatos `1000` (7), `0011` (11), `1100` (12); empate com aptidões `[5, 12, 3, 12, 12]` e candidatos #5, #4, #2 (índices exibidos a partir de 1).
- **Esperado:** vence `1100`; no empate, o de menor índice.
- **Obtido:** vence `1100` (em qualquer ordem dos candidatos); no empate vence #2. Também verificado: candidatos sempre distintos e, com `k = N`, vence sempre o melhor.
- **Conclusão:** passou.

### 6.5 — Execução completa
- **Entradas e parâmetros:** dados da 6.1; população 20; 50 gerações; cruzamento 80%; mutação 5%; torneio 2; elite 1; semente 42.
- **Esperado:** 51 registros; melhor acumulado nunca diminui; com elite 1, a melhor aptidão da população também não; solução final válida (referência: `1100`, 12).
- **Obtido:** 51 registros (gerações 0 a 50); melhor `1100`, projetos A e B, custo R$ 7.000,00, benefício 12, saldo R$ 0,00. A solução já estava na geração 0 (indivíduo #7). A média da população subiu de 7,60 (geração 0) para 11,15 (geração 50). Nenhuma queda do melhor acumulado nem do melhor da geração. Custos e aptidões de todos os indivíduos batem com `avaliar`.
- **Conclusão:** passou. Também passaram: reprodutibilidade (duas execuções com semente 42 dão históricos idênticos por `JSON.stringify`), pausar após 17 gerações e retomar com o mesmo `rng` (mesmo histórico), elite 0 (melhor acumulado continua sem cair) e elite = população − 1 (o filho 2 é descartado e o tamanho fica constante).

### 6.5 — Mutação 1% × 20%
- **Entradas e parâmetros:** configuração da 6.5 com mutação 1% e 20%; sementes 1 a 5.
- **Esperado:** média do melhor benefício final e quantas execuções atingiram 12; nenhuma solução inválida.
- **Obtido:** ver tabela em *Análise dos resultados*.
- **Conclusão:** passou (todas as 10 execuções são válidas e cumprem as propriedades).

### 6.6 — Limites de orçamento
- **Entradas e parâmetros:** orçamento R$ 0 (semente 42); orçamento R$ 14.000 com `1111`.
- **Esperado:** com R$ 0, toda a população `0000` e aptidão 0; com R$ 14.000, `1111` viável, custo R$ 14.000, benefício 23, saldo R$ 0.
- **Obtido:** R$ 0: os 20 indivíduos são `0000` com aptidão 0 na geração 0 e na 50. R$ 14.000: `1111` sem nenhuma remoção, custo R$ 14.000,00, benefício 23, saldo R$ 0,00. A execução completa com semente 42 também achou `1111` (23) já na geração 0.
- **Conclusão:** passou.

### Validação de entradas (seção 3)
- **Entradas e parâmetros:** vazio, só espaços, `7000,50`, `abc`, `1e3`, `Infinity`, `10,123`, `-1`, `2,5` em campo inteiro; custo 0, benefício −1, nome vazio, torneio 21 e elite 20 com população 20; 3 projetos.
- **Esperado:** cada caso bloqueado com a mensagem certa; `7000,50` aceito.
- **Obtido:** mensagens "preencha este campo", "digite um número válido", "use no máximo 2 casas decimais", "o valor deve ser no mínimo 0", "use um número inteiro"; os cinco campos inválidos e a contagem de projetos foram apontados.
- **Conclusão:** passou.

### Testes manuais da interface
| Teste | Resultado observado |
| --- | --- |
| Abrir a página | Status "Pronto para executar — geração 0 de 50", com geração 0 calculada e sem erros no console |
| Executar com os valores iniciais | Concluído: 50 gerações; 51 linhas no histórico; melhor `1100`, 12 |
| Executar → Pausar → Avançar ×2 → Executar | Retomou da geração pausada e terminou com o mesmo histórico da execução direta (média final 11,15) |
| Digitar `abc` no orçamento | Borda vermelha, mensagem "Orçamento disponível (R$): digite um número válido.", "1 campo inválido", todos os botões bloqueados |
| Corrigir o campo depois de executar | "Configuração alterada — clique em Reiniciar"; só Reiniciar habilitado |
| Reiniciar | Volta à geração 0 com a semente configurada; histórico com 1 linha |
| Avançar uma geração | Exatamente uma geração nova, estado Pausado, animação do par 1 tocada |
| Remover projetos até 4 / adicionar até 15 | Botões × e Adicionar bloqueados nos limites |

## Análise dos resultados
Mutação 1% × 20%, sementes 1 a 5 (demais parâmetros da 6.5):

| Mutação | Semente | Melhor final | 1ª geração com 12 | Média da pop. na geração 50 | Média da pop. (gerações 0–50) |
| --- | --- | --- | --- | --- | --- |
| 1% | 1 | 12 (`1100`) | 0 | 12,00 | 11,71 |
| 1% | 2 | 12 (`1100`) | 0 | 11,75 | 11,56 |
| 1% | 3 | 12 (`1100`) | 2 | 12,00 | 11,27 |
| 1% | 4 | 12 (`1100`) | 0 | 12,00 | 11,67 |
| 1% | 5 | 12 (`1100`) | 0 | 12,00 | 11,76 |
| 20% | 1 | 12 (`1100`) | 0 | 10,50 | 9,50 |
| 20% | 2 | 12 (`1100`) | 0 | 9,55 | 9,30 |
| 20% | 3 | 12 (`1100`) | 1 | 9,40 | 9,22 |
| 20% | 4 | 12 (`1100`) | 0 | 8,35 | 9,53 |
| 20% | 5 | 12 (`1100`) | 0 | 9,60 | 9,44 |

| Mutação | Média do melhor final | Atingiram 12 | Média da pop. na geração 50 | Média da pop. (gerações 0–50) |
| --- | --- | --- | --- | --- |
| 1% | 12,00 | 5 de 5 | 11,95 | 11,59 |
| 20% | 12,00 | 5 de 5 | 9,48 | 9,40 |

**Interpretação.** As duas taxas chegaram ao ótimo nas 10 execuções. Isso era esperado: a instância só tem 16 combinações, e a reparação leva qualquer cromossomo para uma das 9 viáveis. Com 20 indivíduos sorteados ao acaso, o `1100` já apareceu na geração 0 em 8 das 10 execuções, e nas outras duas surgiu nas gerações 1 e 2. Por isso, o melhor final não distingue as taxas nesta instância.

A diferença aparece na população. Com 1%, os descendentes quase sempre repetem os pais, a população converge para o ótimo (média 11,95 na geração 50, quatro execuções com a população inteira em 12) e perde diversidade. Com 20%, cerca de 0,8 gene por filho é invertido a cada geração. Muitos filhos de `1100` viram outra combinação, que a reparação reduz a uma solução pior, e a média fica perto de 9,4. Esse ruído não prejudica o melhor acumulado, que o elitismo protege. Numa instância maior, com o ótimo longe da população inicial, a mutação alta poderia ajudar a explorar regiões novas, ou atrapalhar ao destruir bons blocos de genes. Nenhuma taxa é superior em geral; o resultado depende da instância.

## Limitações
- Limites superiores que não estão no enunciado: população ≤ 1000, gerações ≤ 10000, valores ≤ R$ 1 trilhão e semente de 0 a 4294967295. Servem para manter os centavos como inteiros exatos e o navegador responsivo.
- Os valores em reais são digitados sem separador de milhar (`7000,00`); `7.000,00` é rejeitado com mensagem, nunca corrigido em silêncio.
- A animação mostra um par por vez, escolhido pelo usuário (o par 1 toca sozinho ao avançar uma geração). Durante **Executar** contínuo, ela não toca, para não atrasar a execução.
- Os índices de indivíduos aparecem a partir de #1 na tela e no log; no código, começam em 0.
- A mesma semente reproduz a execução só nesta implementação (gerador e ordem dos sorteios definidos acima).
