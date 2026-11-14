// js/testes.js — casos de teste da seção 6 do enunciado (importa nucleo.js).
// Roda no navegador (testes.html); também pode ser importado no Node.

import { criarRng } from './prng.js';
import {
  PROJETOS_EXEMPLO, PARAMETROS_EXEMPLO, avaliar, reparar, cruzarEmPonto, inverterGenes,
  vencedorTorneio, selecionarPorTorneio, cruzar, mutar, criarIndividuo, inicializar, passo,
  executar, deTexto, paraTexto, letraGene
} from './nucleo.js';
import { lerNumero, validarConfiguracao } from './validacao.js';

export const resultados = [];

export function caso(nome, fn) {
  try { fn(); resultados.push({ nome, ok: true }); }
  catch (e) { resultados.push({ nome, ok: false, msg: e.message }); }
}

export function igual(obtido, esperado, rotulo = '') {
  const a = JSON.stringify(obtido), b = JSON.stringify(esperado);
  if (a !== b) throw new Error(`${rotulo} esperado ${b}, obtido ${a}`);
}

export function perto(obtido, esperado, tol = 1e-6, rotulo = '') {
  if (!(Math.abs(obtido - esperado) <= tol)) throw new Error(`${rotulo} esperado ${esperado} ± ${tol}, obtido ${obtido}`);
}

function verdade(condicao, rotulo) {
  if (!condicao) throw new Error(rotulo);
}

export function mostrar(tabela) { // tabela = <tbody> da testes.html
  tabela.innerHTML = resultados.map((r) =>
    `<tr class="${r.ok ? 'ok' : 'falha'}"><td>${r.nome}</td><td>${r.ok ? 'PASSOU' : 'FALHOU'}</td><td>${r.msg ?? ''}</td></tr>`).join('');
}

const P = PROJETOS_EXEMPLO;
const ORC = 700000;

/** Verifica as propriedades de uma execução completa. */
function verificarExecucao(estado, parametros, { eliteNaoCai = parametros.elite >= 1 } = {}) {
  igual(estado.historico.length, parametros.numeroGeracoes + 1, 'registros no histórico:');
  igual(estado.historico.map((h) => h.geracao), Array.from({ length: parametros.numeroGeracoes + 1 }, (_, i) => i), 'gerações:');
  for (let g = 1; g < estado.historico.length; g++) {
    verdade(estado.historico[g].melhorAcumulado >= estado.historico[g - 1].melhorAcumulado,
      `melhor acumulado caiu na geração ${g}`);
    if (eliteNaoCai)
      verdade(estado.historico[g].melhorGeracao >= estado.historico[g - 1].melhorGeracao,
        `melhor da geração caiu na geração ${g} com elite ≥ 1`);
  }
  igual(estado.populacao.length, parametros.tamanhoPopulacao, 'tamanho da população:');
  for (const ind of estado.populacao) {
    const a = avaliar(ind.cromossomo, parametros.projetos);
    verdade(a.custo <= parametros.orcamento, `indivíduo ${paraTexto(ind.cromossomo)} acima do orçamento`);
    igual([ind.custo, ind.aptidao], [a.custo, a.beneficio], 'totais do indivíduo:');
  }
  const m = estado.melhor;
  const a = avaliar(m.cromossomo, parametros.projetos);
  verdade(a.custo <= parametros.orcamento, 'melhor solução acima do orçamento');
  igual([m.custo, m.aptidao], [a.custo, a.beneficio], 'totais do melhor:');
  igual(estado.historico.at(-1).melhorAcumulado, m.aptidao, 'último registro × melhor:');
}

/** Primeira geração em que o melhor acumulado atingiu `alvo` (ou null). */
function primeiraGeracaoCom(historico, alvo) {
  const r = historico.find((h) => h.melhorAcumulado >= alvo);
  return r ? r.geracao : null;
}

