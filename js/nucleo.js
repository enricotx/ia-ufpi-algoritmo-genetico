// js/nucleo.js — algoritmo genético para seleção de projetos (mochila 0/1).
// Funções puras: sem document, sem window e sem o gerador aleatório nativo.
// Toda aleatoriedade chega por parâmetro (rng). Custos e orçamento em centavos inteiros.

import { inteiroEntre, sortearDistintos } from './prng.js';

/** Dados da seção 6.1 do enunciado (custos em centavos). */
export const PROJETOS_EXEMPLO = Object.freeze([
  { nome: 'Melhoria da iluminação', custo: 400000, beneficio: 7 },
  { nome: 'Instalação de bicicletários', custo: 300000, beneficio: 5 },
  { nome: 'Aquisição de bancos', custo: 200000, beneficio: 3 },
  { nome: 'Reforma de espaço de convivência', custo: 500000, beneficio: 8 }
]);

/** Configuração do teste 6.5 (valores iniciais da tela). Taxas como fração. */
export const PARAMETROS_EXEMPLO = Object.freeze({
  projetos: PROJETOS_EXEMPLO,
  orcamento: 700000,
  tamanhoPopulacao: 20,
  numeroGeracoes: 50,
  taxaCruzamento: 0.8,
  taxaMutacao: 0.05,
  tamanhoTorneio: 2,
  elite: 1
});

/** Letra do gene na posição i (A, B, C, ...). */
export function letraGene(i) {
  return String.fromCharCode(65 + i);
}

/** Cromossomo (array de 0/1) → texto '1010'. */
export function paraTexto(cromossomo) {
  return cromossomo.join('');
}

/** Texto '1010' → cromossomo (array de 0/1). */
export function deTexto(texto) {
  return Array.from(texto, (b) => (b === '1' ? 1 : 0));
}

// ---------------------------------------------------------------------------
// Funções determinísticas (os testes controlados chamam estas direto)
// ---------------------------------------------------------------------------

/**
 * Enunciado 2: custo total e benefício total dos projetos com gene 1.
 * @returns {{ custo: number, beneficio: number }}
 */
export function avaliar(cromossomo, projetos) {
  let custo = 0;
  let beneficio = 0;
  for (let i = 0; i < cromossomo.length; i++) {
    if (cromossomo[i]) {
      custo += projetos[i].custo;
      beneficio += projetos[i].beneficio;
    }
  }
  return { custo, beneficio };
}

/**
 * Enunciado 2: enquanto o custo ultrapassar o orçamento, remove o selecionado de
 * menor razão benefício/custo; empate → menor índice.
 * Compara b_i * c_j < b_j * c_i em vez de dividir, para evitar erro de arredondamento.
 * @returns {{ cromossomo: number[], remocoes: { indice: number, cromossomo: string, custo: number, beneficio: number }[] }}
 */
export function reparar(cromossomo, projetos, orcamento) {
  const c = cromossomo.slice();
  const remocoes = [];
  let { custo, beneficio } = avaliar(c, projetos);
  while (custo > orcamento) {
    let pior = -1;
    for (let i = 0; i < c.length; i++) {
      if (!c[i]) continue;
      if (pior === -1) { pior = i; continue; }
      const a = projetos[i];
      const b = projetos[pior];
      if (a.beneficio * b.custo < b.beneficio * a.custo) pior = i; // estritamente menor: mantém o menor índice
    }
    c[pior] = 0;
    custo -= projetos[pior].custo;
    beneficio -= projetos[pior].beneficio;
    remocoes.push({ indice: pior, cromossomo: paraTexto(c), custo, beneficio });
  }
  return { cromossomo: c, remocoes };
}

/**
 * Enunciado 2: cruzamento de um ponto. Corte após o gene `corte` (1..n-1).
 * Filho 1 = início de p1 + fim de p2; filho 2 = início de p2 + fim de p1.
 * @returns {[number[], number[]]}
 */
export function cruzarEmPonto(p1, p2, corte) {
  return [
    p1.slice(0, corte).concat(p2.slice(corte)),
    p2.slice(0, corte).concat(p1.slice(corte))
  ];
}

/** Enunciado 2: mutação por inversão — inverte só os genes listados (índices 0-based). */
export function inverterGenes(cromossomo, indices) {
  const c = cromossomo.slice();
  for (const i of indices) c[i] = c[i] ? 0 : 1;
  return c;
}

/**
 * Enunciado 2 e 3: vencedor do torneio = maior aptidão; empate → menor índice na população.
 * candidatos = índices na população; aptidoes = aptidão por índice.
 */
export function vencedorTorneio(candidatos, aptidoes) {
  let v = candidatos[0];
  for (const i of candidatos) {
    if (aptidoes[i] > aptidoes[v] || (aptidoes[i] === aptidoes[v] && i < v)) v = i;
  }
  return v;
}

