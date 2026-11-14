// js/nucleo.js — algoritmo genético (funções puras, sem DOM, sem Math.random)
// Custos e orçamento em CENTAVOS inteiros. Cromossomo = array de 0/1 na ordem dos projetos.
// Ordem dos sorteios e regras de desempate: ver "Padrão dos Trabalhos Práticos de IA", seção do AG.
import { inteiroEntre, sortearDistintos } from './prng.js';

// ---------- Funções determinísticas (usadas direto pelos testes controlados) ----------

/** Enunciado 2: custo e benefício totais do cromossomo. → { custo, beneficio } */
export function avaliar(cromossomo, projetos) {
  // TODO
}

/** Enunciado 2: enquanto custo > orçamento, remove o selecionado de menor razão
 *  benefício/custo (empate → menor índice). → { cromossomo, remocoes } */
export function reparar(cromossomo, projetos, orcamento) {
  // TODO
}

/** Corte após o gene `corte` (1..n-1). → [filho1, filho2] */
export function cruzarEmPonto(pai1, pai2, corte) {
  // TODO
}

/** Inverte apenas os genes cujos índices estão em `indices`. → novo cromossomo */
export function inverterGenes(cromossomo, indices) {
  // TODO
}

/** Maior aptidão entre os candidatos (índices na população); empate → menor índice. */
export function vencedorTorneio(candidatos, aptidoes) {
  // TODO
}

// ---------- Funções sorteadoras (recebem o rng) ----------

/** Geração 0: genes sorteados com rng() < 0.5, reparados e avaliados.
 *  → { geracao: 0, populacao, melhor, historico: [registro da geração 0] } */
export function inicializar(parametros, rng) {
  // TODO
}

/** Produz exatamente uma nova geração. → { estado, eventos } */
export function passo(estado, parametros, rng) {
  // TODO
}
