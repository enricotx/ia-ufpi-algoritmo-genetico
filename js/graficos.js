// js/graficos.js — gráfico de evolução (Chart.js) e animação dos operadores (SVG à mão).
// A animação só lê os eventos devolvidos por passo(); nunca recalcula nada nem usa o rng.

import { letraGene } from './nucleo.js';
import { reais, numero, decimal } from './formato.js';

const COR = (nome) => getComputedStyle(document.documentElement).getPropertyValue(nome).trim();

// ---------------------------------------------------------------------------
// Gráfico de evolução: série 1 = melhor acumulado, 2 = melhor da geração, 3 = média
// ---------------------------------------------------------------------------

export function criarGraficoEvolucao(canvas) {
  if (typeof window.Chart === 'undefined') {
    canvas.parentElement.innerHTML = '<p class="erro">Não foi possível carregar o Chart.js (sem internet?). A tabela abaixo mostra o mesmo histórico.</p>';
    return { atualizar() {} };
  }
  const serie = (label, cor, extra = {}) => ({
    label, data: [], borderColor: cor, backgroundColor: cor, borderWidth: 2, pointRadius: 0, tension: 0, ...extra
  });
  const grafico = new window.Chart(canvas, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        serie('Melhor acumulado', COR('--serie-1'), { borderWidth: 3 }),
        serie('Melhor da geração', COR('--serie-2'), { borderDash: [6, 4] }),
        serie('Média da população', COR('--serie-3'))
      ]
    },
    options: {
      animation: false,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      scales: {
        x: { title: { display: true, text: 'Geração' } },
        y: { title: { display: true, text: 'Aptidão (pontos de benefício)' }, beginAtZero: true }
      },
      plugins: {
        legend: { position: 'bottom' },
        tooltip: {
          callbacks: {
            title: (itens) => `Geração ${itens[0].label}`,
            label: (c) => `${c.dataset.label}: ${decimal(c.parsed.y, 2)}`
          }
        }
      }
    }
  });
  return {
    atualizar(historico) {
      grafico.data.labels = historico.map((h) => h.geracao);
      grafico.data.datasets[0].data = historico.map((h) => h.melhorAcumulado);
      grafico.data.datasets[1].data = historico.map((h) => h.melhorGeracao);
      grafico.data.datasets[2].data = historico.map((h) => h.media);
      grafico.update('none');
    }
  };
}

// ---------------------------------------------------------------------------
// Animação de um par: seleção → pais → corte → troca → mutação → reparação → resultado
// ---------------------------------------------------------------------------

const NS = 'http://www.w3.org/2000/svg';
const LARG = 32;          // largura de um bit
const PASSO_X = 36;       // distância entre bits
const X0 = 150;           // início dos cromossomos
const Y = [100, 200];     // linhas: pai/filho 1 e pai/filho 2
const SEPARACAO = 26;     // afastamento no ponto de corte

function el(nome, attrs = {}, texto = null) {
  const e = document.createElementNS(NS, nome);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (texto !== null) e.textContent = texto;
  return e;
}

function posicionar(g, x, y) {
  g.style.transform = `translate(${x}px, ${y}px)`;
}

