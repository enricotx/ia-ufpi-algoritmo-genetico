// js/ui.js — eventos da tela, estado da execução, logs. Só chama o núcleo e desenha o resultado.

import { criarRng } from './prng.js';
import { PARAMETROS_EXEMPLO, inicializar, passo, letraGene, paraTexto } from './nucleo.js';
import { validarConfiguracao, MIN_PROJETOS, MAX_PROJETOS } from './validacao.js';
import { reais, decimal, numero, reaisParaCampo } from './formato.js';
import { criarGraficoEvolucao, criarAnimador } from './graficos.js';

const SEMENTE_INICIAL = 42;
const CAMPOS = ['orcamento', 'tamanhoPopulacao', 'numeroGeracoes', 'taxaCruzamento', 'taxaMutacao', 'tamanhoTorneio', 'elite', 'semente'];

const $ = (id) => document.getElementById(id);
const rotuloIndice = (i) => `#${i + 1}`; // índices exibidos a partir de 1
const ordinal = (k) => `${k}º`;

/** Único objeto de estado da interface. */
const ui = {
  modo: 'pronto',          // pronto | executando | pausado | concluido | desatualizado | invalido
  parametros: null,        // configuração aplicada no último Reiniciar
  semente: null,
  rng: null,               // pausar/retomar continua o mesmo rng
  estado: null,            // estado do núcleo
  logs: [],                // logs[g] = { geracao, eventos }
  timer: null,
  renderPendente: false,
  historicoMontado: 0,
  logsMontados: 0,
  painelAberto: null,
  animGeracao: null
};

let grafico;
let animador;

// ===========================================================================
// Campos de configuração
// ===========================================================================

function linhaProjeto(i, p) {
  const tr = document.createElement('tr');
  tr.className = 'linha-projeto';
  tr.innerHTML = `
    <td class="gene">${letraGene(i)}</td>
    <td><input type="text" data-campo="nome" aria-label="Nome do projeto ${letraGene(i)}"></td>
    <td><input type="text" inputmode="decimal" data-campo="custo" aria-label="Custo do projeto ${letraGene(i)} em reais"></td>
    <td><input type="text" inputmode="decimal" data-campo="beneficio" aria-label="Benefício do projeto ${letraGene(i)}"></td>
    <td><button type="button" class="pequeno btn-remover" title="Remover projeto" aria-label="Remover projeto ${letraGene(i)}">×</button></td>`;
  tr.querySelector('[data-campo="nome"]').value = p.nome;
  tr.querySelector('[data-campo="custo"]').value = p.custo;
  tr.querySelector('[data-campo="beneficio"]').value = p.beneficio;
  const trErro = document.createElement('tr');
  trErro.className = 'linha-erro';
  trErro.innerHTML = '<td></td><td colspan="4"><div class="erro"></div></td>';
  return [tr, trErro];
}

function lerProjetosDaTela() {
  return [...document.querySelectorAll('#corpo-projetos tr.linha-projeto')].map((tr) => ({
    nome: tr.querySelector('[data-campo="nome"]').value,
    custo: tr.querySelector('[data-campo="custo"]').value,
    beneficio: tr.querySelector('[data-campo="beneficio"]').value
  }));
}

function montarProjetos(projetos) {
  const corpo = $('corpo-projetos');
  corpo.innerHTML = '';
  projetos.forEach((p, i) => corpo.append(...linhaProjeto(i, p)));
  numerarProjetos();
}

/** Renumera ids e letras depois de adicionar/remover. */
function numerarProjetos() {
  const linhas = [...document.querySelectorAll('#corpo-projetos tr.linha-projeto')];
  linhas.forEach((tr, i) => {
    tr.querySelector('.gene').textContent = letraGene(i);
    for (const campo of ['nome', 'custo', 'beneficio']) tr.querySelector(`[data-campo="${campo}"]`).id = `projeto-${i}-${campo}`;
    tr.nextElementSibling.querySelector('.erro').id = `erro-projeto-${i}`;
  });
  $('btn-adicionar').disabled = linhas.length >= MAX_PROJETOS;
  document.querySelectorAll('.btn-remover').forEach((b) => { b.disabled = linhas.length <= MIN_PROJETOS; });
}

