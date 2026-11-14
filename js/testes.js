// js/testes.js — padrão do grupo: um caso por item da seção 6 do enunciado
import * as nucleo from './nucleo.js';

const resultados = [];

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
function mostrar(corpo) {
  corpo.innerHTML = resultados.map(r =>
    `<tr class="${r.ok ? 'ok' : 'falha'}"><td>${r.nome}</td><td>${r.ok ? 'PASSOU' : 'FALHOU'}</td><td>${r.msg ?? ''}</td></tr>`).join('');
  const ok = resultados.filter(r => r.ok).length;
  document.getElementById('resumo').textContent = `${ok} de ${resultados.length} testes passaram.`;
}

// Dados da seção 6.1 (custos em centavos), na ordem A, B, C, D
const PROJETOS = [
  { nome: 'Melhoria da iluminação', custo: 400000, beneficio: 7 },
  { nome: 'Instalação de bicicletários', custo: 300000, beneficio: 5 },
  { nome: 'Aquisição de bancos', custo: 200000, beneficio: 3 },
  { nome: 'Reforma de espaço de convivência', custo: 500000, beneficio: 8 },
];
const ORCAMENTO = 700000;
const bits = (s) => s.split('').map(Number);

caso('6.2 — Avaliação de 1100', () => {
  igual(nucleo.avaliar(bits('1100'), PROJETOS), { custo: 700000, beneficio: 12 });
});

caso('6.3 — Reparação de 1111', () => {
  igual(nucleo.reparar(bits('1111'), PROJETOS, ORCAMENTO).cromossomo.join(''), '1100');
});

// TODO: demais casos da seção 6 (cruzamento, mutação, torneio, limites das taxas,
// execução completa com semente 42, comparação de mutação 1% × 20%, orçamento zero)

mostrar(document.getElementById('resultados'));