/** Índices da população em ordem de aptidão decrescente; empate → menor índice. */
export function ordenarPorAptidao(aptidoes) {
  return aptidoes
    .map((_, i) => i)
    .sort((i, j) => (aptidoes[j] - aptidoes[i]) || (i - j));
}

/**
 * Enunciado 2: repara antes de avaliar. A aptidão é o benefício da solução reparada.
 * @returns indivíduo { cromossomo (reparado), original, remocoes, custo, aptidao }
 */
export function criarIndividuo(cromossomo, projetos, orcamento) {
  const { cromossomo: reparado, remocoes } = reparar(cromossomo, projetos, orcamento);
  const { custo, beneficio } = avaliar(reparado, projetos);
  return { cromossomo: reparado, original: paraTexto(cromossomo), remocoes, custo, aptidao: beneficio };
}

/** Resumo de uma população: melhor da geração (índice e aptidão) e média. */
export function resumirPopulacao(populacao) {
  const aptidoes = populacao.map((ind) => ind.aptidao);
  const indiceMelhor = ordenarPorAptidao(aptidoes)[0];
  const media = aptidoes.reduce((a, b) => a + b, 0) / aptidoes.length;
  return { indiceMelhor, melhor: aptidoes[indiceMelhor], media };
}

// ---------------------------------------------------------------------------
// Funções sorteadoras (sorteiam a decisão com o rng e chamam a determinística)
// ---------------------------------------------------------------------------

/** Enunciado 3: torneio com k candidatos distintos, sorteados na população anterior. */
export function selecionarPorTorneio(rng, aptidoes, k) {
  const candidatos = sortearDistintos(rng, aptidoes.length, k);
  return { candidatos, vencedor: vencedorTorneio(candidatos, aptidoes) };
}

/** Enunciado 2: cruzamento aplicado por par. Ocorre se rng() < taxa; corte em [1, n-1]. */
export function cruzar(rng, p1, p2, taxaCruzamento) {
  if (rng() < taxaCruzamento) {
    const corte = inteiroEntre(rng, 1, p1.length - 1);
    return { ocorreu: true, corte, filhos: cruzarEmPonto(p1, p2, corte) };
  }
  return { ocorreu: false, corte: null, filhos: [p1.slice(), p2.slice()] };
}

/** Enunciado 2: mutação aplicada por gene. Um rng() por gene; inverte se rng() < taxa. */
export function mutar(rng, cromossomo, taxaMutacao) {
  const indices = [];
  for (let i = 0; i < cromossomo.length; i++) {
    if (rng() < taxaMutacao) indices.push(i);
  }
  return { indices, cromossomo: inverterGenes(cromossomo, indices) };
}

// ---------------------------------------------------------------------------
// Execução: inicializar e passo
// ---------------------------------------------------------------------------

function registroHistorico(geracao, populacao, melhor) {
  const r = resumirPopulacao(populacao);
  return {
    geracao,
    melhorGeracao: r.melhor,
    media: r.media,
    melhorAcumulado: melhor.aptidao,
    cromossomoMelhor: paraTexto(melhor.cromossomo)
  };
}

function copiarMelhor(ind, geracao, indice) {
  return { cromossomo: ind.cromossomo.slice(), custo: ind.custo, aptidao: ind.aptidao, geracao, indice };
}

/**
 * Enunciado 2: geração 0. Para cada indivíduo e, dentro dele, para cada gene,
 * rng() < 0.5 ? 1 : 0. Repara e avalia cada um. Histórico com 1 registro.
 * @returns {{ estado, eventos }}
 */
export function inicializar(parametros, rng) {
  const { projetos, orcamento, tamanhoPopulacao } = parametros;
  const n = projetos.length;
  const populacao = [];
  const eventos = [];
  for (let p = 0; p < tamanhoPopulacao; p++) {
    const genes = [];
    for (let g = 0; g < n; g++) genes.push(rng() < 0.5 ? 1 : 0);
    const ind = criarIndividuo(genes, projetos, orcamento);
    populacao.push(ind);
    eventos.push({
      tipo: 'inicial', indice: p, sorteado: ind.original,
      remocoes: ind.remocoes, cromossomo: paraTexto(ind.cromossomo), custo: ind.custo, aptidao: ind.aptidao
    });
  }
  const r = resumirPopulacao(populacao);
  const melhor = copiarMelhor(populacao[r.indiceMelhor], 0, r.indiceMelhor);
  const historico = [registroHistorico(0, populacao, melhor)];
  eventos.push({ tipo: 'resumo', geracao: 0, ...historico[0], novoMelhor: true });
  return { estado: { geracao: 0, populacao, historico, melhor }, eventos };
}

