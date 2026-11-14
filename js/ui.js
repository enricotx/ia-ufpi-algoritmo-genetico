// js/ui.js — eventos, estado da execução, logs e laço de Executar
// Único arquivo que acessa o DOM junto com graficos.js. Não faz cálculos do algoritmo.
import { criarRng } from './prng.js';
import * as nucleo from './nucleo.js';
import { lerNumero, lerTexto } from './validacao.js';
import { formatarReais, formatarDecimal, paraCentavos } from './formato.js';

// Estados: 'pronto' | 'executando' | 'pausado' | 'concluido' | 'desatualizado' | 'invalido'
const app = {
  modo: 'pronto',
  parametros: null,
  rng: null,
  estado: null,
  temporizador: null,
};

// TODO: montar tabela de projetos e campos com os valores iniciais (configuração do teste 6.5)
// TODO: validar campos a cada 'input' e marcar o estado 'desatualizado' após qualquer alteração
// TODO: Executar / Pausar / Avançar uma geração / Reiniciar conforme a tabela de estados do padrão
// TODO: renderizar métricas, melhor solução, população, histórico e logs a partir dos eventos
