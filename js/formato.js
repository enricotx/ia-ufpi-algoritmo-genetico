// js/formato.js — padrão do grupo: formatação pt-BR só na exibição
const reais = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export const paraCentavos = (valorEmReais) => Math.round(valorEmReais * 100);
export const formatarReais = (centavos) => reais.format(centavos / 100);

export function formatarDecimal(x, casas = 2) {
  return x.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
}

export const formatarCromossomo = (cromossomo) => cromossomo.join('');