/**
 * Enunciado 2: produz exatamente uma geração nova e os eventos dela, na ordem padrão:
 * elitismo → para cada par: torneio 1, torneio 2, cruzamento, mutação filho 1,
 * mutação filho 2, reparação e avaliação. Não altera o estado recebido.
 * @returns {{ estado, eventos }}
 */
export function passo(estado, parametros, rng) {
  const { projetos, orcamento, tamanhoPopulacao, taxaCruzamento, taxaMutacao, tamanhoTorneio, elite } = parametros;
  const anterior = estado.populacao;
  const aptidoes = anterior.map((ind) => ind.aptidao);
  const geracao = estado.geracao + 1;
  const nova = [];
  const eventos = [];

  // Elitismo: copia os `elite` melhores sem mutação e sem nova avaliação.
  const ordem = ordenarPorAptidao(aptidoes);
  for (let e = 0; e < elite; e++) {
    const i = ordem[e];
    const ind = anterior[i];
    nova.push({ cromossomo: ind.cromossomo.slice(), original: paraTexto(ind.cromossomo), remocoes: [], custo: ind.custo, aptidao: ind.aptidao, elite: true });
    eventos.push({ tipo: 'elite', origem: i, destino: nova.length - 1, cromossomo: paraTexto(ind.cromossomo), aptidao: ind.aptidao });
  }

  // Descendentes: pais sempre da população anterior.
  let par = 0;
  while (nova.length < tamanhoPopulacao) {
    par++;
    const t1 = selecionarPorTorneio(rng, aptidoes, tamanhoTorneio);
    const t2 = selecionarPorTorneio(rng, aptidoes, tamanhoTorneio);
    const p1 = anterior[t1.vencedor].cromossomo;
    const p2 = anterior[t2.vencedor].cromossomo;
    eventos.push({
      tipo: 'selecao', par,
      torneios: [t1, t2].map((t) => ({
        candidatos: t.candidatos.map((i) => ({ indice: i, cromossomo: paraTexto(anterior[i].cromossomo), aptidao: aptidoes[i] })),
        vencedor: t.vencedor
      })),
      pais: [t1.vencedor, t2.vencedor],
      cromossomos: [paraTexto(p1), paraTexto(p2)]
    });

    const cz = cruzar(rng, p1, p2, taxaCruzamento);
    eventos.push({
      tipo: 'cruzamento', par, ocorreu: cz.ocorreu, corte: cz.corte,
      pais: [t1.vencedor, t2.vencedor], cromossomosPais: [paraTexto(p1), paraTexto(p2)],
      filhos: cz.filhos.map(paraTexto)
    });

    const m1 = mutar(rng, cz.filhos[0], taxaMutacao);
    const m2 = mutar(rng, cz.filhos[1], taxaMutacao);
    eventos.push({
      tipo: 'mutacao', par,
      filhos: [m1, m2].map((m, f) => ({ antes: paraTexto(cz.filhos[f]), genes: m.indices, depois: paraTexto(m.cromossomo) }))
    });

    const f1 = criarIndividuo(m1.cromossomo, projetos, orcamento);
    const f2 = criarIndividuo(m2.cromossomo, projetos, orcamento);
    eventos.push({
      tipo: 'reparacao', par,
      filhos: [f1, f2].map((f) => ({ antes: f.original, remocoes: f.remocoes, depois: paraTexto(f.cromossomo) }))
    });

    const destinos = [];
    for (const f of [f1, f2]) {
      if (nova.length < tamanhoPopulacao) {
        nova.push({ ...f, elite: false });
        destinos.push(nova.length - 1);
      } else {
        destinos.push(null); // descartado: só restava uma vaga
      }
    }
    eventos.push({
      tipo: 'insercao', par,
      filhos: [f1, f2].map((f, k) => ({ cromossomo: paraTexto(f.cromossomo), custo: f.custo, aptidao: f.aptidao, destino: destinos[k] }))
    });
  }

  // Melhor acumulado: troca só com aptidão estritamente maior.
  const r = resumirPopulacao(nova);
  let melhor = estado.melhor;
  let novoMelhor = false;
  if (nova[r.indiceMelhor].aptidao > melhor.aptidao) {
    melhor = copiarMelhor(nova[r.indiceMelhor], geracao, r.indiceMelhor);
    novoMelhor = true;
  }
  const registro = registroHistorico(geracao, nova, melhor);
  eventos.push({ tipo: 'resumo', ...registro, novoMelhor });

  return {
    estado: { geracao, populacao: nova, historico: estado.historico.concat([registro]), melhor },
    eventos
  };
}

/** Executa da geração 0 até numeroGeracoes (usado nos testes e na análise). */
export function executar(parametros, rng) {
  let { estado } = inicializar(parametros, rng);
  while (estado.geracao < parametros.numeroGeracoes) {
    estado = passo(estado, parametros, rng).estado;
  }
  return estado;
}
