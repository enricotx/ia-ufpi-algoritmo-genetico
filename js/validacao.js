// js/validacao.js — leitura e validação dos campos (padrão do grupo).
// Nunca corrige um valor em silêncio: entrada inválida devolve { erro }.

export function lerNumero(texto, { nome, min = -Infinity, max = Infinity,
                                    inteiro = false, casas = null, minExclusivo = false }) {
  const bruto = String(texto ?? '').trim().replace(',', '.');
  if (bruto === '') return { erro: `${nome}: preencha este campo.` };
  if (!/^[+-]?\d+(\.\d+)?$/.test(bruto)) return { erro: `${nome}: digite um número válido.` };
  const valor = Number(bruto);
  if (!Number.isFinite(valor)) return { erro: `${nome}: o valor precisa ser finito.` };
  if (inteiro && !Number.isInteger(valor)) return { erro: `${nome}: use um número inteiro.` };
  if (casas !== null && (bruto.split('.')[1] ?? '').length > casas)
    return { erro: `${nome}: use no máximo ${casas} casas decimais.` };
  if (minExclusivo ? valor <= min : valor < min)
    return { erro: `${nome}: o valor deve ser ${minExclusivo ? 'maior que' : 'no mínimo'} ${min}.` };
  if (valor > max) return { erro: `${nome}: o valor deve ser no máximo ${max}.` };
  return { valor };
}

export const MIN_PROJETOS = 4;
export const MAX_PROJETOS = 15;
// Limites práticos (o enunciado não fixa máximo): mantêm os centavos como inteiros
// exatos em JavaScript e evitam travar o navegador.
export const MAX_REAIS = 1e12;
export const MAX_POPULACAO = 1000;
export const MAX_GERACOES = 10000;
export const MAX_SEMENTE = 4294967295;

/**
 * Valida todos os campos de texto da tela de uma vez.
 * textos = { projetos: [{ nome, custo, beneficio }], orcamento, tamanhoPopulacao,
 *            numeroGeracoes, taxaCruzamento, taxaMutacao, tamanhoTorneio, elite, semente }
 * Devolve { erros: { [idDoCampo]: mensagem }, parametros, semente }.
 * parametros só vem preenchido quando não há erro. Custos em centavos; taxas em fração.
 */
export function validarConfiguracao(textos) {
  const erros = {};
  const ler = (id, texto, regra) => {
    const r = lerNumero(texto, regra);
    if (r.erro) erros[id] = r.erro;
    return r.valor;
  };

  const projetos = textos.projetos.map((p, i) => {
    const rotulo = `Projeto ${i + 1}`;
    const nome = String(p.nome ?? '').trim();
    if (nome === '') erros[`projeto-${i}-nome`] = `${rotulo} — nome: preencha este campo.`;
    const custo = ler(`projeto-${i}-custo`, p.custo,
      { nome: `${rotulo} — custo (R$)`, min: 0, minExclusivo: true, max: MAX_REAIS, casas: 2 });
    const beneficio = ler(`projeto-${i}-beneficio`, p.beneficio,
      { nome: `${rotulo} — benefício`, min: 0, max: 1e9 });
    return { nome, custo: custo === undefined ? undefined : Math.round(custo * 100), beneficio };
  });
  if (projetos.length < MIN_PROJETOS || projetos.length > MAX_PROJETOS)
    erros.projetos = `Projetos: mantenha entre ${MIN_PROJETOS} e ${MAX_PROJETOS} itens.`;

  const orcamento = ler('orcamento', textos.orcamento,
    { nome: 'Orçamento disponível (R$)', min: 0, max: MAX_REAIS, casas: 2 });
  const tamanhoPopulacao = ler('tamanhoPopulacao', textos.tamanhoPopulacao,
    { nome: 'Tamanho da população', min: 2, max: MAX_POPULACAO, inteiro: true });
  const numeroGeracoes = ler('numeroGeracoes', textos.numeroGeracoes,
    { nome: 'Número de gerações', min: 1, max: MAX_GERACOES, inteiro: true });
  const taxaCruzamento = ler('taxaCruzamento', textos.taxaCruzamento,
    { nome: 'Taxa de cruzamento (%)', min: 0, max: 100 });
  const taxaMutacao = ler('taxaMutacao', textos.taxaMutacao,
    { nome: 'Taxa de mutação (%)', min: 0, max: 100 });

  // Torneio e elite dependem do tamanho da população: validados juntos.
  const maxPop = tamanhoPopulacao ?? Infinity;
  const tamanhoTorneio = ler('tamanhoTorneio', textos.tamanhoTorneio,
    { nome: 'Tamanho do torneio', min: 2, max: maxPop, inteiro: true });
  const elite = ler('elite', textos.elite,
    { nome: 'Indivíduos de elite', min: 0, max: maxPop - 1, inteiro: true });
  const semente = ler('semente', textos.semente,
    { nome: 'Semente aleatória', min: 0, max: MAX_SEMENTE, inteiro: true });

  if (Object.keys(erros).length > 0) return { erros, parametros: null, semente: null };
  return {
    erros,
    semente,
    parametros: {
      projetos,
      orcamento: Math.round(orcamento * 100),
      tamanhoPopulacao,
      numeroGeracoes,
      taxaCruzamento: taxaCruzamento / 100,
      taxaMutacao: taxaMutacao / 100,
      tamanhoTorneio,
      elite
    }
  };
}