function preencherValoresIniciais() {
  const p = PARAMETROS_EXEMPLO;
  montarProjetos(p.projetos.map((x) => ({ nome: x.nome, custo: reaisParaCampo(x.custo), beneficio: String(x.beneficio) })));
  $('orcamento').value = reaisParaCampo(p.orcamento);
  $('tamanhoPopulacao').value = p.tamanhoPopulacao;
  $('numeroGeracoes').value = p.numeroGeracoes;
  $('taxaCruzamento').value = p.taxaCruzamento * 100;
  $('taxaMutacao').value = p.taxaMutacao * 100;
  $('tamanhoTorneio').value = p.tamanhoTorneio;
  $('elite').value = p.elite;
  $('semente').value = SEMENTE_INICIAL;
}

function textosDaTela() {
  const t = { projetos: lerProjetosDaTela() };
  for (const id of CAMPOS) t[id] = $(id).value;
  return t;
}

/** Valida tudo e mostra mensagens abaixo de cada campo + resumo no topo. */
function validarEExibir() {
  const v = validarConfiguracao(textosDaTela());
  document.querySelectorAll('input.invalido').forEach((e) => e.classList.remove('invalido'));
  for (const id of CAMPOS) $(`erro-${id}`).textContent = v.erros[id] ?? '';
  $('erro-projetos').textContent = v.erros.projetos ?? '';
  const porProjeto = {};
  for (const [id, msg] of Object.entries(v.erros)) {
    const input = $(id);
    if (input) input.classList.add('invalido');
    const m = /^projeto-(\d+)-/.exec(id);
    if (m) (porProjeto[m[1]] ??= []).push(msg);
  }
  document.querySelectorAll('[id^="erro-projeto-"]').forEach((div) => {
    const i = div.id.split('-')[2];
    div.innerHTML = (porProjeto[i] ?? []).join('<br>');
  });
  const qtd = Object.keys(v.erros).length;
  $('resumo-erros').textContent = qtd === 0 ? '' : `${qtd} ${qtd === 1 ? 'campo inválido' : 'campos inválidos'}`;
  return v;
}

/** Qualquer alteração de campo: pausa e marca Desatualizado (ou Inválido). */
function aoAlterarConfiguracao() {
  pararTimer();
  const v = validarEExibir();
  if (Object.keys(v.erros).length > 0) {
    ui.modo = 'invalido';
  } else if (!ui.estado || ui.estado.geracao === 0) {
    aplicarConfiguracao(v); // nada foi executado ainda: aplica direto e continua Pronto
    return;
  } else {
    ui.modo = 'desatualizado';
  }
  agendarRender();
}

// ===========================================================================
// Controle da execução
// ===========================================================================

function aplicarConfiguracao(v) {
  pararTimer();
  animador.vazio('Avance uma geração para ver os pais, o corte, a troca de segmentos, as mutações e a reparação.');
  ui.parametros = v.parametros;
  ui.semente = v.semente;
  ui.rng = criarRng(v.semente);
  const r = inicializar(ui.parametros, ui.rng);
  ui.estado = r.estado;
  ui.logs = [{ geracao: 0, eventos: r.eventos }];
  ui.modo = 'pronto';
  ui.historicoMontado = 0;
  ui.logsMontados = 0;
  ui.painelAberto = null;
  ui.animGeracao = null;
  $('corpo-historico').innerHTML = '';
  $('lista-logs').innerHTML = '';
  $('copiar-status').textContent = '';
  agendarRender();
}

