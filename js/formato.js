// js/formato.js — formatação pt-BR para exibição. Cálculo em precisão total; arredonda só aqui.

const REAIS = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/** Centavos inteiros → 'R$ 7.000,00'. */
export function reais(centavos) {
  return REAIS.format(centavos / 100);
}

/** Número com `casas` casas fixas: 9.35 → '9,35'. */
export function decimal(x, casas = 2) {
  return x.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
}

/** Número sem casas forçadas (benefícios e aptidões): 12 → '12', 7.5 → '7,5'. */
export function numero(x) {
  return x.toLocaleString('pt-BR', { maximumFractionDigits: 6 });
}

/** Fração → percentual: 0.05 → '5%'. */
export function percentual(fracao) {
  return `${(fracao * 100).toLocaleString('pt-BR', { maximumFractionDigits: 4 })}%`;
}

/** Centavos → texto editável no campo: 700000 → '7000,00'. */
export function reaisParaCampo(centavos) {
  return (centavos / 100).toFixed(2).replace('.', ',');
}