export function criarAnimador(svg, legenda) {
  let timer = null;

  function parar() {
    if (timer) clearTimeout(timer);
    timer = null;
  }

  function limpar() {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
  }

  function legendar(html) {
    legenda.innerHTML = html;
  }

  /** Desenha um bit como <g> com retângulo e texto; devolve um controlador. */
  function criarBit(pai, valor) {
    const g = el('g', { class: 'anim-bit' });
    g.style.transition = 'none'; // posição inicial sem animar; a transição é ligada depois
    const rect = el('rect', { width: LARG, height: 36, rx: 5 });
    rect.style.transition = 'fill .4s, stroke .4s';
    const txt = el('text', { x: LARG / 2, y: 24, 'text-anchor': 'middle', 'font-size': 17, 'font-weight': 700, 'font-family': 'ui-monospace, Consolas, monospace' });
    const risco = el('line', { x1: 3, y1: 33, x2: LARG - 3, y2: 3, 'stroke-width': 3, stroke: COR('--cor-erro'), opacity: 0 });
    g.append(rect, txt, risco);
    pai.append(g);
    const bit = {
      g, valor, x: 0, y: 0,
      mover(x, y) { bit.x = x; bit.y = y; posicionar(g, x, y); },
      definir(v, modo = 'normal') {
        bit.valor = v;
        txt.textContent = String(v);
        let fill = v ? COR('--cor-primaria') : '#eef1f4';
        let stroke = v ? COR('--cor-primaria') : '#d0d7de';
        if (modo === 'mutado') { fill = COR('--serie-2'); stroke = COR('--serie-2'); }
        if (modo === 'removendo') { fill = '#ffe3e3'; stroke = COR('--cor-erro'); }
        if (modo === 'removido') { stroke = COR('--cor-erro'); }
        rect.setAttribute('fill', fill);
        rect.setAttribute('stroke', stroke);
        rect.setAttribute('stroke-width', modo === 'normal' ? 1 : 3);
        txt.setAttribute('fill', v && modo !== 'removendo' ? '#fff' : (modo === 'removendo' ? COR('--cor-erro') : '#57606a'));
        risco.setAttribute('opacity', modo === 'removendo' || modo === 'removido' ? 1 : 0);
      }
    };
    bit.definir(valor);
    return bit;
  }

  /** Monta e toca as etapas do par. eventos = { selecao, cruzamento, mutacao, reparacao, insercao }. */
  function tocar(eventos, projetos, duracao, rotuloIndice = (i) => `#${i + 1}`) {
    parar();
    limpar();
    svg.style.setProperty('--anim-mov', `${Math.min(0.7, duracao / 2000)}s`);
    const { selecao, cruzamento, mutacao, reparacao, insercao } = eventos;
    const n = projetos.length;
    const etapas = [];

    // Cabeçalho com as letras dos genes
    const cab = el('g');
    for (let i = 0; i < n; i++) {
      cab.append(el('text', { x: X0 + i * PASSO_X + LARG / 2, y: 62, 'text-anchor': 'middle', 'font-size': 12, fill: '#57606a', 'font-family': 'ui-monospace, Consolas, monospace' }, letraGene(i)));
    }

    // ---- Etapa: seleção por torneio
    etapas.push(() => {
      const g = el('g');
      selecao.torneios.forEach((t, k) => {
        const x = 20 + k * 380;
        g.append(el('text', { x, y: 30, 'font-weight': 700, 'font-size': 15, fill: COR('--cor-texto') }, `Torneio ${k + 1} (pai ${k + 1})`));
        const mostrar = t.candidatos.slice(0, 7);
        mostrar.forEach((c, j) => {
          const venceu = c.indice === t.vencedor;
          const y = 50 + j * 32;
          if (venceu) g.append(el('rect', { x: x - 6, y: y - 4, width: 340, height: 28, rx: 5, fill: '#e7f0ff', stroke: COR('--cor-primaria'), 'stroke-width': 2 }));
          g.append(el('text', { x, y: y + 15, 'font-size': 14, 'font-family': 'ui-monospace, Consolas, monospace', fill: COR('--cor-texto'), 'font-weight': venceu ? 700 : 400 },
            `${rotuloIndice(c.indice)}  ${c.cromossomo}  aptidão ${numero(c.aptidao)}${venceu ? '  ← vence' : ''}`));
        });
        if (t.candidatos.length > mostrar.length) {
          g.append(el('text', { x, y: 50 + 7 * 32 + 15, 'font-size': 13, fill: '#57606a' }, `… e mais ${t.candidatos.length - mostrar.length} candidatos`));
        }
      });
      svg.append(g);
      const txt = selecao.torneios.map((t, k) =>
        `torneio ${k + 1}: candidatos ${t.candidatos.map((c) => `${rotuloIndice(c.indice)} (${numero(c.aptidao)})`).join(', ')} → vence <b>${rotuloIndice(t.vencedor)}</b>`).join('; ');
      legendar(`<b>Seleção por torneio</b> — ${txt}. Empate de aptidão → menor índice.`);
      return () => g.remove();
    });

    // Elementos dos cromossomos (criados na etapa "pais")
    const linhas = [[], []];
    const rotulos = [];
    const notas = [];
    const pais = cruzamento.cromossomosPais;

    etapas.push((desfazer) => {
      desfazer?.();
      svg.append(cab);
      for (let r = 0; r < 2; r++) {
        rotulos[r] = el('text', { x: 12, y: Y[r] + 23, 'font-size': 14, 'font-weight': 700, fill: COR('--cor-primaria') }, `Pai ${r + 1} (${rotuloIndice(selecao.pais[r])})`);
        notas[r] = el('text', { x: X0, y: Y[r] + 54, 'font-size': 12, fill: '#57606a' }, '');
        svg.append(rotulos[r], notas[r]);
        for (let i = 0; i < n; i++) {
          const b = criarBit(svg, Number(pais[r][i]));
          b.mover(X0 + i * PASSO_X, Y[r]);
          linhas[r].push(b);
        }
      }
      svg.getBoundingClientRect(); // força o layout antes de ligar as transições
      linhas.flat().forEach((b) => { b.g.style.transition = 'transform var(--anim-mov, .6s) ease-in-out, opacity .4s'; });
      legendar(`<b>Pais escolhidos</b> — pai 1 <code>${pais[0]}</code> (${rotuloIndice(selecao.pais[0])}) e pai 2 <code>${pais[1]}</code> (${rotuloIndice(selecao.pais[1])}), da população anterior.`);
    });

    if (cruzamento.ocorreu) {
      const corte = cruzamento.corte;
      let linhaCorte;
      etapas.push(() => {
        const xc = X0 + corte * PASSO_X - 2 + SEPARACAO / 2;
        linhaCorte = el('line', { x1: xc, y1: 70, x2: xc, y2: 250, stroke: COR('--cor-erro'), 'stroke-width': 2, 'stroke-dasharray': '6 4' });
        svg.append(linhaCorte);
        for (let r = 0; r < 2; r++) {
          for (let i = corte; i < n; i++) linhas[r][i].mover(X0 + i * PASSO_X + SEPARACAO, Y[r]);
        }
        legendar(`<b>Cruzamento de um ponto</b> — corte após o gene ${corte}: <code>${pais[0].slice(0, corte)}|${pais[0].slice(corte)}</code> e <code>${pais[1].slice(0, corte)}|${pais[1].slice(corte)}</code>.`);
      });
      etapas.push(() => {
        for (let i = corte; i < n; i++) {
          const a = linhas[0][i];
          const b = linhas[1][i];
          a.mover(a.x, Y[1]);
          b.mover(b.x, Y[0]);
          linhas[0][i] = b;
          linhas[1][i] = a;
        }
        rotulos[0].textContent = 'Filho 1';
        rotulos[1].textContent = 'Filho 2';
        const [f1, f2] = cruzamento.filhos;
        legendar(`<b>Troca de segmentos</b> — filho 1 = início do pai 1 + fim do pai 2 = <code>${f1}</code>; filho 2 = <code>${f2}</code>.`);
      });
      etapas.push(() => {
        linhaCorte.remove();
        for (let r = 0; r < 2; r++) for (let i = corte; i < n; i++) linhas[r][i].mover(X0 + i * PASSO_X, Y[r]);
        legendar(`<b>Descendentes</b> — filho 1 <code>${cruzamento.filhos[0]}</code> e filho 2 <code>${cruzamento.filhos[1]}</code>, antes da mutação.`);
      });
    } else {
      etapas.push(() => {
        rotulos[0].textContent = 'Filho 1';
        rotulos[1].textContent = 'Filho 2';
        legendar('<b>Sem cruzamento</b> — o sorteio não ficou abaixo da taxa de cruzamento; os filhos são cópias dos pais.');
      });
    }

    // ---- Mutação
    etapas.push(() => {
      const partes = [];
      mutacao.filhos.forEach((m, r) => {
        for (const i of m.genes) linhas[r][i].definir(linhas[r][i].valor ? 0 : 1, 'mutado');
        partes.push(m.genes.length
          ? `filho ${r + 1}: gene(s) ${m.genes.map((i) => `${i + 1} (${letraGene(i)})`).join(', ')} invertido(s) → <code>${m.depois}</code>`
          : `filho ${r + 1}: sem mutação`);
        notas[r].textContent = m.genes.length ? `mutação: ${m.antes} → ${m.depois}` : 'sem mutação';
      });
      legendar(`<b>Mutação por inversão de bits</b> — ${partes.join('; ')}.`);
    });

    // ---- Reparação: uma etapa por remoção, depois o resultado
    const temRemocao = reparacao.filhos.some((f) => f.remocoes.length > 0);
    if (!temRemocao) {
      etapas.push(() => {
        legendar('<b>Reparação</b> — nenhum filho ultrapassou o orçamento; nada a remover.');
      });
    }
    reparacao.filhos.forEach((f, r) => {
      let anterior = f.antes;
      f.remocoes.forEach((rem) => {
        const de = anterior;
        etapas.push(() => {
          linhas[r][rem.indice].definir(1, 'removendo');
          notas[r].textContent = `reparação: remove ${letraGene(rem.indice)} — ${projetos[rem.indice].nome}`;
          legendar(`<b>Reparação do filho ${r + 1}</b> — custo acima do orçamento: remove <b>${letraGene(rem.indice)}</b> (${projetos[rem.indice].nome}), menor razão benefício/custo. <code>${de}</code> → <code>${rem.cromossomo}</code>, custo ${reais(rem.custo)}.`);
        });
        etapas.push(() => {
          linhas[r][rem.indice].definir(0, 'removido');
        });
        anterior = rem.cromossomo;
      });
    });

    // ---- Resultado
    etapas.push(() => {
      const partes = [];
      insercao.filhos.forEach((f, r) => {
        linhas[r].forEach((b) => b.definir(b.valor));
        const destino = f.destino === null ? 'descartado (só restava uma vaga)' : `entra na vaga ${rotuloIndice(f.destino)}`;
        notas[r].textContent = `${f.cromossomo} · ${reais(f.custo)} · aptidão ${numero(f.aptidao)} · ${destino}`;
        if (f.destino === null) linhas[r].forEach((b) => { b.g.style.opacity = 0.35; });
        partes.push(`filho ${r + 1} <code>${f.cromossomo}</code>, aptidão ${numero(f.aptidao)}: ${destino}`);
      });
      legendar(`<b>Avaliação e inserção</b> — ${partes.join('; ')}.`);
    });

    // Execução das etapas em sequência
    let k = 0;
    let desfazer = null;
    const proxima = () => {
      const r = etapas[k](desfazer);
      desfazer = typeof r === 'function' ? r : null;
      k++;
      if (k < etapas.length) timer = setTimeout(proxima, duracao);
      else timer = null;
    };
    proxima();
  }

  function vazio(mensagem) {
    parar();
    limpar();
    legendar(mensagem);
  }

  return { tocar, parar, vazio };
}