function avancarUmaGeracao() {
  const r = passo(ui.estado, ui.parametros, ui.rng);
  ui.estado = r.estado;
  ui.logs.push({ geracao: r.estado.geracao, eventos: r.eventos });
}

function terminou() {
  return ui.estado.geracao >= ui.parametros.numeroGeracoes;
}

function pararTimer() {
  if (ui.timer) clearTimeout(ui.timer);
  ui.timer = null;
  if (ui.modo === 'executando') ui.modo = 'pausado';
}

function ciclo() {
  ui.timer = null;
  if (ui.modo !== 'executando') return;
  avancarUmaGeracao();
  if (terminou()) ui.modo = 'concluido';
  else ui.timer = setTimeout(ciclo, Number($('intervalo').value)); // a velocidade só muda o intervalo
  agendarRender();
}

function executar() {
  if (ui.modo !== 'pronto' && ui.modo !== 'pausado') return;
  const v = validarEExibir(); // valida de novo ao clicar
  if (Object.keys(v.erros).length > 0) { ui.modo = 'invalido'; agendarRender(); return; }
  animador.parar();
  ui.modo = 'executando';
  ciclo();
  renderizar();
}

function pausar() {
  if (ui.modo !== 'executando') return;
  pararTimer();
  ui.modo = 'pausado';
  renderizar();
}

function avancar() {
  if (ui.modo !== 'pronto' && ui.modo !== 'pausado') return;
  const v = validarEExibir();
  if (Object.keys(v.erros).length > 0) { ui.modo = 'invalido'; agendarRender(); return; }
  avancarUmaGeracao();
  ui.modo = terminou() ? 'concluido' : 'pausado';
  renderizar();
  animarPar(1);
}

function reiniciar() {
  const v = validarEExibir();
  if (Object.keys(v.erros).length > 0) { ui.modo = 'invalido'; agendarRender(); return; }
  aplicarConfiguracao(v);
}

// ===========================================================================
// Texto dos logs (eventos estruturados → linhas). **negrito** e `código`.
// ===========================================================================

function escaparHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function linhaParaHtml(l) {
  return escaparHtml(l).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`(.+?)`/g, '<code>$1</code>');
}