/** Enunciado 6.5: mutação 1% × 20%, sementes 1 a 5, demais parâmetros do 6.5. */
export function compararMutacao() {
  const linhas = [];
  for (const taxa of [0.01, 0.2]) {
    for (const semente of [1, 2, 3, 4, 5]) {
      const parametros = { ...PARAMETROS_EXEMPLO, taxaMutacao: taxa };
      const estado = executar(parametros, criarRng(semente));
      const mediaFinal = estado.historico.at(-1).media;
      const mediaDasMedias = estado.historico.reduce((s, h) => s + h.media, 0) / estado.historico.length;
      linhas.push({
        taxa, semente,
        melhorFinal: estado.melhor.aptidao,
        cromossomo: paraTexto(estado.melhor.cromossomo),
        custo: estado.melhor.custo,
        primeiraGeracao12: primeiraGeracaoCom(estado.historico, 12),
        mediaFinal, mediaDasMedias
      });
    }
  }
  const resumo = [0.01, 0.2].map((taxa) => {
    const l = linhas.filter((x) => x.taxa === taxa);
    const media = (f) => l.reduce((s, x) => s + f(x), 0) / l.length;
    return {
      taxa,
      mediaMelhorFinal: media((x) => x.melhorFinal),
      atingiram12: l.filter((x) => x.melhorFinal === 12).length,
      mediaPrimeiraGeracao12: media((x) => x.primeiraGeracao12 ?? NaN),
      mediaPopulacaoFinal: media((x) => x.mediaFinal),
      mediaPopulacaoGeral: media((x) => x.mediaDasMedias)
    };
  });
  return { linhas, resumo };
}