function linhaParaTexto(l) {
  return l.replace(/\*\*/g, '').replace(/`/g, '');
}

function textoReparacao(antes, remocoes, projetos) {
  if (remocoes.length === 0) return `\`${antes}\` viável, sem reparação`;
  return `\`${antes}\` → ${remocoes.map((r) => `\`${r.cromossomo}\` (remove ${letraGene(r.indice)} — ${projetos[r.indice].nome})`).join(' → ')}`;
}

function resumoGeracao(log) {
  const r = log.eventos.find((e) => e.tipo === 'resumo');
  return `Geração ${log.geracao} — melhor ${numero(r.melhorGeracao)}, média ${decimal(r.media, 2)}, melhor acumulado ${numero(r.melhorAcumulado)}${r.novoMelhor ? ' ★' : ''}`;
}

/** Linhas de uma geração (cada linha é um item ou um bloco de par). */
function linhasGeracao(log, projetos) {
  const blocos = [];
  const ev = log.eventos;
  if (log.geracao === 0) {
    blocos.push(['**População inicial** — cada gene sorteado com 50% de chance de ser 1; reparação antes da avaliação.']);
    for (const e of ev.filter((x) => x.tipo === 'inicial')) {
      blocos.push([`**Indivíduo ${rotuloIndice(e.indice)}** — sorteado ${textoReparacao(e.sorteado, e.remocoes, projetos)}; custo ${reais(e.custo)}, aptidão ${numero(e.aptidao)}`]);
    }
  }
  for (const e of ev.filter((x) => x.tipo === 'elite')) {
    blocos.push([`**Elitismo** — \`${e.cromossomo}\` (${rotuloIndice(e.origem)}, aptidão ${numero(e.aptidao)}) copiado sem alteração para a vaga ${rotuloIndice(e.destino)}`]);
  }
  const pares = Math.max(0, ...ev.filter((x) => x.par).map((x) => x.par));
  for (let p = 1; p <= pares; p++) {
    const sel = ev.find((x) => x.tipo === 'selecao' && x.par === p);
    const cz = ev.find((x) => x.tipo === 'cruzamento' && x.par === p);
    const mu = ev.find((x) => x.tipo === 'mutacao' && x.par === p);
    const rp = ev.find((x) => x.tipo === 'reparacao' && x.par === p);
    const ins = ev.find((x) => x.tipo === 'insercao' && x.par === p);
    const linhas = [`**Par ${p}**`];
    linhas.push(`**Seleção** — ${sel.torneios.map((t, k) => `torneio ${k + 1}: ${t.candidatos.map((c) => `${rotuloIndice(c.indice)} \`${c.cromossomo}\` (${numero(c.aptidao)})`).join(', ')} → vence ${rotuloIndice(t.vencedor)}`).join('; ')}`);
    linhas.push(cz.ocorreu
      ? `**Cruzamento** — pais \`${cz.cromossomosPais[0]}\` (${rotuloIndice(cz.pais[0])}) e \`${cz.cromossomosPais[1]}\` (${rotuloIndice(cz.pais[1])}), corte após o ${ordinal(cz.corte)} gene → filhos \`${cz.filhos[0]}\` e \`${cz.filhos[1]}\``
      : `**Sem cruzamento** — pais \`${cz.cromossomosPais[0]}\` (${rotuloIndice(cz.pais[0])}) e \`${cz.cromossomosPais[1]}\` (${rotuloIndice(cz.pais[1])}); filhos são cópias: \`${cz.filhos[0]}\` e \`${cz.filhos[1]}\``);
    linhas.push(`**Mutação** — ${mu.filhos.map((m, k) => (m.genes.length
      ? `filho ${k + 1}: gene${m.genes.length > 1 ? 's' : ''} ${m.genes.map((g) => `${g + 1} (${letraGene(g)})`).join(', ')} → \`${m.depois}\``
      : `filho ${k + 1}: sem mutação`)).join('; ')}`);
    linhas.push(`**Reparação** — ${rp.filhos.map((f, k) => `filho ${k + 1}: ${textoReparacao(f.antes, f.remocoes, projetos)}`).join('; ')}`);
    linhas.push(`**Avaliação** — ${ins.filhos.map((f, k) => `filho ${k + 1} \`${f.cromossomo}\`: custo ${reais(f.custo)}, aptidão ${numero(f.aptidao)} → ${f.destino === null ? 'descartado (só restava uma vaga)' : `vaga ${rotuloIndice(f.destino)}`}`).join('; ')}`);
    blocos.push(linhas);
  }
  const r = ev.find((x) => x.tipo === 'resumo');
  blocos.push([`**Resumo** — melhor da geração ${numero(r.melhorGeracao)}, média ${decimal(r.media, 2)}, melhor acumulado ${numero(r.melhorAcumulado)} (\`${r.cromossomoMelhor}\`)${r.novoMelhor ? ' — novo melhor acumulado' : ''}`]);
  return blocos;
}

function corpoGeracaoHtml(log) {
  return linhasGeracao(log, ui.parametros.projetos).map((bloco) => (bloco.length > 1
    ? `<div class="par">${bloco.map((l) => `<p>${linhaParaHtml(l)}</p>`).join('')}</div>`
    : `<p>${linhaParaHtml(bloco[0])}</p>`)).join('');
}