export function rodarTodos() {
  resultados.length = 0;

  // ---------- 6.1 ----------
  caso('6.1 — Dados de entrada: 4 projetos na ordem A, B, C, D e orçamento R$ 7.000', () => {
    igual(P.map((p) => [p.custo, p.beneficio]), [[400000, 7], [300000, 5], [200000, 3], [500000, 8]]);
    igual(P.map((_, i) => letraGene(i)).join(''), 'ABCD');
    igual(PARAMETROS_EXEMPLO.orcamento, ORC);
  });

  // ---------- 6.2 ----------
  caso('6.2 — Avaliação de 1100: A e B, custo R$ 7.000, benefício 12, saldo R$ 0, aptidão 12', () => {
    const c = deTexto('1100');
    const a = avaliar(c, P);
    igual(a, { custo: 700000, beneficio: 12 });
    igual(c.map((g, i) => (g ? letraGene(i) : '')).join(''), 'AB', 'projetos:');
    igual(ORC - a.custo, 0, 'saldo:');
    const ind = criarIndividuo(c, P, ORC);
    igual(ind.remocoes.length, 0, 'remoções (viável):');
    igual(ind.aptidao, 12, 'aptidão:');
  });

  caso('6.2 — Tabela das soluções viáveis: exatamente as 9 do enunciado, com custos e benefícios', () => {
    const esperado = {
      '0000': [0, 0], '1000': [400000, 7], '0100': [300000, 5], '0010': [200000, 3], '0001': [500000, 8],
      '1100': [700000, 12], '1010': [600000, 10], '0110': [500000, 8], '0011': [700000, 11]
    };
    const viaveis = {};
    for (let m = 0; m < 16; m++) {
      const t = m.toString(2).padStart(4, '0');
      const a = avaliar(deTexto(t), P);
      if (a.custo <= ORC) viaveis[t] = [a.custo, a.beneficio];
    }
    igual(Object.keys(viaveis).sort(), Object.keys(esperado).sort(), 'viáveis:');
    for (const t of Object.keys(esperado)) igual(viaveis[t], esperado[t], `${t}:`);
    const otimo = Object.entries(viaveis).sort((x, y) => y[1][1] - x[1][1])[0];
    igual(otimo, ['1100', [700000, 12]], 'ótimo global:');
  });

  // ---------- 6.3 ----------
  caso('6.3 — Reparação de 1111: → 1101 (remove C) → 1100 (remove D); custo R$ 7.000; aptidão 12', () => {
    igual(avaliar(deTexto('1111'), P), { custo: 1400000, beneficio: 23 }, '1111:');
    const r = reparar(deTexto('1111'), P, ORC);
    igual(r.remocoes, [
      { indice: 2, cromossomo: '1101', custo: 1200000, beneficio: 20 },
      { indice: 3, cromossomo: '1100', custo: 700000, beneficio: 12 }
    ]);
    igual(paraTexto(r.cromossomo), '1100');
    const ind = criarIndividuo(deTexto('1111'), P, ORC);
    igual([ind.custo, ind.aptidao], [700000, 12]);
  });

  // ---------- 6.4 ----------
  const [f1, f2] = cruzarEmPonto(deTexto('1100'), deTexto('0011'), 2);
  caso('6.4 — Cruzamento 1100 × 0011, corte após o 2º gene → 1111 e 0000', () => {
    igual([paraTexto(f1), paraTexto(f2)], ['1111', '0000']);
  });

  const m1 = inverterGenes(f1, [0]);
  const m2 = inverterGenes(f2, []);
  caso('6.4 — Mutação só no 1º gene do filho 1 → 0111 e 0000', () => {
    igual([paraTexto(m1), paraTexto(m2)], ['0111', '0000']);
  });

  caso('6.4 — Reparação dos filhos: 0111 → 0101 → 0100 (remove C, depois D); 0000 permanece', () => {
    const r1 = reparar(m1, P, ORC);
    igual(r1.remocoes.map((x) => [letraGene(x.indice), x.cromossomo]), [['C', '0101'], ['D', '0100']]);
    const r2 = reparar(m2, P, ORC);
    igual([paraTexto(r2.cromossomo), r2.remocoes.length], ['0000', 0]);
  });

  caso('6.4 — Avaliação final: filho 1 = 0100, R$ 3.000, aptidão 5; filho 2 = 0000, R$ 0, aptidão 0', () => {
    const a = criarIndividuo(m1, P, ORC);
    const b = criarIndividuo(m2, P, ORC);
    igual([paraTexto(a.cromossomo), a.custo, a.aptidao], ['0100', 300000, 5]);
    igual([paraTexto(b.cromossomo), b.custo, b.aptidao], ['0000', 0, 0]);
  });

  caso('6.4 — Limite: mutação 0% não inverte nenhum gene (sementes 1 a 50)', () => {
    for (let s = 1; s <= 50; s++) {
      const r = mutar(criarRng(s), deTexto('1010'), 0);
      igual([r.indices, paraTexto(r.cromossomo)], [[], '1010'], `semente ${s}:`);
    }
  });

  caso('6.4 — Limite: mutação 100% inverte todos os genes antes da reparação', () => {
    for (let s = 1; s <= 50; s++) {
      const r = mutar(criarRng(s), deTexto('1010'), 1);
      igual([r.indices, paraTexto(r.cromossomo)], [[0, 1, 2, 3], '0101'], `semente ${s}:`);
    }
  });

  caso('6.4 — Limite: cruzamento 0% → filhos são cópias dos pais', () => {
    for (let s = 1; s <= 50; s++) {
      const r = cruzar(criarRng(s), deTexto('1100'), deTexto('0011'), 0);
      igual([r.ocorreu, r.filhos.map(paraTexto)], [false, ['1100', '0011']], `semente ${s}:`);
    }
  });

  caso('6.4 — Limite: cruzamento 100% sempre ocorre, com corte entre o 1º e o penúltimo gene', () => {
    const cortes = new Set();
    for (let s = 1; s <= 200; s++) {
      const r = cruzar(criarRng(s), deTexto('1100'), deTexto('0011'), 1);
      verdade(r.ocorreu, `semente ${s}: não cruzou`);
      verdade(r.corte >= 1 && r.corte <= 3, `semente ${s}: corte ${r.corte}`);
      cortes.add(r.corte);
    }
    igual([...cortes].sort(), [1, 2, 3], 'cortes observados:');
  });

  caso('6.4 — Torneio 1000 (7), 0011 (11), 1100 (12) → vence 1100', () => {
    const aptidoes = [7, 11, 12];
    igual(vencedorTorneio([0, 1, 2], aptidoes), 2);
    igual(vencedorTorneio([2, 0, 1], aptidoes), 2, 'outra ordem:');
  });

  caso('6.4 — Torneio com empate → menor índice na população', () => {
    const aptidoes = [5, 12, 3, 12, 12];
    igual(vencedorTorneio([4, 3, 1], aptidoes), 1);
    igual(vencedorTorneio([3, 4], aptidoes), 3);
  });

  caso('6.4 — Torneio sorteia candidatos distintos; com k = N vence sempre o melhor', () => {
    const aptidoes = [3, 8, 8, 1, 5];
    for (let s = 1; s <= 50; s++) {
      const rng = criarRng(s);
      const t = selecionarPorTorneio(rng, aptidoes, 3);
      igual(new Set(t.candidatos).size, 3, `semente ${s}, distintos:`);
      igual(selecionarPorTorneio(rng, aptidoes, 5).vencedor, 1, `semente ${s}, k = N:`);
    }
  });

  // ---------- 6.5 ----------
  const est42 = executar(PARAMETROS_EXEMPLO, criarRng(42));
  caso(`6.5 — Execução completa, semente 42: 51 registros, melhor acumulado nunca cai, solução válida (obtido ${paraTexto(est42.melhor.cromossomo)}, aptidão ${est42.melhor.aptidao})`, () => {
    verificarExecucao(est42, PARAMETROS_EXEMPLO);
    igual(est42.historico.length, 51);
  });

  caso('6.5 — Reprodutibilidade: mesma configuração e semente → históricos idênticos', () => {
    const outra = executar(PARAMETROS_EXEMPLO, criarRng(42));
    igual(JSON.stringify(outra.historico) === JSON.stringify(est42.historico), true);
    igual(JSON.stringify(outra.populacao) === JSON.stringify(est42.populacao), true, 'população final:');
  });

  caso('6.5 — Pausar e retomar (mesmo rng, sem recriar) dá o mesmo histórico', () => {
    const rng = criarRng(42);
    let { estado } = inicializar(PARAMETROS_EXEMPLO, rng);
    for (let g = 0; g < 17; g++) estado = passo(estado, PARAMETROS_EXEMPLO, rng).estado;
    const pausado = JSON.parse(JSON.stringify(estado)); // "pausa": só paramos de chamar passo
    for (let g = 17; g < 50; g++) estado = passo(estado, PARAMETROS_EXEMPLO, rng).estado;
    igual(JSON.stringify(estado.historico) === JSON.stringify(est42.historico), true);
    igual(pausado.historico.length, 18, 'histórico ao pausar:');
  });

  caso('6.5 — Sem elitismo (elite 0): melhor acumulado continua sem cair', () => {
    for (let s = 1; s <= 5; s++) {
      const parametros = { ...PARAMETROS_EXEMPLO, elite: 0 };
      verificarExecucao(executar(parametros, criarRng(s)), parametros, { eliteNaoCai: false });
    }
  });

  caso('6.5 — Elite = população − 1 e população ímpar: tamanho constante, filho 2 descartado', () => {
    const parametros = { ...PARAMETROS_EXEMPLO, tamanhoPopulacao: 5, elite: 4, numeroGeracoes: 10 };
    const rng = criarRng(7);
    let { estado } = inicializar(parametros, rng);
    const r = passo(estado, parametros, rng);
    const ins = r.eventos.filter((e) => e.tipo === 'insercao');
    igual(ins.length, 1, 'pares:');
    igual(ins[0].filhos.map((f) => f.destino), [4, null], 'destinos:');
    estado = r.estado;
    igual(estado.populacao.length, 5);
    verificarExecucao(executar({ ...PARAMETROS_EXEMPLO, tamanhoPopulacao: 7, elite: 2 }, criarRng(3)),
      { ...PARAMETROS_EXEMPLO, tamanhoPopulacao: 7, elite: 2 });
  });

  const comp = compararMutacao();
  for (const r of comp.resumo) {
    caso(`6.5 — Mutação ${r.taxa * 100}%, sementes 1 a 5: média do melhor final ${r.mediaMelhorFinal.toLocaleString('pt-BR')}; ${r.atingiram12} de 5 atingiram 12`, () => {
      for (const l of comp.linhas.filter((x) => x.taxa === r.taxa)) {
        const parametros = { ...PARAMETROS_EXEMPLO, taxaMutacao: r.taxa };
        verificarExecucao(executar(parametros, criarRng(l.semente)), parametros);
        verdade(l.melhorFinal <= 12 && l.custo <= ORC, `semente ${l.semente}: solução inválida`);
      }
    });
  }

  // ---------- 6.6 ----------
  caso('6.6 — Orçamento R$ 0: toda a população vira 0000, aptidão 0 (geração 0 e após 50 gerações)', () => {
    const parametros = { ...PARAMETROS_EXEMPLO, orcamento: 0 };
    const rng = criarRng(42);
    const { estado: inicial } = inicializar(parametros, rng);
    for (const ind of inicial.populacao) igual([paraTexto(ind.cromossomo), ind.custo, ind.aptidao], ['0000', 0, 0]);
    const final = executar(parametros, criarRng(42));
    for (const ind of final.populacao) igual([paraTexto(ind.cromossomo), ind.aptidao], ['0000', 0]);
    igual([paraTexto(final.melhor.cromossomo), final.melhor.aptidao], ['0000', 0], 'melhor:');
    verificarExecucao(final, parametros);
  });

  caso('6.6 — Orçamento R$ 14.000: 1111 é viável, custo R$ 14.000, benefício 23, saldo R$ 0', () => {
    const ind = criarIndividuo(deTexto('1111'), P, 1400000);
    igual([paraTexto(ind.cromossomo), ind.remocoes.length, ind.custo, ind.aptidao, 1400000 - ind.custo],
      ['1111', 0, 1400000, 23, 0]);
    const parametros = { ...PARAMETROS_EXEMPLO, orcamento: 1400000 };
    verificarExecucao(executar(parametros, criarRng(42)), parametros);
  });

  // ---------- Validação de entradas (seção 3) ----------
  caso('3 — Leitura de números: vazio, espaços, vírgula, texto, 1e3, Infinity, casas a mais', () => {
    const r = { nome: 'Orçamento disponível (R$)', min: 0, casas: 2 };
    igual(lerNumero('', r).erro, 'Orçamento disponível (R$): preencha este campo.');
    igual(lerNumero('   ', r).erro, 'Orçamento disponível (R$): preencha este campo.');
    igual(lerNumero(' 7000,50 ', r).valor, 7000.5);
    igual(lerNumero('abc', r).erro, 'Orçamento disponível (R$): digite um número válido.');
    igual(lerNumero('1e3', r).erro, 'Orçamento disponível (R$): digite um número válido.');
    igual(lerNumero('Infinity', r).erro, 'Orçamento disponível (R$): digite um número válido.');
    igual(lerNumero('10,123', r).erro, 'Orçamento disponível (R$): use no máximo 2 casas decimais.');
    igual(lerNumero('-1', r).erro, 'Orçamento disponível (R$): o valor deve ser no mínimo 0.');
    igual(lerNumero('2,5', { nome: 'Tamanho da população', inteiro: true }).erro, 'Tamanho da população: use um número inteiro.');
  });

  const textosPadrao = () => ({
    projetos: [['A', '4000', '7'], ['B', '3000', '5'], ['C', '2000', '3'], ['D', '5000', '8']]
      .map(([nome, custo, beneficio]) => ({ nome, custo, beneficio })),
    orcamento: '7000,00', tamanhoPopulacao: '20', numeroGeracoes: '50', taxaCruzamento: '80',
    taxaMutacao: '5', tamanhoTorneio: '2', elite: '1', semente: '42'
  });

  caso('3 — Configuração inicial válida converte reais em centavos e % em fração', () => {
    const v = validarConfiguracao(textosPadrao());
    igual(v.erros, {});
    igual([v.parametros.orcamento, v.parametros.projetos[0].custo, v.parametros.taxaMutacao, v.semente], [700000, 400000, 0.05, 42]);
  });

  caso('3 — Bloqueios: custo 0, benefício negativo, nome vazio, torneio > população, elite = população, 3 projetos', () => {
    const t = textosPadrao();
    t.projetos[0].custo = '0'; t.projetos[1].beneficio = '-1'; t.projetos[2].nome = '  ';
    t.tamanhoTorneio = '21'; t.elite = '20';
    const v = validarConfiguracao(t);
    igual(Object.keys(v.erros).sort(), ['elite', 'projeto-0-custo', 'projeto-1-beneficio', 'projeto-2-nome', 'tamanhoTorneio']);
    igual(v.parametros, null);
    const t2 = textosPadrao(); t2.projetos.pop();
    igual(Object.keys(validarConfiguracao(t2).erros), ['projetos']);
  });

  return resultados;
}