function logComoTexto() {
  const cab = [
    'Algoritmo Genético — seleção de projetos',
    `Semente ${ui.semente}; população ${ui.parametros.tamanhoPopulacao}; gerações ${ui.parametros.numeroGeracoes}; cruzamento ${numero(ui.parametros.taxaCruzamento * 100)}%; mutação ${numero(ui.parametros.taxaMutacao * 100)}%; torneio ${ui.parametros.tamanhoTorneio}; elite ${ui.parametros.elite}; orçamento ${reais(ui.parametros.orcamento)}`,
    `Projetos: ${ui.parametros.projetos.map((p, i) => `${letraGene(i)}. ${p.nome} (${reais(p.custo)}; ${numero(p.beneficio)})`).join(' | ')}`,
    ''
  ];
  const corpo = ui.logs.map((log) => [resumoGeracao(log),
    ...linhasGeracao(log, ui.parametros.projetos).flatMap((b) => b.map((l, k) => `${b.length > 1 && k > 0 ? '    ' : '  '}${linhaParaTexto(l)}`)), ''].join('\n'));
  return cab.concat(corpo).join('\n');
}

async function copiarLog() {
  if (!ui.estado) return;
  const texto = logComoTexto();
  try {
    await navigator.clipboard.writeText(texto);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = texto;
    document.body.append(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
  $('copiar-status').textContent = `Log de ${ui.logs.length} gerações copiado.`;
}

// ===========================================================================
// Renderização
// ===========================================================================

function agendarRender() {
  if (ui.renderPendente) return;
  ui.renderPendente = true;
  requestAnimationFrame(() => { ui.renderPendente = false; renderizar(); });
}

const TEXTO_STATUS = {
  pronto: () => `Pronto para executar — geração 0 de ${ui.parametros?.numeroGeracoes ?? '—'}`,
  executando: () => `Executando… geração ${ui.estado.geracao} de ${ui.parametros.numeroGeracoes}`,
  pausado: () => `Pausado na geração ${ui.estado.geracao} de ${ui.parametros.numeroGeracoes}`,
  concluido: () => `Concluído: ${ui.parametros.numeroGeracoes} gerações`,
  desatualizado: () => 'Configuração alterada — clique em Reiniciar',
  invalido: () => 'Corrija os campos destacados'
};

// Executar · Pausar · Avançar · Reiniciar habilitados por estado (tabela do padrão)
const BOTOES = {
  pronto: [1, 0, 1, 1], executando: [0, 1, 0, 1], pausado: [1, 0, 1, 1],
  concluido: [0, 0, 0, 1], desatualizado: [0, 0, 0, 1], invalido: [0, 0, 0, 0]
};

function bitsHtml(cromossomo) {
  return `<span class="bits">${[...cromossomo].map((b, i) => `<span class="bit ${b === '1' || b === 1 ? 'um' : 'zero'}" title="${letraGene(i)}"><span><span class="letra">${letraGene(i)}</span>${b}</span></span>`).join('')}</span>`;
}

function definirCartao(id, texto) {
  const e = $(id);
  if (texto === null) { e.textContent = 'ainda não calculada'; e.classList.add('vazio'); }
  else { e.textContent = texto; e.classList.remove('vazio'); }
}

function renderizar() {
  // Status e botões
  const status = $('status');
  status.dataset.estado = ui.modo;
  status.textContent = TEXTO_STATUS[ui.modo]();
  const [e, p, a, r] = BOTOES[ui.modo];
  $('btn-executar').disabled = !e;
  $('btn-executar').textContent = ui.modo === 'pausado' ? 'Executar (retomar)' : 'Executar';
  $('btn-pausar').disabled = !p;
  $('btn-avancar').disabled = !a;
  $('btn-reiniciar').disabled = !r;
  $('btn-copiar-log').disabled = !ui.estado;

  const est = ui.estado;
  const h = est?.historico.at(-1);
  definirCartao('m-geracao', h ? `${h.geracao} de ${ui.parametros.numeroGeracoes}` : null);
  definirCartao('m-melhor-geracao', h ? numero(h.melhorGeracao) : null);
  definirCartao('m-media', h ? decimal(h.media, 2) : null);
  definirCartao('m-melhor-acumulado', h ? numero(h.melhorAcumulado) : null);
  if (!est) return;
  const projetos = ui.parametros.projetos;

  // Melhor solução
  const m = est.melhor;
  const escolhidos = m.cromossomo.map((g, i) => (g ? `${letraGene(i)}. ${escaparHtml(projetos[i].nome)}` : null)).filter(Boolean);
  $('melhor-solucao').innerHTML = `
    <dt>Cromossomo</dt><dd>${bitsHtml(paraTexto(m.cromossomo))} <span class="mono">${paraTexto(m.cromossomo)}</span></dd>
    <dt>Projetos escolhidos</dt><dd>${escolhidos.length ? escolhidos.join('; ') : 'nenhum (seleção vazia)'}</dd>
    <dt>Custo total</dt><dd>${reais(m.custo)}</dd>
    <dt>Benefício total (aptidão)</dt><dd><b>${numero(m.aptidao)}</b></dd>
    <dt>Saldo do orçamento</dt><dd>${reais(ui.parametros.orcamento - m.custo)} de ${reais(ui.parametros.orcamento)}</dd>
    <dt>Encontrada em</dt><dd>geração ${m.geracao}, indivíduo ${rotuloIndice(m.indice)}</dd>`;

  // Histórico: tabela (acrescenta só as linhas novas) e gráfico
  const corpoH = $('corpo-historico');
  const frag = document.createDocumentFragment();
  for (let g = ui.historicoMontado; g < est.historico.length; g++) {
    const x = est.historico[g];
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${x.geracao}</td><td>${numero(x.melhorGeracao)}</td><td>${decimal(x.media, 2)}</td><td>${numero(x.melhorAcumulado)}</td><td class="esq mono">${x.cromossomoMelhor}</td>`;
    frag.append(tr);
  }
  corpoH.append(frag);
  ui.historicoMontado = est.historico.length;
  grafico.atualizar(est.historico);

  // População atual com origem de cada indivíduo
  const logAtual = ui.logs.at(-1);
  const origem = {};
  for (const ev of logAtual.eventos) {
    if (ev.tipo === 'elite') origem[ev.destino] = `<span class="marca-elite">elite</span> (cópia de ${rotuloIndice(ev.origem)})`;
    if (ev.tipo === 'insercao') ev.filhos.forEach((f, k) => { if (f.destino !== null) origem[f.destino] = `filho ${k + 1} do par ${ev.par}`; });
  }
  const melhorGeracao = h.melhorGeracao;
  $('corpo-populacao').innerHTML = est.populacao.map((ind, i) =>
    `<tr class="${ind.elite ? 'elite' : ''} ${ind.aptidao === melhorGeracao ? 'melhor' : ''}"><td>${rotuloIndice(i)}</td><td class="esq mono">${paraTexto(ind.cromossomo)}</td><td>${reais(ind.custo)}</td><td>${numero(ind.aptidao)}</td><td class="esq">${origem[i] ?? (est.geracao === 0 ? 'inicial (aleatório)' : '')}</td></tr>`).join('');

  renderizarLogs();
  renderizarSeletorAnimacao();
}

/** Um <details> por geração; só o painel aberto tem o corpo montado no DOM. */
function renderizarLogs() {
  const lista = $('lista-logs');
  for (let g = ui.logsMontados; g < ui.logs.length; g++) {
    const log = ui.logs[g];
    const d = document.createElement('details');
    d.dataset.geracao = g;
    d.innerHTML = `<summary>${escaparHtml(resumoGeracao(log))}</summary><div class="corpo"></div>`;
    d.addEventListener('toggle', () => {
      const corpo = d.querySelector('.corpo');
      corpo.innerHTML = d.open ? corpoGeracaoHtml(ui.logs[Number(d.dataset.geracao)]) : '';
    });
    lista.prepend(d); // mais recente no topo
  }
  if (ui.logsMontados !== ui.logs.length) {
    if (ui.painelAberto) ui.painelAberto.open = false; // anteriores fechados
    const recente = lista.firstElementChild;
    recente.open = true; // o mais recente aberto
    ui.painelAberto = recente;
    ui.logsMontados = ui.logs.length;
  }
}

function renderizarSeletorAnimacao() {
  const g = ui.estado.geracao;
  if (ui.animGeracao === g) return;
  ui.animGeracao = g;
  $('anim-geracao').textContent = String(g);
  const sel = $('anim-par');
  const pares = g === 0 ? 0 : ui.logs[g].eventos.filter((e) => e.tipo === 'selecao').length;
  sel.innerHTML = pares === 0
    ? '<option value="">— (geração 0 não tem pares)</option>'
    : Array.from({ length: pares }, (_, i) => `<option value="${i + 1}">Par ${i + 1}</option>`).join('');
  $('btn-animar').disabled = pares === 0;
}

function animarPar(p) {
  const g = ui.estado.geracao;
  if (g === 0) return;
  const ev = ui.logs[g].eventos;
  const pega = (tipo) => ev.find((e) => e.tipo === tipo && e.par === p);
  if (!pega('selecao')) return;
  $('anim-par').value = String(p);
  animador.tocar({
    selecao: pega('selecao'), cruzamento: pega('cruzamento'), mutacao: pega('mutacao'),
    reparacao: pega('reparacao'), insercao: pega('insercao')
  }, ui.parametros.projetos, Number($('anim-duracao').value), rotuloIndice);
}

// ===========================================================================
// Ligação dos eventos
// ===========================================================================

function iniciar() {
  grafico = criarGraficoEvolucao($('grafico-evolucao'));
  animador = criarAnimador($('anim-palco'), $('anim-legenda'));
  preencherValoresIniciais();

  for (const id of CAMPOS) $(id).addEventListener('input', aoAlterarConfiguracao);
  $('corpo-projetos').addEventListener('input', aoAlterarConfiguracao);
  $('corpo-projetos').addEventListener('click', (ev) => {
    const btn = ev.target.closest('.btn-remover');
    if (!btn || btn.disabled) return;
    const tr = btn.closest('tr');
    tr.nextElementSibling.remove();
    tr.remove();
    numerarProjetos();
    aoAlterarConfiguracao();
  });
  $('btn-adicionar').addEventListener('click', () => {
    const qtd = lerProjetosDaTela().length;
    if (qtd >= MAX_PROJETOS) return;
    $('corpo-projetos').append(...linhaProjeto(qtd, { nome: `Projeto ${letraGene(qtd)}`, custo: '1000,00', beneficio: '1' }));
    numerarProjetos();
    aoAlterarConfiguracao();
  });
  $('btn-restaurar').addEventListener('click', () => { preencherValoresIniciais(); aoAlterarConfiguracao(); });

  $('btn-executar').addEventListener('click', executar);
  $('btn-pausar').addEventListener('click', pausar);
  $('btn-avancar').addEventListener('click', avancar);
  $('btn-reiniciar').addEventListener('click', reiniciar);
  $('btn-copiar-log').addEventListener('click', copiarLog);

  $('intervalo').addEventListener('input', () => { $('intervalo-valor').textContent = `${$('intervalo').value} ms`; });
  $('anim-duracao').addEventListener('input', () => {
    $('anim-duracao-valor').textContent = `${decimal(Number($('anim-duracao').value) / 1000, 1)} s`;
  });
  $('btn-animar').addEventListener('click', () => animarPar(Number($('anim-par').value)));
  $('btn-anim-parar').addEventListener('click', () => animador.parar());

  const v = validarEExibir();
  if (Object.keys(v.erros).length === 0) aplicarConfiguracao(v);
  else { ui.modo = 'invalido'; renderizar(); }
}

iniciar();
