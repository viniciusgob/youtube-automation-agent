const ui = {
  state: null,
  currentView: 'overview',
  refreshing: false,
  toastTimer: null,
  retentionSnapshotId: null,
  engagementVideoId: null,
  engagementDetail: null
};

const $ = selector => document.querySelector(selector);
const $$ = selector => Array.from(document.querySelectorAll(selector));

function escapeHTML(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function apiKey() {
  return localStorage.getItem('yaa_api_key') || '';
}

function requestApiKey() {
  const key = prompt('Informe o valor de API_KEY do seu .env. Ele fica salvo apenas neste navegador.', apiKey());
  if (key !== null) localStorage.setItem('yaa_api_key', key.trim());
  return key;
}

async function api(url, options = {}, retry = true) {
  const key = apiKey();
  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(key ? { 'x-api-key': key } : {}),
      ...(options.headers || {})
    }
  });
  if (response.status === 401 && retry && requestApiKey() !== null) return api(url, options, false);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || response.statusText || 'Falha na requisição');
    error.data = data;
    throw error;
  }
  return data;
}

function showToast(message, type = 'success') {
  const toast = $('#toast');
  toast.textContent = message;
  toast.className = `toast ${type}`;
  clearTimeout(ui.toastTimer);
  ui.toastTimer = setTimeout(() => toast.classList.add('hidden'), 4200);
}

function empty(message) {
  return `<div class="empty">${escapeHTML(message)}</div>`;
}

function formatDate(value, includeTime = true) {
  if (!value) return 'Não agendado';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Não agendado';
  return new Intl.DateTimeFormat('pt-BR', {
    month: 'short', day: 'numeric',
    ...(ui.state?.profile?.timezone ? { timeZone: ui.state.profile.timezone } : {}),
    ...(includeTime ? { hour: 'numeric', minute: '2-digit' } : {})
  }).format(date);
}

function timeAgo(value) {
  if (!value) return '';
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return 'agora mesmo';
  if (seconds < 3600) return `há ${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `há ${Math.floor(seconds / 3600)} h`;
  return `há ${Math.floor(seconds / 86400)} d`;
}

const DISPLAY_LABELS_PT = {
  unknown: 'desconhecido',
  pending: 'pendente',
  pending_review: 'revisão pendente',
  needs_review: 'aguardando revisão',
  needs_attention: 'requer atenção',
  attention_required: 'requer atenção',
  needs_rebuild: 'requer reconstrução',
  approved: 'aprovado',
  rejected: 'rejeitado',
  adopted: 'adotado',
  accepted: 'aceito',
  dismissed: 'descartado',
  discarded: 'descartado',
  proposed: 'proposto',
  scheduled: 'agendado',
  published: 'publicado',
  uploading: 'enviando',
  uploaded: 'enviado',
  reconciliation_required: 'reconciliação necessária',
  queued: 'na fila',
  starting: 'iniciando',
  submitting: 'enviando',
  processing: 'processando',
  running: 'em execução',
  resuming: 'retomando',
  generating: 'gerando',
  generated: 'gerado',
  rendering: 'renderizando',
  rendered: 'renderizado',
  completed: 'concluído',
  completed_with_issues: 'concluído com problemas',
  succeeded: 'concluído',
  success: 'sucesso',
  fulfilled: 'atendido',
  failed: 'falhou',
  error: 'erro',
  invalid: 'inválido',
  interrupted: 'interrompido',
  cancelling: 'cancelando',
  cancelled: 'cancelado',
  paused: 'pausado',
  active: 'ativo',
  draft: 'rascunho',
  backlog: 'backlog',
  ready: 'pronto',
  partial: 'parcial',
  skipped: 'ignorado',
  simulated: 'simulado',
  unavailable: 'indisponível',
  not_configured: 'não configurado',
  not_required: 'não exigido',
  passed: 'aprovado',
  warning: 'alerta',
  unverified: 'não verificado',
  verified: 'verificado',
  supported: 'comprovado',
  unsupported: 'sem comprovação',
  waived: 'dispensado',
  posted: 'publicado',
  read: 'lido',
  action_required: 'ação necessária',
  awaiting_winner: 'aguardando vencedor',
  intentional_silence: 'silêncio intencional',
  visual_stale: 'visual desatualizado',
  current: 'atual',
  stale: 'desatualizado',
  narration_current: 'narração atual',
  narration_stale: 'narração desatualizada',
  narration_failed: 'narração falhou',
  narration_generating: 'gerando narração',
  narration_unavailable: 'narração indisponível',
  narration_intentional_silence: 'silêncio intencional',
  drop_off: 'queda',
  rewatch: 'reexibição',
  strong_hold: 'boa retenção',
  steady: 'estável',
  low: 'baixa',
  medium: 'média',
  high: 'alta',
  standard: 'padrão',
  positive: 'positivo',
  neutral: 'neutro',
  negative: 'negativo',
  praise: 'elogio',
  question: 'pergunta',
  request: 'pedido',
  feedback: 'feedback',
  planning: 'planejamento',
  researching: 'pesquisando',
  strategy: 'estratégia',
  script: 'roteiro',
  thumbnail: 'thumbnail',
  seo: 'SEO',
  production: 'produção',
  quality_review: 'revisão de qualidade',
  audience_demand: 'demanda do público',
  engagement: 'engajamento',
  format: 'formato',
  outcome_alignment: 'alinhamento ao resultado',
  packaging: 'embalagem',
  packaging_experiment: 'experimento de embalagem',
  retention: 'retenção',
  scene_retention: 'retenção por cena',
  views: 'visualizações',
  long_form: 'vídeo longo',
  shorts: 'Shorts',
  blur: 'desfocado',
  crop: 'recorte',
  stacked: 'empilhado',
  slideshow: 'slideshow'
};

function label(value) {
  const raw = String(value || 'unknown');
  return DISPLAY_LABELS_PT[raw.toLowerCase()] ?? raw.replaceAll('_', ' ');
}

function statusChip(value) {
  const safe = String(value || 'unknown').toLowerCase();
  return `<span class="status ${escapeHTML(safe)}">${escapeHTML(label(safe))}</span>`;
}

async function refreshDashboard(silent = false) {
  if (ui.refreshing) return;
  ui.refreshing = true;
  if (!silent) $('#loading').classList.add('active');
  try {
    ui.state = await api('/api/dashboard');
    renderDashboard();
  } catch (error) {
    $('#system-label').textContent = 'Painel indisponível';
    $('#system-dot').classList.remove('online');
    if (!silent) showToast(error.message, 'error');
  } finally {
    ui.refreshing = false;
    $('#loading').classList.remove('active');
  }
}

function renderDashboard() {
  const state = ui.state;
  const reviews = state.pipeline.filter(item => ['needs_review', 'needs_attention'].includes(item.review_status));
  const scheduled = state.schedule.filter(item => item.status === 'scheduled');
  const actionableJobs = state.jobs.filter(job => ['queued', 'running', 'failed', 'interrupted'].includes(job.status));

  $('#brand-name').textContent = state.profile?.channel_name || 'Estúdio de Automação';
  $('#setup-banner').classList.toggle('hidden', !state.system.setupRequired);
  $('#system-label').textContent = state.system.setupRequired
    ? 'Configuração necessária'
    : state.system.automationPaused ? 'Automação pausada' : `${state.system.agents.length} agentes online`;
  $('#system-dot').classList.toggle('online', state.system.initialized && !state.system.automationPaused && !state.system.setupRequired);
  $('#automation-toggle').textContent = state.system.automationPaused ? 'Retomar automação' : 'Pausar automação';
  $('#automation-toggle').disabled = state.system.setupRequired;
  $('#generate-button').disabled = state.system.setupRequired;
  $('#review-badge').textContent = reviews.length;
  $('#review-badge').classList.toggle('hidden', reviews.length === 0);

  $('#stat-review').textContent = reviews.length;
  $('#stat-scheduled').textContent = scheduled.length;
  $('#stat-published').textContent = state.stats.published || 0;
  $('#stat-score').textContent = state.analytics.averagePerformanceScore ? `${state.analytics.averagePerformanceScore}/100` : '—';

  renderReviews(reviews);
  renderJobs(actionableJobs.length ? actionableJobs : state.jobs.slice(0, 5));
  renderSchedule(state.schedule.slice(0, 5), '#next-schedule');
  renderNotifications(state.notifications, state.events);
  renderPipeline(state.pipeline);
  renderCalendar(state.schedule);
  renderIdeas(state.ideas);
  renderAnalytics(state.analytics, state.learning);
  renderGrowthExperiments(state.experiments || {});
  renderEngagement(ui.state.engagement || {});
  renderActivation(state.activation);
  renderReadiness(state.readiness);
  renderOperator(state.channelStrategy, state.operatorRuns || [], { ...state.system, readiness: state.readiness });
  populateSettings(state.profile, state.settings, state.system.videoProviders || []);
}

function renderReadiness(readiness = {}) {
  const status = readiness.status || 'unverified';
  const statusNode = $('#readiness-status');
  statusNode.className = `status ${escapeHTML(status)}`;
  statusNode.textContent = readiness.stale && status !== 'unverified' ? `${label(status)} · desatualizado` : label(status);

  const titles = {
    passed: 'O caminho de produção está verificado.',
    warning: 'As verificações principais passaram com alertas.',
    failed: 'A automação está bloqueada até que isso seja corrigido.',
    unverified: 'Comprove o pipeline, sem enviar nada.'
  };
  $('#readiness-title').textContent = titles[status] || titles.unverified;
  const counts = readiness.summary || {};
  $('#readiness-summary').textContent = status === 'unverified'
    ? 'A verificação faz pequenas requisições reais de texto e narração, confirma o acesso ao canal, gera um MP4 local de áudio/vídeo e valida os metadados na fila. Ela nunca cria nem envia um vídeo ao YouTube.'
    : `${counts.passed || 0} aprovada${counts.passed === 1 ? '' : 's'}, ${counts.warnings || 0} alerta${counts.warnings === 1 ? '' : 's'} e ${counts.failed || 0} com falha.`;
  $('#readiness-meta').textContent = readiness.completed_at
    ? `Última execução em ${formatDate(readiness.completed_at)}${readiness.stale ? ' · há mais de 24 horas' : ''}`
    : 'Nenhuma verificação de prontidão registrada.';

  const checks = Array.isArray(readiness.checks) ? readiness.checks : [];
  $('#readiness-checks').innerHTML = checks.length ? checks.map(check => `
    <article class="readiness-check ${escapeHTML(check.status)}">
      <div class="readiness-check-heading"><span class="readiness-icon" aria-hidden="true">${check.status === 'passed' ? '✓' : check.status === 'failed' ? '×' : '!'}</span><div><strong>${escapeHTML(check.label)}</strong><div class="meta-line">${escapeHTML(label(check.status))}${check.blocking ? ' · bloqueante' : ' · opcional'} · ${(check.durationMs || 0) / 1000}s</div></div></div>
      <p>${escapeHTML(check.message)}</p>
      ${check.remediation ? `<small><strong>Próximo passo:</strong> ${escapeHTML(check.remediation)}</small>` : ''}
    </article>`).join('') : empty('Execute a verificação para inspecionar cada dependência de produção.');
}

function renderReviews(reviews) {
  const container = $('#review-list');
  if (!reviews.length) {
    container.innerHTML = empty('Nada aguardando. Novos conteúdos aparecerão aqui após a revisão de qualidade.');
    return;
  }
  container.innerHTML = reviews.slice(0, 5).map(item => `
    <article class="review-card">
      ${item.hasThumbnail ? `<img class="review-thumb" src="/api/content/${encodeURIComponent(item.id)}/asset/thumbnail" alt="">` : '<div class="review-thumb"></div>'}
      <div class="review-meta"><strong>${escapeHTML(item.title)}</strong><div class="meta-line">${statusChip(item.review_status)} · Qualidade ${qualityScore(item.qualityChecks)}%</div></div>
      <button class="button secondary small" data-open-content="${escapeHTML(item.id)}">Revisar</button>
    </article>`).join('');
}

function renderJobs(jobs) {
  const container = $('#job-list');
  if (!jobs.length) {
    container.innerHTML = empty('Nenhuma geração executada ainda.');
    return;
  }
  const stages = ['strategy', 'script', 'thumbnail', 'seo', 'production', 'quality_review'];
  container.innerHTML = jobs.slice(0, 6).map(job => {
    const checkpoints = Array.isArray(job.checkpoints) ? job.checkpoints : [];
    const completed = new Set(checkpoints.filter(item => item.status === 'completed').map(item => item.stage));
    const mediaTasks = Array.isArray(job.mediaTasks) ? job.mediaTasks : [];
    const mediaCompleted = mediaTasks.filter(item => item.status === 'succeeded').length;
    const mediaProviders = [...new Set(mediaTasks.map(item => label(item.provider)))].join(', ');
    const resumeFrom = stages.find(stage => !completed.has(stage)) || 'quality_review';
    const recoverable = ['failed', 'interrupted'].includes(job.status);
    return `
    <article class="job-card">
      <div class="job-meta">
        <strong>${escapeHTML(job.title || job.topic || 'Tema escolhido pelo agente')}</strong>
        <div class="meta-line">${statusChip(job.status)} · ${escapeHTML(label(job.stage))} · ${timeAgo(job.updated_at)}</div>
        ${checkpoints.length ? `<div class="checkpoint-line">${completed.size}/${stages.length} etapas salvas${job.details?.reusedStages?.length ? ` · ${job.details.reusedStages.length} reaproveitada${job.details.reusedStages.length === 1 ? '' : 's'}` : ''}</div>` : ''}
        ${mediaTasks.length ? `<div class="checkpoint-line">Vídeo: ${mediaCompleted}/${mediaTasks.length} clipes prontos · ${escapeHTML(mediaProviders)}</div>` : ''}
        <div class="progress"><i style="width:${Math.max(0, Math.min(100, job.progress || 0))}%"></i></div>
      </div>
      ${['queued', 'running'].includes(job.status) ? `<button class="text-button" data-cancel-job="${escapeHTML(job.id)}">Cancelar</button>` : ''}
      ${recoverable ? `<div class="job-recovery"><select data-resume-stage-for="${escapeHTML(job.id)}" aria-label="Etapa a partir da qual retomar">${stages.map(stage => `<option value="${stage}" ${stage === resumeFrom ? 'selected' : ''}>${escapeHTML(label(stage))}</option>`).join('')}</select><button class="button secondary small" data-resume-job="${escapeHTML(job.id)}">Retomar</button></div>` : ''}
    </article>`;
  }).join('');
}

function renderSchedule(schedule, selector) {
  const container = $(selector);
  if (!schedule.length) {
    container.innerHTML = empty('Nenhum vídeo aprovado está agendado.');
    return;
  }
  container.innerHTML = schedule.map(item => `
    <div class="timeline-item">
      <div class="date-chip"><small>${escapeHTML(new Date(item.publish_time).toLocaleDateString('pt-BR', { month: 'short' }))}</small><strong>${escapeHTML(new Date(item.publish_time).getDate())}</strong></div>
      <div class="timeline-meta"><strong>${escapeHTML(item.title)}</strong><div class="meta-line">${formatDate(item.publish_time)} · ${statusChip(item.status)}</div></div>
      <button class="text-button" data-open-content="${escapeHTML(item.production_id)}">Ver</button>
    </div>`).join('');
}

function renderNotifications(notifications, events) {
  const items = notifications.length
    ? notifications
    : events.map(event => ({ level: event.status === 'error' ? 'error' : 'info', title: label(event.event_type), message: event.data?.error || label(event.status), created_at: event.created_at }));
  const container = $('#notification-list');
  if (!items.length) {
    container.innerHTML = empty('Nenhuma atividade registrada ainda.');
    return;
  }
  container.innerHTML = items.slice(0, 7).map(item => `
    <div class="activity ${escapeHTML(item.level || 'info')}"><i></i><p><strong>${escapeHTML(item.title)}</strong><br><span class="meta-line">${escapeHTML(item.message)}</span></p><small>${timeAgo(item.created_at)}</small></div>`).join('');
}

function currentPipelineFilter() {
  return $('#pipeline-filter').value || 'all';
}

function renderPipeline(items) {
  const filter = currentPipelineFilter();
  const filtered = filter === 'all' ? items : items.filter(item =>
    item.review_status === filter || item.schedule_status === filter || item.status === filter
  );
  const container = $('#pipeline-list');
  if (!filtered.length) {
    container.innerHTML = empty('Nenhum conteúdo corresponde a este filtro.');
    return;
  }
  container.innerHTML = filtered.map(item => {
    const state = item.schedule_status || item.review_status || item.status;
    const next = nextAction(item);
    return `<article class="pipeline-item" data-open-content="${escapeHTML(item.id)}">
      <div class="pipeline-title"><strong>${escapeHTML(item.title)}</strong><span>${escapeHTML(item.topic || 'Nenhum tema registrado')} · ${formatDate(item.created_at)}</span></div>
      <div class="pipeline-col"><span>Estado</span><strong>${statusChip(state)}</strong></div>
      <div class="pipeline-col"><span>Qualidade</span><strong>${qualityScore(item.qualityChecks)} / 100</strong></div>
      <button class="button secondary small">${escapeHTML(next)} →</button>
    </article>`;
  }).join('');
}

function qualityScore(checks) {
  if (!Array.isArray(checks) || !checks.length) return 0;
  return Math.round((checks.filter(check => check.passed).length / checks.length) * 100);
}

function nextAction(item) {
  if (item.schedule_status === 'published') return 'Ver';
  if (item.review_status === 'needs_attention') return 'Corrigir problemas';
  if (item.review_status === 'needs_review') return 'Revisar';
  if (item.schedule_status === 'scheduled') return 'Agendado';
  return 'Inspecionar';
}

function renderCalendar(schedule) {
  renderSchedule(schedule, '#calendar-list');
}

function renderIdeas(ideas) {
  const container = $('#idea-list');
  if (!ideas.length) {
    container.innerHTML = empty('Adicione temas promissores aqui antes de gastar créditos de geração.');
    return;
  }
  container.innerHTML = ideas.map(idea => `
    <article class="idea-card">
      <div class="idea-meta"><strong>${escapeHTML(idea.topic)}</strong><div class="meta-line">${escapeHTML(idea.angle || idea.rationale || 'Nenhum ângulo adicionado')} · ${statusChip(idea.status)}</div></div>
      ${idea.status === 'backlog' ? `<button class="button secondary small" data-generate-idea="${escapeHTML(idea.id)}">Gerar</button>` : ''}
    </article>`).join('');
}

function renderAnalytics(analytics, learning = {}) {
  $('#analytics-total').textContent = analytics.totalVideos || 0;
  $('#analytics-score').textContent = analytics.averagePerformanceScore ? `${analytics.averagePerformanceScore}/100` : '—';
  const insights = Array.isArray(analytics.insights) ? analytics.insights : [];
  const approved = (learning.recommendations || []).find(item => item.status === 'approved');
  const pending = (learning.recommendations || []).find(item => item.status === 'pending');
  $('#analytics-action').textContent = approved?.title || pending?.title || insights[0] || (analytics.totalVideos
    ? 'Continue coletando resultados; as recomendações ficam mais fortes com mais vídeos publicados.'
    : 'Publique e analise o primeiro vídeo para desbloquear recomendações de desempenho.');
  const performers = Array.isArray(analytics.topPerformers) ? analytics.topPerformers : [];
  $('#top-performers').innerHTML = performers.length ? performers.map(item => `
    <article class="performer-card"><strong>${escapeHTML(item.videoDetails?.title || item.title || 'Vídeo sem título')}</strong><div class="meta-line">Desempenho ${escapeHTML(item.performance?.score ?? item.performance_score ?? '—')} / 100</div></article>`).join('') : empty('Nenhum vídeo analisado ainda.');
  renderOutcome(learning.outcome || {});
  renderLearning(learning);
  renderRetention(learning.retention || {});
}

function formatOutcomeValue(value, kind = 'number', currency = 'USD') {
  if (value === null || value === undefined) return 'Indisponível';
  const number = Number(value);
  if (!Number.isFinite(number)) return 'Indisponível';
  if (kind === 'currency') {
    try {
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency, maximumFractionDigits: 2 }).format(number);
    } catch (_error) {
      return `${currency} ${number.toFixed(2)}`;
    }
  }
  if (kind === 'percent') return `${new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(number)}%`;
  if (kind === 'hours') return `${new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(number)} h`;
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(number);
}

function renderOutcome(outcome = {}) {
  const status = $('#outcome-status');
  if (!outcome.configured || !outcome.goal) {
    status.textContent = 'Não configurado';
    status.className = 'status';
    $('#outcome-summary').innerHTML = empty('Escolha um resultado principal mensurável na estratégia do Operador Autônomo.');
    $('#outcome-economics').innerHTML = '';
    $('#outcome-breakdowns').innerHTML = '';
    $('#outcome-policy').textContent = outcome.evidencePolicy || 'Configure um resultado principal para ativar o aprendizado alinhado à meta.';
    return;
  }
  const { goal, economics = {}, coverage = {}, breakdowns = {} } = outcome;
  status.textContent = outcome.available ? 'Medindo' : 'Aguardando evidências';
  status.className = `status ${outcome.available ? 'active' : ''}`;
  const target = goal.targetValue === null
    ? `Sem meta numérica · janela de evidências de ${goal.windowDays} dias`
    : `Meta de ${formatOutcomeValue(goal.targetValue, goal.unit, goal.currency)} · ${goal.windowDays} dias`;
  const progress = outcome.progressPercent === null ? null : Math.min(100, Number(outcome.progressPercent));
  $('#outcome-summary').innerHTML = `
    <div class="outcome-primary">
      <span>${escapeHTML(goal.label)}</span>
      <strong>${escapeHTML(outcome.formattedObserved || 'Indisponível')}</strong>
      <small>${escapeHTML(target)} · ${Number(outcome.measuredVideoCount || 0)} vídeo${Number(outcome.measuredVideoCount || 0) === 1 ? '' : 's'} medido${Number(outcome.measuredVideoCount || 0) === 1 ? '' : 's'}</small>
      ${progress === null ? '' : `<div class="outcome-progress" role="progressbar" aria-label="Progresso em relação à meta" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress}"><span style="width:${progress}%"></span></div><small>${Number(outcome.progressPercent).toFixed(1)}% da meta, com base nas janelas de medição salvas</small>`}
    </div>`;
  const economicsRows = [
    ['Inscritos líquidos', economics.netSubscribers, 'number', coverage.subscribers],
    ['Horas assistidas', economics.watchHours, 'hours', null],
    ['Receita estimada', economics.estimatedRevenue, 'currency', coverage.revenue],
    ['Custo de produção conhecido', economics.knownProductionCost, 'currency', coverage.cost],
    ['ROI estimado', economics.roi, 'percent', null],
    ['Orçamento utilizado', economics.budgetUsedPercent, 'percent', null]
  ];
  $('#outcome-economics').innerHTML = economicsRows.map(([name, value, kind, metricCoverage]) => `
    <div><span>${escapeHTML(name)}</span><strong>${escapeHTML(formatOutcomeValue(value, kind, economics.currency || goal.currency))}</strong>${metricCoverage ? `<small>${Number(metricCoverage.measured || 0)}/${Number(metricCoverage.total || 0)} vídeos medidos</small>` : ''}</div>`).join('');
  const dimensions = [
    ['pillar', 'Pilares de conteúdo'], ['format', 'Formatos'], ['provider', 'Provedores de produção']
  ].filter(([key]) => Array.isArray(breakdowns[key]) && breakdowns[key].length);
  $('#outcome-breakdowns').innerHTML = dimensions.length ? dimensions.map(([key, heading]) => `
    <section><h3>${escapeHTML(heading)}</h3>${breakdowns[key].slice(0, 5).map(item => `
      <div class="outcome-breakdown-row"><span>${escapeHTML(label(item.name))}<small>${Number(item.count || 0)} vídeo${Number(item.count || 0) === 1 ? '' : 's'}</small></span><strong>média ${escapeHTML(formatOutcomeValue(item.average, goal.unit, goal.currency))}</strong></div>`).join('')}</section>`).join('') : empty('Os detalhamentos aparecem quando os vídeos medidos têm evidências comparáveis de pilar, formato ou provedor.');
  $('#outcome-policy').textContent = outcome.evidencePolicy;
}

function renderLearning(learning = {}) {
  const baseline = learning.baseline || {};
  $('#learning-snapshot-count').textContent = `${learning.snapshotCount || 0} medições`;
  $('#learning-approved-count').textContent = `${learning.approvedCount || 0} aprovada${learning.approvedCount === 1 ? '' : 's'}`;
  const metrics = [
    ['CTR', baseline.ctr, '%'],
    ['Retenção', baseline.retention, '%'],
    ['Engajamento', baseline.engagementRate, '%'],
    ['Desempenho', baseline.performanceScore, '/100']
  ];
  $('#learning-baseline').innerHTML = learning.measuredVideos ? metrics.map(([name, value, suffix]) => `
    <div><span>${escapeHTML(name)}</span><strong>${Number(value || 0).toFixed(1)}${escapeHTML(suffix)}</strong></div>`).join('') : empty('Duas medições reais desbloqueiam recomendações baseadas em evidências.');

  const recommendations = Array.isArray(learning.recommendations) ? learning.recommendations : [];
  $('#learning-recommendations').innerHTML = recommendations.length ? recommendations.map(item => `
    <article class="learning-card">
      <div class="learning-card-heading"><strong>${escapeHTML(item.title)}</strong>${statusChip(item.status)}</div>
      <p>${escapeHTML(item.rationale)}</p>
      <div class="learning-meta"><span>${escapeHTML(label(item.category))} · confiança ${escapeHTML(label(item.confidence))}</span>
        <span class="learning-actions">
          ${item.status !== 'approved' ? `<button class="text-button approve" data-learning-action="approve" data-learning-id="${escapeHTML(item.id)}">Aprovar</button>` : ''}
          ${item.status !== 'rejected' ? `<button class="text-button" data-learning-action="reject" data-learning-id="${escapeHTML(item.id)}">Rejeitar</button>` : ''}
        </span>
      </div>
    </article>`).join('') : empty('Nenhuma recomendação ainda. O Lumen precisa de pelo menos duas medições reais com exposição suficiente.');
}

function renderGrowthExperiments(summary = {}) {
  const experiments = Array.isArray(summary.experiments) ? summary.experiments : [];
  const candidates = Array.isArray(summary.candidates) ? summary.candidates : [];
  const candidate = $('#experiment-candidate');
  const create = $('#experiment-create-button');
  candidate.innerHTML = candidates.length
    ? candidates.map(item => `<option value="${escapeHTML(item.productionId)}">${escapeHTML(item.title || item.productionId)}</option>`).join('')
    : '<option value="">Nenhuma variante publicada elegível</option>';
  candidate.disabled = !candidates.length;
  create.disabled = !candidates.length;
  $('#experiment-status').textContent = `${Number(summary.activeCount || 0)} em execução · ${Number(summary.awaitingDecisionCount || 0)} decis${Number(summary.awaitingDecisionCount || 0) === 1 ? 'ão' : 'ões'}`;
  $('#experiment-policy').textContent = summary.evidencePolicy || 'Somente evidências reais do YouTube fazem os testes controlados avançarem.';

  $('#growth-experiments').innerHTML = experiments.length ? experiments.map(experiment => {
    const winner = experiment.arms?.find(arm => arm.id === experiment.winningArmId);
    const actions = [];
    if (experiment.status === 'draft') actions.push(`<button class="text-button approve" data-experiment-action="approve" data-experiment-id="${escapeHTML(experiment.id)}">Aprovar plano</button>`);
    if (experiment.status === 'approved') actions.push(`<button class="button primary small" data-experiment-action="start" data-experiment-id="${escapeHTML(experiment.id)}">Iniciar teste ao vivo</button>`);
    if (experiment.status === 'running') {
      actions.push(`<button class="button secondary small" data-experiment-action="refresh" data-experiment-id="${escapeHTML(experiment.id)}">Atualizar evidências</button>`);
      actions.push(`<button class="text-button" data-experiment-action="cancel" data-experiment-id="${escapeHTML(experiment.id)}">Cancelar e restaurar controle</button>`);
    }
    if (experiment.status === 'action_required') actions.push(`<button class="text-button" data-experiment-action="cancel" data-experiment-id="${escapeHTML(experiment.id)}">Tentar restaurar controle novamente</button>`);
    if (experiment.status === 'awaiting_winner') actions.push(`<button class="button primary small" data-experiment-action="adopt" data-experiment-id="${escapeHTML(experiment.id)}">Adotar ${escapeHTML(winner?.label || 'vencedor')}</button>`);
    const arms = (experiment.arms || []).map(arm => {
      const result = arm.result || {};
      const active = arm.id === experiment.currentArmId && experiment.status === 'running';
      return `<div class="experiment-arm ${active ? 'active' : ''} ${arm.id === experiment.winningArmId ? 'winner' : ''}">
        <div><strong>${escapeHTML(arm.label)}</strong>${arm.isControl ? '<small>Controle</small>' : ''}</div>
        <span>${escapeHTML(arm.title)}</span>
        <div class="experiment-arm-metrics"><b>${Number(result.ctr || 0).toFixed(2)}% CTR</b><small>${Number(result.impressions || 0).toLocaleString('pt-BR')} impressões</small></div>
      </div>`;
    }).join('');
    return `<article class="growth-experiment-card">
      <div class="learning-card-heading"><strong>${escapeHTML(experiment.title)}</strong>${statusChip(experiment.status)}</div>
      <p>${escapeHTML(experiment.hypothesis)}</p>
      <div class="experiment-arm-list">${arms}</div>
      ${experiment.result?.reason ? `<p class="experiment-result"><strong>Resultado:</strong> ${escapeHTML(experiment.result.reason)}${experiment.result.liftPercent !== undefined ? ` · ${escapeHTML(experiment.result.liftPercent)}% de ganho` : ''}</p>` : ''}
      <div class="learning-meta"><span>${Number(experiment.armDurationHours || 0)} h por variante · mínimo de ${Number(experiment.minImpressions || 0).toLocaleString('pt-BR')} impressões</span><span class="learning-actions">${actions.join('')}</span></div>
    </article>`;
  }).join('') : empty('Publique conteúdo com variantes de título e thumbnail de aprendizados aprovados para criar o primeiro teste controlado.');
}

function renderRetention(retention = {}) {
  const snapshots = Array.isArray(retention.snapshots) ? retention.snapshots : [];
  const select = $('#retention-snapshot-select');
  const refresh = $('#refresh-retention-button');
  if (!snapshots.length) {
    ui.retentionSnapshotId = null;
    select.innerHTML = '<option value="">Nenhuma curva medida ainda</option>';
    select.disabled = true;
    refresh.disabled = true;
    $('#retention-meta').innerHTML = '';
    $('#retention-chart').innerHTML = empty('As curvas de retenção aparecem quando um vídeo publicado atinge uma janela real de medição do analytics.');
    $('#retention-scenes').innerHTML = '';
    return;
  }

  if (!snapshots.some(item => item.id === ui.retentionSnapshotId)) ui.retentionSnapshotId = snapshots[0].id;
  select.disabled = false;
  refresh.disabled = false;
  select.innerHTML = snapshots.map(item => `<option value="${escapeHTML(item.id)}" ${item.id === ui.retentionSnapshotId ? 'selected' : ''}>${escapeHTML(item.title || item.videoId)} · ${escapeHTML(label(item.surface))} · ${escapeHTML(item.measurementWindow)}</option>`).join('');
  const snapshot = snapshots.find(item => item.id === ui.retentionSnapshotId) || snapshots[0];
  refresh.dataset.videoId = snapshot.videoId;
  refresh.dataset.measurementWindow = snapshot.measurementWindow;

  const summary = snapshot.summary || {};
  $('#retention-meta').innerHTML = [
    `${snapshot.points?.length || 0} pontos reais`,
    `${snapshot.sceneMetrics?.length || 0} cenas`,
    `${summary.dropoffCount || 0} quedas`,
    `${summary.rewatchCount || 0} sinais de reexibição`,
    `confiança ${escapeHTML(label(snapshot.confidence))}`,
    `janela ${escapeHTML(snapshot.measurementWindow)}`
  ].map(item => `<span>${item}</span>`).join('');
  $('#retention-chart').innerHTML = retentionChart(snapshot);
  $('#retention-scenes').innerHTML = (snapshot.sceneMetrics || []).map(scene => `
    <article class="retention-scene ${escapeHTML(scene.signal)}">
      <div class="retention-scene-heading"><div><span>Cena ${Number(scene.position || 0) + 1}</span><strong>${escapeHTML(scene.label)}</strong></div>${statusChip(scene.signal)}</div>
      <div class="retention-metrics">
        <div><span>Assistindo em média</span><strong>${(Number(scene.averageWatchRatio || 0) * 100).toFixed(1)}%</strong></div>
        <div><span>Variação na cena</span><strong>${Number(scene.changePoints || 0) > 0 ? '+' : ''}${Number(scene.changePoints || 0).toFixed(1)} p.p.</strong></div>
        <div><span>Retenção relativa</span><strong>${(Number(scene.averageRelativeRetention || 0) * 100).toFixed(1)}%</strong></div>
        <div><span>Maior queda</span><strong>${Number(scene.largestDropPoints || 0).toFixed(1)} p.p.</strong></div>
      </div>
    </article>`).join('') || empty('Não foi possível mapear a curva salva para a linha do tempo de cenas.');
}

function renderEngagement(engagement = {}) {
  $('#engagement-policy').textContent = engagement.evidencePolicy || '';
  const posting = $('#engagement-posting-status');
  posting.textContent = engagement.postingEnabled ? 'publicação liberada' : 'publicação bloqueada';
  posting.className = `status ${engagement.postingEnabled ? 'success' : 'warning'}`;
  posting.title = engagement.postingEnabled ? '' : 'Autorize o YouTube novamente (npm run walkthrough) para conceder a permissão de comentários.';
  $('#engagement-drafts-count').textContent = `${engagement.pendingDrafts || 0} rascunho${engagement.pendingDrafts === 1 ? '' : 's'}`;
  $('#engagement-attention-count').textContent = `${engagement.needsAttentionCount || 0} sinalizado${engagement.needsAttentionCount === 1 ? '' : 's'}`;
  $('#engagement-ideas-count').textContent = `${engagement.pendingAudienceIdeas || 0} pendente${engagement.pendingAudienceIdeas === 1 ? '' : 's'}`;

  const insights = Array.isArray(engagement.insights) ? engagement.insights : [];
  const select = $('#engagement-video-select');
  if (!insights.length) {
    ui.engagementVideoId = null;
    ui.engagementDetail = null;
    select.innerHTML = '<option value="">Nenhum vídeo sincronizado ainda</option>';
    select.disabled = true;
    $('#engagement-sync-button').disabled = true;
    $('#engagement-draft-button').disabled = true;
    $('#engagement-meta').innerHTML = '';
    $('#engagement-themes').innerHTML = empty('Os comentários aparecem depois que um vídeo publicado é sincronizado.');
    $('#engagement-drafts').innerHTML = empty('Gere rascunhos de respostas de um vídeo sincronizado para revisá-los aqui.');
    $('#engagement-attention').innerHTML = empty('Nada sinalizado como spam, golpe ou tóxico.');
  } else {
    if (!insights.some(item => item.videoId === ui.engagementVideoId)) ui.engagementVideoId = insights[0].videoId;
    select.disabled = false;
    select.innerHTML = insights.map(item => `<option value="${escapeHTML(item.videoId)}" ${item.videoId === ui.engagementVideoId ? 'selected' : ''}>${escapeHTML(item.title || item.videoId)}</option>`).join('');
    $('#engagement-sync-button').disabled = false;
    $('#engagement-sync-button').dataset.videoId = ui.engagementVideoId;
    $('#engagement-draft-button').disabled = false;
    $('#engagement-draft-button').dataset.videoId = ui.engagementVideoId;
    renderEngagementDetail();
  }
  renderAudienceIdeas();
}

function renderEngagementDetail() {
  const detail = ui.engagementDetail;
  if (!detail || detail.insight?.videoId !== ui.engagementVideoId) {
    loadEngagementDetail(ui.engagementVideoId);
    return;
  }
  const insight = detail.insight || {};
  const sentiment = insight.sentiment || {};
  const fallback = insight.analysisMethod === 'fallback';
  $('#engagement-meta').innerHTML = [
    `${insight.commentCount || 0} comentário${insight.commentCount === 1 ? '' : 's'}`,
    `${insight.analyzedCount || 0} analisado${insight.analyzedCount === 1 ? '' : 's'}`,
    fallback ? 'Análise por IA indisponível — apenas fatos mecânicos' : `${sentiment.positive || 0} positivo${sentiment.positive === 1 ? '' : 's'} · ${sentiment.neutral || 0} neutro${sentiment.neutral === 1 ? '' : 's'} · ${sentiment.negative || 0} negativo${sentiment.negative === 1 ? '' : 's'}`,
    insight.lastSyncedAt ? `sincronizado em ${new Date(insight.lastSyncedAt).toLocaleString('pt-BR')}` : 'nunca sincronizado'
  ].map(item => `<span>${escapeHTML(item)}</span>`).join('');

  const themes = Array.isArray(insight.themes) ? insight.themes : [];
  $('#engagement-themes').innerHTML = themes.length ? themes.map(theme => `
    <article class="learning-card">
      <div class="learning-card-heading"><strong>${escapeHTML(theme.title)}</strong>${statusChip(theme.kind)}</div>
      <p>${escapeHTML(theme.summary)}</p>
      <div class="learning-meta"><span>${escapeHTML(String(theme.count || 0))} comentário${Number(theme.count) === 1 ? '' : 's'}</span></div>
    </article>`).join('') : empty(fallback ? 'Os temas exigem um provedor de texto de IA funcionando.' : 'Nenhum tema recorrente ainda.');

  const commentsById = new Map((detail.comments || []).map(comment => [comment.commentId, comment]));
  const postingEnabled = ui.state?.engagement?.postingEnabled === true;
  const drafts = (detail.drafts || []).filter(draft => draft.status !== 'discarded');
  const draftsContainer = $('#engagement-drafts');
  // The 8s poll must not wipe a reply the operator is actively editing.
  const draftsHTML = drafts.length ? drafts.map(draft => {
    const comment = commentsById.get(draft.commentId) || {};
    const locked = draft.status === 'posted';
    return `
    <article class="comment-card" data-reply-card="${escapeHTML(draft.id)}">
      <div class="learning-card-heading"><strong>${escapeHTML(comment.authorName || 'Espectador')}</strong>${statusChip(draft.status)}</div>
      <p class="comment-original">${escapeHTML(comment.text || '')}</p>
      <label><span>Resposta</span><textarea data-reply-text maxlength="1000" ${locked ? 'disabled' : ''}>${escapeHTML(draft.editedText || draft.draftText)}</textarea></label>
      ${draft.failureReason ? `<p class="meta-line">A última tentativa falhou: ${escapeHTML(draft.failureReason)}</p>` : ''}
      <div class="learning-actions">
        ${locked ? '' : `<button class="button primary small" data-reply-approve="${escapeHTML(draft.id)}" ${postingEnabled ? '' : 'disabled title="Autorize o YouTube novamente para liberar a publicação"'}>Aprovar e publicar</button>
        <button class="text-button" data-reply-save="${escapeHTML(draft.id)}">Salvar edição</button>
        <button class="text-button danger-text" data-reply-discard="${escapeHTML(draft.id)}">Descartar</button>`}
      </div>
    </article>`;
  }).join('') : empty('Nenhum rascunho de resposta para este vídeo ainda.');
  // Guard the focused textarea only: a clicked action button also holds focus, and skipping
  // the rebuild for it would leave the panel showing pre-action state.
  const editingReply = draftsContainer.contains(document.activeElement)
    && document.activeElement.matches('[data-reply-text]');
  if (!editingReply) draftsContainer.innerHTML = draftsHTML;

  const attention = Array.isArray(insight.attentionFlags) ? insight.attentionFlags : [];
  $('#engagement-attention').innerHTML = attention.length ? attention.map(flag => {
    const comment = commentsById.get(flag.commentId) || {};
    return `
    <article class="comment-card">
      <div class="learning-card-heading"><strong>${escapeHTML((flag.categories || []).join(', '))}</strong></div>
      <p class="comment-original">${escapeHTML(comment.text || '')}</p>
      <a class="text-button" href="${escapeHTML(flag.permalink || '#')}" target="_blank" rel="noopener noreferrer">Abrir no YouTube</a>
    </article>`;
  }).join('') : empty('Nada sinalizado como spam, golpe ou tóxico.');
}

async function loadEngagementDetail(videoId) {
  if (!videoId) return;
  try {
    const data = await api(`/api/engagement/${encodeURIComponent(videoId)}`);
    ui.engagementDetail = data.result;
    renderEngagementDetail();
  } catch (_error) { /* toast already shown by api() */ }
}

function renderAudienceIdeas() {
  const recommendations = (ui.state?.learning?.recommendations || []).filter(item => item.category === 'audience_demand');
  $('#engagement-ideas').innerHTML = recommendations.length ? recommendations.map(item => `
    <article class="learning-card">
      <div class="learning-card-heading"><strong>${escapeHTML(item.title)}</strong>${statusChip(item.status)}</div>
      <p>${escapeHTML(item.rationale)}</p>
      <div class="learning-meta"><span>confiança ${escapeHTML(label(item.confidence))}</span>
        <span class="learning-actions">
          ${item.status !== 'approved' ? `<button class="text-button approve" data-learning-action="approve" data-learning-id="${escapeHTML(item.id)}">Aprovar</button>` : ''}
          ${item.status !== 'rejected' ? `<button class="text-button" data-learning-action="reject" data-learning-id="${escapeHTML(item.id)}">Rejeitar</button>` : ''}
        </span>
      </div>
    </article>`).join('') : empty('Os pedidos do público aparecem aqui quando a análise de comentários encontra solicitações repetidas.');
}

function retentionChart(snapshot = {}) {
  const points = Array.isArray(snapshot.points) ? snapshot.points : [];
  if (points.length < 2) return empty('Esta medição não tem pontos suficientes para formar uma curva.');
  const width = 1000;
  const height = 280;
  const left = 46;
  const right = 18;
  const top = 18;
  const bottom = 38;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const maxRatio = Math.max(1, Math.min(1.5, Math.max(...points.map(point => Number(point.audienceWatchRatio || 0))) * 1.05));
  const x = ratio => left + Math.max(0, Math.min(1, Number(ratio || 0))) * plotWidth;
  const y = ratio => top + (1 - Math.max(0, Math.min(maxRatio, Number(ratio || 0))) / maxRatio) * plotHeight;
  const line = points.map(point => `${x(point.elapsedRatio).toFixed(1)},${y(point.audienceWatchRatio).toFixed(1)}`).join(' ');
  const duration = Math.max(1, Number(snapshot.durationSeconds || 1));
  const sceneBands = (snapshot.sceneMetrics || []).map((scene, index) => {
    const start = x(Number(scene.startSeconds || 0) / duration);
    const end = x(Number(scene.endSeconds || 0) / duration);
    return `<g><rect x="${start.toFixed(1)}" y="${top}" width="${Math.max(1, end - start).toFixed(1)}" height="${plotHeight}" class="retention-band band-${index % 2}"/><line x1="${start.toFixed(1)}" y1="${top}" x2="${start.toFixed(1)}" y2="${top + plotHeight}" class="scene-boundary"/><title>${escapeHTML(scene.label)}</title></g>`;
  }).join('');
  const grid = [0.25, 0.5, 0.75, 1].map(value => {
    const lineY = y(value);
    return `<line x1="${left}" y1="${lineY.toFixed(1)}" x2="${width - right}" y2="${lineY.toFixed(1)}" class="retention-grid-line"/><text x="${left - 8}" y="${(lineY + 4).toFixed(1)}" text-anchor="end">${Math.round(value * 100)}%</text>`;
  }).join('');
  return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="retention-chart-title retention-chart-desc">
    <title id="retention-chart-title">Retenção do público de ${escapeHTML(snapshot.title || snapshot.videoId)}</title>
    <desc id="retention-chart-desc">Curva de retenção do público com ${points.length} pontos, dividida em ${snapshot.sceneMetrics?.length || 0} cenas de produção.</desc>
    ${sceneBands}${grid}
    <polyline points="${line}" class="retention-line"/>
    <text x="${left}" y="${height - 10}" text-anchor="start">Início</text>
    <text x="${width - right}" y="${height - 10}" text-anchor="end">Fim</text>
  </svg>`;
}

function renderActivation(activation = {}) {
  const container = $('#activation-list');
  if (!container) return;
  const milestones = activation.milestones || {};
  const rows = [
    ['Configuração pronta', milestones.setupReady],
    ['Primeiro MP4 real', milestones.firstRealVideo],
    ['Primeira aprovação', milestones.firstApproval],
    ['Primeira publicação no YouTube', milestones.firstPublish],
    ['Segundo MP4 real', milestones.secondRealVideo]
  ];
  container.innerHTML = rows.map(([name, milestone = {}]) => `
    <div class="timeline-item">
      <div class="timeline-dot ${milestone.achieved ? 'done' : ''}"></div>
      <div><strong>${escapeHTML(name)}</strong><div class="meta-line">${milestone.achieved ? escapeHTML(formatDate(milestone.at)) : 'Ainda não alcançado'}</div></div>
    </div>`).join('');
  if (milestones.firstRealVideo?.achieved) {
    container.insertAdjacentHTML('beforeend', `
      <div class="activation-share">
        <span>Criou algo real com o Lumen?</span>
        <a class="button secondary small" href="https://github.com/darkzOGx/youtube-automation-agent/discussions/new?category=show-and-tell" target="_blank" rel="noreferrer">Compartilhe o que você criou</a>
      </div>`);
  }
}

function renderOperator(strategy, runs, system) {
  const form = $('#strategy-form');
  const mapping = strategy ? {
    objective: strategy.objective,
    audience: strategy.audience,
    valueProposition: strategy.value_proposition,
    contentPillars: (strategy.contentPillars || []).join(', '),
    cadencePerWeek: strategy.cadence_per_week,
    videosPerRun: strategy.videos_per_run,
    defaultFormat: strategy.default_format,
    defaultLength: strategy.default_length,
    successMetric: strategy.success_metric,
    primaryKpi: strategy.primary_kpi,
    targetValue: strategy.target_value,
    targetWindowDays: strategy.target_window_days,
    monthlyBudget: strategy.monthly_budget,
    outcomeCurrency: strategy.outcome_currency,
    constraints: strategy.constraints
  } : {};
  for (const [name, value] of Object.entries(mapping)) {
    if (form.elements[name] && document.activeElement !== form.elements[name]) form.elements[name].value = value ?? '';
  }

  const strategyStatus = strategy?.status || 'not_configured';
  $('#operator-strategy-status').className = `status ${escapeHTML(strategyStatus)}`;
  $('#operator-strategy-status').textContent = label(strategyStatus);
  const run = runs[0];
  const active = run && ['queued', 'running', 'cancelling'].includes(run.status);
  const recoverable = run && ['failed', 'interrupted', 'completed_with_issues'].includes(run.status);
  $('#activate-operator-button').disabled = Boolean(system.setupRequired || active || system.readiness?.status === 'failed');
  $('#activate-operator-button').title = system.readiness?.status === 'failed' ? 'Resolva primeiro as falhas de prontidão de produção' : '';
  $('#activate-operator-button').textContent = strategy?.status === 'active' ? 'Executar estratégia agora' : 'Ativar e executar agora';
  $('#pause-operator-button').classList.toggle('hidden', strategy?.status !== 'active');
  $('#cancel-operator-run').classList.toggle('hidden', !active);
  if (active) $('#cancel-operator-run').dataset.runId = run.id;
  $('#resume-operator-run').classList.toggle('hidden', !recoverable);
  $('#resume-operator-run').disabled = Boolean(system.setupRequired || system.readiness?.status === 'failed');
  if (recoverable) $('#resume-operator-run').dataset.runId = run.id;

  if (!run) {
    $('#operator-run-title').textContent = 'Aguardando uma estratégia';
    $('#operator-run-summary').innerHTML = empty('Salve as diretrizes do canal e ative-as para pesquisar e produzir o primeiro plano.');
    $('#operator-plan').innerHTML = empty('Nenhum plano editorial ainda.');
    return;
  }

  $('#operator-run-title').textContent = `${label(run.stage)} · ${run.progress || 0}%`;
  const sources = Array.isArray(run.research?.sources) ? run.research.sources.join(', ') : 'Pesquisa pendente';
  $('#operator-run-summary').innerHTML = `<div class="run-summary">
    <div class="progress"><i style="width:${Math.max(0, Math.min(100, run.progress || 0))}%"></i></div>
    <div class="run-summary-row"><span>Status</span><strong>${statusChip(run.status)}</strong></div>
    <div class="run-summary-row"><span>Pesquisa</span><strong>${escapeHTML(sources)}</strong></div>
    <div class="run-summary-row"><span>Produzidos</span><strong>${escapeHTML(run.summary?.generated || 0)} / ${escapeHTML(run.summary?.planned || run.plan?.length || 0)}</strong></div>
    <div class="run-summary-row"><span>Aguardando revisão</span><strong>${escapeHTML(run.summary?.needsReview || 0)}</strong></div>
    ${run.error ? `<p class="callout">${escapeHTML(run.error)}</p>` : ''}
  </div>`;
  const plan = Array.isArray(run.plan) ? run.plan : [];
  $('#operator-plan').innerHTML = plan.length ? plan.map((item, index) => {
    const job = (run.generatedJobs || []).find(candidate => candidate.topic === item.topic);
    return `<article class="plan-card">
      <div class="meta-line">${index + 1} · ${escapeHTML(item.format)} · ${escapeHTML(item.length)} ${job ? `· ${statusChip(job.reviewStatus || job.status)}` : ''}</div>
      <strong>${escapeHTML(item.topic)}</strong>
      <p>${escapeHTML(item.angle || item.rationale)}</p>
    </article>`;
  }).join('') : empty('A pesquisa e o planejamento aparecerão aqui quando a execução começar.');
}

function populateSettings(profile = {}, settings = {}, providers = []) {
  const form = $('#profile-form');
  const mapping = {
    channelName: profile.channel_name,
    goal: profile.goal,
    targetAudience: profile.target_audience,
    brandVoice: profile.brand_voice,
    defaultStyle: profile.default_style,
    callToAction: profile.call_to_action,
    visualStyle: profile.visual_style,
    timezone: profile.timezone,
    bannedTopics: (profile.bannedTopics || []).join(', ')
  };
  for (const [name, value] of Object.entries(mapping)) {
    if (form.elements[name] && document.activeElement !== form.elements[name]) form.elements[name].value = value || '';
  }
  $('#approval-required').checked = settings.approval_required !== 'false';
  $('#notifications-enabled').checked = settings.notification_enabled !== 'false';
  const videoMapping = {
    videoProvider: settings.video_provider || 'slideshow',
    videoGenerationMode: settings.video_generation_mode || 'hybrid',
    videoClipDuration: settings.video_clip_duration || '8',
    videoMaxGeneratedSeconds: settings.video_max_generated_seconds || '60'
  };
  for (const [name, value] of Object.entries(videoMapping)) {
    if (form.elements[name] && document.activeElement !== form.elements[name]) form.elements[name].value = value;
  }
  const selected = providers.find(provider => provider.id === videoMapping.videoProvider);
  $('#video-provider-status').textContent = videoMapping.videoProvider === 'auto'
    ? `${providers.filter(provider => provider.available && provider.id !== 'slideshow').length} provedor(es) pago(s) disponível(is); o slideshow local continua como alternativa final.`
    : videoMapping.videoProvider === 'slideshow' ? 'O slideshow local com FFmpeg está selecionado; nenhuma credencial externa de vídeo é necessária.'
      : selected?.available ? `${label(selected.id)} está configurado (${selected.model}).` : `As credenciais de ${label(videoMapping.videoProvider)} não estão configuradas.`;
}

function switchView(view) {
  ui.currentView = view;
  $$('.nav-item').forEach(item => item.classList.toggle('active', item.dataset.view === view));
  $$('.view').forEach(item => item.classList.toggle('active', item.id === `${view}-view`));
  const titles = {
    overview: ['VISÃO GERAL DO OPERADOR', 'Saiba o que acontece a seguir.'],
    operator: ['OPERADOR AUTÔNOMO', 'Dê a estratégia ao Lumen.'],
    pipeline: ['OPERAÇÕES DE CONTEÚDO', 'Da ideia à publicação.'],
    calendar: ['PLANEJAMENTO EDITORIAL', 'Planeje antes de gerar.'],
    analytics: ['DESEMPENHO', 'Transforme resultados no próximo passo.'],
    engagement: ['ENGAJAMENTO DO PÚBLICO', 'Converse com quem está assistindo.'],
    readiness: ['PRONTIDÃO DE PRODUÇÃO', 'Verifique antes de a autonomia rodar.'],
    settings: ['DIRETRIZES DO CANAL', 'Faça cada agente soar como você.']
  };
  $('#view-eyebrow').textContent = titles[view][0];
  $('#view-title').textContent = titles[view][1];
  location.hash = view;
}

function selectOptions(options, selected) {
  return options.map(([value, label]) =>
    `<option value="${escapeHTML(value)}" ${value === selected ? 'selected' : ''}>${escapeHTML(label)}</option>`
  ).join('');
}

function renderSourceEditor(source = {}, disabled = false) {
  return `<article class="provenance-item" data-provenance-source data-id="${escapeHTML(source.id || '')}" data-published-at="${escapeHTML(source.publishedAt || '')}" data-accessed-at="${escapeHTML(source.accessedAt || '')}">
    <div class="provenance-item-heading"><strong>Fonte de pesquisa</strong><button type="button" class="text-button danger-text" data-remove-provenance ${disabled ? 'disabled' : ''}>Remover</button></div>
    <label><span>URL</span><input data-field="url" type="url" value="${escapeHTML(source.url || '')}" placeholder="https://..." required ${disabled ? 'disabled' : ''}></label>
    <div class="form-grid two">
      <label><span>Título</span><input data-field="title" value="${escapeHTML(source.title || '')}" maxlength="300" ${disabled ? 'disabled' : ''}></label>
      <label><span>Publicador</span><input data-field="publisher" value="${escapeHTML(source.publisher || '')}" maxlength="200" ${disabled ? 'disabled' : ''}></label>
      <label><span>Tipo</span><select data-field="sourceType" ${disabled ? 'disabled' : ''}>${selectOptions([
        ['official', 'Fonte oficial'], ['article', 'Artigo'], ['video', 'Vídeo'], ['dataset', 'Conjunto de dados'], ['asset', 'Recurso ou licença'], ['other', 'Outro']
      ], source.sourceType || 'other')}</select></label>
      <label><span>Status da revisão</span><select data-field="status" ${disabled ? 'disabled' : ''}>${selectOptions([
        ['pending', 'Revisão pendente'], ['verified', 'Verificada'], ['rejected', 'Rejeitada']
      ], source.status || 'pending')}</select></label>
    </div>
    <label><span>Notas de evidência</span><textarea data-field="notes" rows="2" maxlength="1000" ${disabled ? 'disabled' : ''}>${escapeHTML(source.notes || '')}</textarea></label>
    ${source.url ? `<a class="source-link" href="${escapeHTML(source.url)}" target="_blank" rel="noopener">Abrir fonte ↗</a>` : ''}
  </article>`;
}

function renderClaimEditor(claim = {}, sources = [], disabled = false) {
  const linked = new Set(claim.sourceIds || []);
  return `<article class="provenance-item ${claim.riskLevel === 'high' ? 'high-risk' : ''}" data-provenance-claim data-id="${escapeHTML(claim.id || '')}">
    <div class="provenance-item-heading"><strong>Afirmação factual</strong><button type="button" class="text-button danger-text" data-remove-provenance ${disabled ? 'disabled' : ''}>Remover</button></div>
    <label><span>Afirmação</span><textarea data-field="text" rows="3" maxlength="1000" required ${disabled ? 'disabled' : ''}>${escapeHTML(claim.text || '')}</textarea></label>
    <div class="form-grid two">
      <label><span>Risco</span><select data-field="riskLevel" ${disabled ? 'disabled' : ''}>${selectOptions([
        ['standard', 'Padrão'], ['high', 'Alto risco']
      ], claim.riskLevel || 'standard')}</select></label>
      <label><span>Resolução</span><select data-field="status" ${disabled ? 'disabled' : ''}>${selectOptions([
        ['pending', 'Pendente'], ['supported', 'Comprovada'], ['unsupported', 'Sem comprovação'], ['waived', 'Dispensada com nota']
      ], claim.status || 'pending')}</select></label>
    </div>
    <fieldset class="source-checklist" ${disabled ? 'disabled' : ''}><legend>Fontes de apoio</legend>
      ${sources.length ? sources.map(source => `<label><input type="checkbox" data-claim-source="${escapeHTML(source.id)}" ${linked.has(source.id) ? 'checked' : ''}> ${escapeHTML(source.title || source.url)}</label>`).join('') : '<small>Adicione uma fonte antes de marcar esta afirmação como comprovada.</small>'}
    </fieldset>
    <label><span>Notas do revisor</span><textarea data-field="notes" rows="2" maxlength="1000" placeholder="Obrigatório quando dispensada" ${disabled ? 'disabled' : ''}>${escapeHTML(claim.notes || '')}</textarea></label>
  </article>`;
}

function renderProvenanceEditor(provenance = {}, canReview = true) {
  const sources = provenance.sources || [];
  const claims = provenance.claims || [];
  const summary = provenance.summary || {};
  const statusLabel = provenance.status === 'verified' ? 'Evidências verificadas' : provenance.status === 'not_required' ? 'Nenhuma afirmação declarada' : `${summary.unresolvedClaims || 0} não resolvida${summary.unresolvedClaims === 1 ? '' : 's'}`;
  return `<section class="provenance-panel">
    <div class="panel-heading"><div><p class="eyebrow">PESQUISA E PROCEDÊNCIA</p><h3>Central de evidências</h3><p>Verifique as fontes, vincule cada afirmação factual e registre a divulgação antes da aprovação.</p></div><span class="status ${provenance.status === 'verified' || provenance.status === 'not_required' ? 'success' : 'warning'}">${escapeHTML(statusLabel)}</span></div>
    <div class="provenance-toolbar"><strong>Fontes</strong>${canReview ? '<button type="button" class="text-button" data-add-provenance-source>Adicionar fonte +</button>' : ''}</div>
    <div id="provenance-sources" class="provenance-list">${sources.map(source => renderSourceEditor(source, !canReview)).join('') || '<p class="empty-inline">Nenhuma fonte de pesquisa anexada.</p>'}</div>
    <div class="provenance-toolbar"><strong>Afirmações</strong>${canReview ? '<button type="button" class="text-button" data-add-provenance-claim>Adicionar afirmação +</button>' : ''}</div>
    <div id="provenance-claims" class="provenance-list">${claims.map(claim => renderClaimEditor(claim, sources, !canReview)).join('') || '<p class="empty-inline">Nenhuma afirmação verificável externamente declarada.</p>'}</div>
    <label class="toggle disclosure-toggle"><input id="contains-synthetic-media" type="checkbox" ${provenance.containsSyntheticMedia ? 'checked' : ''} ${canReview ? '' : 'disabled'}><span></span> Contém mídia realista alterada ou sintética que exige divulgação ao YouTube</label>
    ${canReview ? '<button type="button" class="button secondary" data-save-provenance>Salvar revisão de evidências</button>' : ''}
  </section>`;
}

const SEVERITY_LABELS_PT = { critical: 'crítico', error: 'erro', high: 'alto', warning: 'alerta', medium: 'médio', low: 'baixo', info: 'info' };

function severityLabel(value) {
  const raw = String(value ?? '');
  return SEVERITY_LABELS_PT[raw.toLowerCase()] ?? raw;
}

function renderDiscoverabilityPanel(item) {
  const audit = item.discoverability;
  const findings = audit?.findings || [];
  const state = !audit ? 'Não executado' : audit.status === 'unavailable' ? 'Indisponível' : `${findings.length} apontamento${findings.length === 1 ? '' : 's'}`;
  const stateClass = audit?.status === 'passed' || (audit && findings.length === 0) ? 'success' : 'warning';
  return `<section class="discoverability-panel">
    <div class="panel-heading discoverability-heading">
      <div><p class="eyebrow">PRÉ-VERIFICAÇÃO DE DESCOBERTA</p><h3>Revisão DarkzSEO</h3><p>Revise as orientações de GEO, AIO, AEO e busca na web para este pacote de conteúdo. Os apontamentos são consultivos e nunca reescrevem nem publicam conteúdo.</p></div>
      <div class="discoverability-actions"><span class="status ${stateClass}">${escapeHTML(state)}</span><button type="button" class="button secondary small" data-discoverability-run="${escapeHTML(item.id)}">${audit ? 'Executar novamente' : 'Executar auditoria'}</button></div>
    </div>
    ${audit?.error ? `<p class="callout">Não foi possível executar o DarkzSEO${audit.errorCode || audit.error_code ? ` (${escapeHTML(audit.errorCode || audit.error_code)})` : ''}: ${escapeHTML(audit.error)}</p>` : ''}
    ${findings.length ? `<div class="discoverability-findings">${findings.map(finding => {
      const reviewStatus = finding.reviewStatus || finding.review_status || 'pending';
      return `<article class="discoverability-finding severity-${escapeHTML(String(finding.severity || 'info').toLowerCase())}" data-discoverability-finding="${escapeHTML(finding.id)}">
        <div class="discoverability-finding-heading"><span class="severity-badge">${escapeHTML(severityLabel(finding.severity))}</span><strong>${escapeHTML(finding.ruleId || finding.rule_id)}</strong><span class="review-state ${escapeHTML(reviewStatus)}">${escapeHTML(label(reviewStatus))}</span></div>
        <p>${escapeHTML(finding.message)}</p>
        ${finding.remediation ? `<small>${escapeHTML(finding.remediation)}</small>` : ''}
        ${finding.reviewReason || finding.review_reason ? `<small>Nota do revisor: ${escapeHTML(finding.reviewReason || finding.review_reason)}</small>` : ''}
        <div class="discoverability-review-actions"><button type="button" class="text-button approve" data-discoverability-accept ${reviewStatus === 'accepted' ? 'disabled' : ''}>Manter como acionável</button><button type="button" class="text-button" data-discoverability-dismiss ${reviewStatus === 'dismissed' ? 'disabled' : ''}>Descartar falso positivo</button></div>
      </article>`;
    }).join('')}</div>` : audit && audit.status !== 'unavailable' ? '<p class="empty-inline">Nenhum apontamento de descoberta. O pacote de conteúdo passou nas verificações consultivas configuradas.</p>' : '<p class="empty-inline">Execute o DarkzSEO para criar uma auditoria versionada e revisável desta produção.</p>'}
  </section>`;
}

function renderSceneEditor(item, canReview = true) {
  const scenes = item.scenes || [];
  if (!scenes.length) return '';
  const verifiedSources = (item.provenance?.sources || []).filter(source => source.status === 'verified');
  const audio = item.assets?.audio || {};
  const intentionalSilence = audio.intentionalSilence === true;
  const narrationIssues = scenes.filter(scene => !['current', 'intentional_silence'].includes(scene.narrationStatus)).length;
  return `<section class="scene-repair-panel">
    <div class="panel-heading scene-heading">
      <div><p class="eyebrow">ESTÚDIO DE REPARO DE CENAS</p><h3>Repare a linha do tempo, não o vídeo inteiro</h3><p>Edite, substitua ou regenere uma cena. As alterações ficam como rascunho até a linha do tempo ser reconstruída e aprovada.</p></div>
      ${canReview ? `<button type="button" class="button primary small" data-rebuild-scenes="${escapeHTML(item.id)}">Reconstruir vídeo final</button>` : ''}
    </div>
    <div class="narration-recovery ${intentionalSilence ? 'intentional' : narrationIssues ? 'attention' : ''}">
      <div><p class="eyebrow">CONFIABILIDADE DA NARRAÇÃO</p><strong>${intentionalSilence ? 'Silêncio intencional confirmado' : narrationIssues ? `${narrationIssues} cena${narrationIssues === 1 ? ' precisa' : 's precisam'} de narração` : 'As evidências de narração estão atualizadas'}</strong>
      <p>${intentionalSilence ? escapeHTML(audio.silenceReason || '') : audio.error ? escapeHTML(audio.error) : 'Regenere a narração sem substituir o visual da cena. A aprovação fica bloqueada até o áudio estar pronto.'}</p>
      ${audio.provider ? `<span class="narration-evidence">${escapeHTML(audio.provider)}${audio.model ? ` · ${escapeHTML(audio.model)}` : ''}${audio.externalTaskId ? ` · tarefa ${escapeHTML(audio.externalTaskId)}` : ''}</span>` : ''}</div>
      ${canReview ? intentionalSilence
        ? '<button type="button" class="button secondary small" data-require-narration>Exigir narração</button>'
        : '<button type="button" class="button secondary small" data-intentional-silence>Usar silêncio intencional</button>' : ''}
    </div>
    <div class="scene-summary"><strong>${scenes.length} cena${scenes.length === 1 ? '' : 's'}</strong><span>linha do tempo de ${Math.round(scenes.reduce((sum, scene) => sum + Number(scene.duration || 0), 0))}s</span><span>${scenes.filter(scene => scene.status !== 'ready').length} reparo(s) pendente(s)</span></div>
    <div class="scene-list">
      ${scenes.map((scene, index) => {
        const disabled = !canReview || scene.locked;
        const sourceIds = new Set(scene.provenanceSourceIds || []);
        const preview = scene.assetUrl
          ? scene.assetType === 'video'
            ? `<video controls preload="metadata"><source src="${escapeHTML(scene.assetUrl)}"></video>`
            : `<img src="${escapeHTML(scene.assetUrl)}" alt="Recurso da cena ${escapeHTML(scene.label)}">`
          : '<div class="preview-placeholder">Nenhum recurso de cena</div>';
        return `<article class="scene-card ${scene.locked ? 'locked' : ''}" data-scene-card="${escapeHTML(scene.id)}">
          <div class="scene-card-top">
            <div class="scene-preview">${preview}<span class="scene-number">${index + 1}</span></div>
            <div class="scene-identity">
              <div class="scene-status-row">${statusChip(scene.status)} ${statusChip(`narration_${scene.narrationStatus || 'unavailable'}`)}<span>r${scene.revision}</span></div>
              <label><span>Nome da cena</span><input data-scene-field="label" maxlength="120" value="${escapeHTML(scene.label)}" ${disabled ? 'disabled' : ''}></label>
              <label><span>Duração</span><input data-scene-field="duration" type="number" min="2" max="600" step="0.5" value="${escapeHTML(scene.duration)}" ${disabled ? 'disabled' : ''}></label>
            </div>
          </div>
          <label><span>Narração</span><textarea data-scene-field="scriptText" rows="4" maxlength="10000" ${disabled ? 'disabled' : ''}>${escapeHTML(scene.scriptText)}</textarea></label>
          <label><span>Prompt visual</span><textarea data-scene-field="prompt" rows="3" maxlength="2000" ${disabled ? 'disabled' : ''}>${escapeHTML(scene.prompt)}</textarea></label>
          ${verifiedSources.length ? `<fieldset class="source-checklist scene-sources" ${disabled ? 'disabled' : ''}><legend>Evidências verificadas vinculadas a esta narração</legend>${verifiedSources.map(source => `<label><input type="checkbox" data-scene-source value="${escapeHTML(source.id)}" ${sourceIds.has(source.id) ? 'checked' : ''}> ${escapeHTML(source.title)}</label>`).join('')}</fieldset>` : ''}
          <div class="scene-options">
            <label class="toggle"><input type="checkbox" data-scene-factual checked ${disabled ? 'disabled' : ''}><span></span> As alterações na narração podem conter afirmações factuais</label>
            <span>Visual: ${escapeHTML(scene.provider || 'local')} ${scene.model ? `· ${escapeHTML(scene.model)}` : ''}</span>
          </div>
          <div class="scene-narration-evidence"><span>Narração: ${escapeHTML(scene.narrationProvider || 'não gerada')}${scene.narrationModel ? ` · ${escapeHTML(scene.narrationModel)}` : ''}${scene.narrationTaskId ? ` · tarefa ${escapeHTML(scene.narrationTaskId)}` : ''}</span>${scene.narrationError ? `<span class="danger-text">${escapeHTML(scene.narrationError)}</span>` : ''}</div>
          ${canReview ? `<div class="scene-actions">
            <button type="button" class="text-button" data-scene-move="up" ${disabled || index === 0 ? 'disabled' : ''}>↑ Antes</button>
            <button type="button" class="text-button" data-scene-move="down" ${disabled || index === scenes.length - 1 ? 'disabled' : ''}>↓ Depois</button>
            <button type="button" class="text-button approve" data-scene-save ${disabled ? 'disabled' : ''}>Salvar cena</button>
            <button type="button" class="text-button" data-scene-narration ${disabled ? 'disabled' : ''}>Regenerar só a narração</button>
            <button type="button" class="text-button" data-scene-regenerate ${disabled ? 'disabled' : ''}>Regenerar cena</button>
            <label class="text-button upload-button ${disabled ? 'disabled' : ''}">Substituir recurso<input type="file" data-scene-upload accept="image/png,image/jpeg,image/webp,video/mp4" ${disabled ? 'disabled' : ''}></label>
            <button type="button" class="text-button" data-scene-lock>${scene.locked ? 'Desbloquear' : 'Bloquear'}</button>
          </div>` : ''}
        </article>`;
      }).join('')}
    </div>
  </section>`;
}

function renderShortsStudio(item) {
  if (!item.assets?.finalVideo?.path || item.assets.finalVideo.simulated) return '';
  const clips = item.shorts || [];
  const parentApproved = item.review_status === 'approved';
  return `<section class="shorts-studio">
    <div class="panel-heading shorts-heading">
      <div><p class="eyebrow">ESTÚDIO DE REAPROVEITAMENTO PARA SHORTS</p><h3>Transforme uma produção em alcance vertical</h3><p>Crie trechos locais em 9:16 com legendas para celular. Os rascunhos herdam as evidências da produção original e ainda exigem aprovação separada.</p></div>
      <button type="button" class="button secondary small" data-propose-shorts="${escapeHTML(item.id)}">${clips.length ? 'Atualizar rascunhos' : 'Criar 3 rascunhos de Shorts'}</button>
    </div>
    <div class="shorts-evidence ${parentApproved ? 'ready' : ''}">
      <span>${parentApproved ? '✓ Produção original aprovada' : 'A aprovação da produção original é necessária antes de agendar'}</span>
      <span>${escapeHTML(item.provenance?.status === 'verified' ? 'Evidências verificadas' : item.provenance?.status === 'not_required' ? 'Nenhuma afirmação factual declarada' : 'Revisão de evidências incompleta')}</span>
      <span>Renderização local · sem nova chamada a provedor</span>
    </div>
    ${clips.length ? `<div class="shorts-grid">${clips.map(clip => {
      const locked = ['scheduled', 'uploading', 'published', 'reconciliation_required'].includes(clip.status);
      const rendered = Boolean(clip.assetUrls?.video);
      return `<article class="short-card" data-short-card="${escapeHTML(clip.id)}">
        <div class="short-preview">${rendered
          ? `<video controls preload="metadata"><source src="${escapeHTML(clip.assetUrls.video)}" type="video/mp4"></video>`
          : `<div class="short-placeholder"><strong>9:16</strong><span>layout ${escapeHTML(label(clip.layout))}</span></div>`}</div>
        <div class="short-editor">
          <div class="scene-status-row">${statusChip(clip.status)}<span>${Number(clip.duration || 0).toFixed(0)}s</span><span>${escapeHTML((clip.sourceSceneLabels || []).join(' + '))}</span></div>
          <label><span>Título do Short</span><input data-short-field="title" maxlength="100" value="${escapeHTML(clip.title)}" ${locked ? 'disabled' : ''}></label>
          <label><span>Descrição e CTA para o vídeo original</span><textarea data-short-field="description" rows="3" maxlength="5000" ${locked ? 'disabled' : ''}>${escapeHTML(clip.description)}</textarea></label>
          <label><span>Tags</span><input data-short-field="tags" value="${escapeHTML((clip.tags || []).join(', '))}" ${locked ? 'disabled' : ''}></label>
          <div class="form-grid two">
            <label><span>Layout vertical</span><select data-short-field="layout" ${locked ? 'disabled' : ''}><option value="blur" ${clip.layout === 'blur' ? 'selected' : ''}>Fundo desfocado</option><option value="crop" ${clip.layout === 'crop' ? 'selected' : ''}>Recorte central</option><option value="stacked" ${clip.layout === 'stacked' ? 'selected' : ''}>Foco empilhado</option></select></label>
            <label><span>Horário de publicação</span><input data-short-field="publishTime" type="datetime-local" value="${toLocalInput(clip.publishTime)}" ${locked ? 'disabled' : ''}></label>
            <label><span>Privacidade</span><select data-short-field="privacyStatus" ${locked ? 'disabled' : ''}><option value="private" ${clip.privacyStatus === 'private' ? 'selected' : ''}>Privado</option><option value="unlisted" ${clip.privacyStatus === 'unlisted' ? 'selected' : ''}>Não listado</option><option value="public" ${clip.privacyStatus === 'public' ? 'selected' : ''}>Público</option></select></label>
          </div>
          <p class="short-rationale">${escapeHTML(clip.rationale || '')}${clip.error ? `<br><span class="danger-text">${escapeHTML(clip.error)}</span>` : ''}</p>
          ${clip.youtubeUrl ? `<a class="source-link" href="${escapeHTML(clip.youtubeUrl)}" target="_blank" rel="noopener">Abrir Short publicado ↗</a>` : ''}
          ${!locked ? `<div class="short-actions"><button type="button" class="text-button" data-short-save>Salvar rascunho</button><button type="button" class="button secondary small" data-short-render>${rendered ? 'Renderizar novamente' : 'Renderizar 9:16'}</button><button type="button" class="button primary small" data-short-approve ${!parentApproved || clip.status !== 'rendered' ? 'disabled' : ''} title="${!parentApproved ? 'Aprove primeiro a produção original' : clip.status !== 'rendered' ? 'Renderize este Short primeiro' : 'Confirme e agende este Short'}">Aprovar e agendar</button></div>` : ''}
        </div>
      </article>`;
    }).join('')}</div>` : '<p class="empty-inline">Nenhum rascunho de Short ainda. Crie três candidatos a partir da linha do tempo de cenas atual, sem chamar um provedor pago.</p>'}
  </section>`;
}

async function openContent(productionId) {
  $('#loading').classList.add('active');
  try {
    const item = await api(`/api/content/${encodeURIComponent(productionId)}`);
    const data = item.editorData || {};
    const title = data.title || item.seo?.title || item.script?.title || item.strategy?.topic || 'Conteúdo sem título';
    const description = data.description || item.seo?.description || '';
    const tags = data.tags || item.seo?.tags || [];
    const publishTime = item.schedule?.publish_time || data.publishTime || item.scheduled_publish_time;
    const canReview = !['published'].includes(item.schedule?.status);
    const experiment = data.packagingExperiment;
    const selectedTitleVariant = Number(data.selectedTitleVariant || 0);
    const selectedThumbnailVariant = Number(data.selectedThumbnailVariant || 0);
    $('#content-detail').innerHTML = `
      <div class="dialog-heading"><div><p class="eyebrow">REVISÃO DE CONTEÚDO</p><h2>${escapeHTML(title)}</h2><div class="meta-line">${statusChip(item.schedule?.status || item.review_status || item.status)} · Qualidade ${qualityScore(item.qualityChecks)}%</div></div><button type="button" class="close-button" data-close>×</button></div>
      <form id="content-review-form" class="editor content-review-editor">
        <div class="content-layout">
          <div>
            <div class="preview">${item.assetUrls.video ? `<video controls preload="metadata" poster="${item.assetUrls.thumbnail || ''}"><source src="${item.assetUrls.video}" type="video/mp4"></video>` : item.assetUrls.thumbnail ? `<img src="${item.assetUrls.thumbnail}" alt="Thumbnail gerada">` : '<div class="preview-placeholder">Nenhuma prévia reproduzível foi gerada.</div>'}</div>
            <div class="quality-grid">${(item.qualityChecks || []).map(check => `<div class="quality-check ${check.passed ? 'pass' : 'fail'}">${check.passed ? '✓' : '×'} ${escapeHTML(check.message)}</div>`).join('') || '<div class="quality-check">Nenhum resultado de qualidade registrado.</div>'}</div>
            ${item.review_notes ? `<p class="callout">${escapeHTML(item.review_notes)}</p>` : ''}
          </div>
          <div class="editor">
            <label><span>Título</span><input name="title" maxlength="100" value="${escapeHTML(title)}" required></label>
            <label><span>Descrição</span><textarea name="description" rows="7">${escapeHTML(description)}</textarea></label>
            <label><span>Tags</span><input name="tags" value="${escapeHTML(tags.join(', '))}"></label>
            ${experiment ? `<section class="experiment-panel">
              <div><p class="eyebrow">EXPERIMENTO DE APRENDIZADO APROVADO</p><strong>${escapeHTML(experiment.hypothesis)}</strong><p>Escolha a embalagem a ser usada. Nada muda no YouTube até este conteúdo ser aprovado e publicado.</p></div>
              <label><span>Variante de título</span><select name="selectedTitleVariant">${experiment.titleVariants.map((variant, index) => `<option value="${index}" data-title="${escapeHTML(variant.title)}" ${index === selectedTitleVariant ? 'selected' : ''}>${escapeHTML(variant.label)} — ${escapeHTML(variant.title)}</option>`).join('')}</select></label>
              <div class="experiment-thumbnails">${experiment.thumbnailVariants.map((variant, index) => `<label class="experiment-thumb ${index === selectedThumbnailVariant ? 'selected' : ''}"><input type="radio" name="selectedThumbnailVariant" value="${index}" ${index === selectedThumbnailVariant ? 'checked' : ''}><img src="${escapeHTML(item.assetUrls.experimentThumbnails?.[index] || '')}" alt="Variante de thumbnail ${escapeHTML(variant.label)}"><span>${escapeHTML(variant.label)}</span></label>`).join('')}</div>
            </section>` : ''}
          </div>
        </div>
        ${renderSceneEditor(item, canReview)}
        ${renderShortsStudio(item)}
        ${renderDiscoverabilityPanel(item)}
        ${renderProvenanceEditor(item.provenance, canReview)}
          <div class="form-grid two">
            <label><span>Horário de publicação</span><input name="publishTime" type="datetime-local" value="${toLocalInput(publishTime)}"></label>
            <label><span>Privacidade</span><select name="privacyStatus"><option value="private" ${data.privacyStatus === 'private' ? 'selected' : ''}>Privado</option><option value="unlisted" ${data.privacyStatus === 'unlisted' ? 'selected' : ''}>Não listado</option><option value="public" ${data.privacyStatus === 'public' ? 'selected' : ''}>Público</option></select></label>
          </div>
          <div class="settings-row">
            <label class="toggle"><input name="factChecked" type="checkbox" ${data.factChecked ? 'checked' : ''}><span></span> Fatos e afirmações revisados</label>
            <label class="toggle"><input name="rightsConfirmed" type="checkbox" ${data.rightsConfirmed ? 'checked' : ''}><span></span> Direitos de mídia confirmados</label>
          </div>
          ${item.schedule && !['published', 'uploading', 'uploaded', 'reconciliation_required'].includes(item.schedule.status) ? `<div class="form-actions"><button type="button" class="button secondary" data-reschedule-content="${escapeHTML(item.id)}">Reagendar</button><button type="button" class="button primary" data-publish-now-content="${escapeHTML(item.id)}">Publicar agora</button><button type="button" class="button danger" data-delete-schedule="${escapeHTML(item.id)}">Excluir agendamento</button></div>` : ''}
          ${canReview ? `<div class="form-actions"><button type="button" class="button primary" data-approve-content="${escapeHTML(item.id)}">Aprovar e agendar</button><button type="button" class="button secondary" data-save-content="${escapeHTML(item.id)}">Salvar rascunho</button><button type="button" class="button danger" data-reject-content="${escapeHTML(item.id)}">Rejeitar</button><button type="button" class="button ghost" data-retry-content="${escapeHTML(item.id)}">Regenerar</button></div>` : `<a class="button secondary" href="${escapeHTML(item.schedule?.youtube_url || '#')}" target="_blank" rel="noopener">Abrir no YouTube</a>`}
      </form>`;
    $('#content-review-form').dataset.productionId = item.id;
    $('#content-dialog').showModal();
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    $('#loading').classList.remove('active');
  }
}

function toLocalInput(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset() * 60000;
  return escapeHTML(new Date(date.getTime() - offset).toISOString().slice(0, 16));
}

function contentFormData() {
  const form = $('#content-review-form');
  const values = Object.fromEntries(new FormData(form));
  return {
    title: values.title,
    description: values.description,
    tags: values.tags,
    publishTime: values.publishTime ? new Date(values.publishTime).toISOString() : undefined,
    privacyStatus: values.privacyStatus,
    selectedTitleVariant: values.selectedTitleVariant,
    selectedThumbnailVariant: values.selectedThumbnailVariant,
    factChecked: form.elements.factChecked?.checked || false,
    rightsConfirmed: form.elements.rightsConfirmed?.checked || false
  };
}

function sceneFormData(card) {
  return {
    label: card.querySelector('[data-scene-field="label"]').value,
    duration: Number(card.querySelector('[data-scene-field="duration"]').value),
    scriptText: card.querySelector('[data-scene-field="scriptText"]').value,
    prompt: card.querySelector('[data-scene-field="prompt"]').value,
    provenanceSourceIds: Array.from(card.querySelectorAll('[data-scene-source]:checked')).map(input => input.value),
    factualChange: card.querySelector('[data-scene-factual]')?.checked !== false
  };
}

function shortFormData(card) {
  const publishTime = card.querySelector('[data-short-field="publishTime"]')?.value;
  return {
    title: card.querySelector('[data-short-field="title"]')?.value,
    description: card.querySelector('[data-short-field="description"]')?.value,
    tags: card.querySelector('[data-short-field="tags"]')?.value,
    layout: card.querySelector('[data-short-field="layout"]')?.value,
    publishTime: publishTime ? new Date(publishTime).toISOString() : undefined,
    privacyStatus: card.querySelector('[data-short-field="privacyStatus"]')?.value
  };
}

async function refreshContentDialog(productionId, message) {
  if (message) showToast(message);
  if ($('#content-dialog').open) $('#content-dialog').close();
  await refreshDashboard(true);
  await openContent(productionId);
}

async function uploadSceneAsset(productionId, sceneId, file) {
  if (!confirm('Confirme que você é dono deste recurso substituto ou tem permissão para usá-lo.')) return;
  const synthetic = confirm('Este recurso substituto contém mídia realista alterada ou sintética que deve ser divulgada ao YouTube?');
  $('#loading').classList.add('active');
  try {
    await api(`/api/content/${encodeURIComponent(productionId)}/scenes/${encodeURIComponent(sceneId)}/asset`, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type,
        'x-file-name': file.name,
        'x-rights-confirmed': 'true',
        'x-synthetic-media': String(synthetic)
      }
    });
    await refreshContentDialog(productionId, 'Recurso da cena substituído. Reconstrua antes de aprovar.');
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    $('#loading').classList.remove('active');
  }
}

function provenanceFormData() {
  const sources = $$('[data-provenance-source]').map(item => ({
    id: item.dataset.id,
    url: item.querySelector('[data-field="url"]').value,
    title: item.querySelector('[data-field="title"]').value,
    publisher: item.querySelector('[data-field="publisher"]').value,
    sourceType: item.querySelector('[data-field="sourceType"]').value,
    status: item.querySelector('[data-field="status"]').value,
    notes: item.querySelector('[data-field="notes"]').value,
    publishedAt: item.dataset.publishedAt || null,
    accessedAt: item.dataset.accessedAt || null
  }));
  const claims = $$('[data-provenance-claim]').map(item => ({
    id: item.dataset.id,
    text: item.querySelector('[data-field="text"]').value,
    riskLevel: item.querySelector('[data-field="riskLevel"]').value,
    status: item.querySelector('[data-field="status"]').value,
    notes: item.querySelector('[data-field="notes"]').value,
    sourceIds: [...item.querySelectorAll('[data-claim-source]:checked')].map(input => input.dataset.claimSource)
  }));
  return {
    sources,
    claims,
    containsSyntheticMedia: $('#contains-synthetic-media')?.checked || false
  };
}

function clientId(prefix) {
  const uuid = globalThis.crypto?.randomUUID?.() || `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  return `${prefix}_${uuid}`;
}

function currentSourceOptions() {
  return $$('[data-provenance-source]').map(item => ({
    id: item.dataset.id,
    title: item.querySelector('[data-field="title"]').value || item.querySelector('[data-field="url"]').value || 'Nova fonte'
  }));
}

async function persistProvenance(productionId, successMessage = null) {
  $('#loading').classList.add('active');
  try {
    const result = await api(`/api/content/${encodeURIComponent(productionId)}/provenance`, {
      method: 'PUT',
      body: JSON.stringify(provenanceFormData())
    });
    if (successMessage) {
      showToast(successMessage);
      $('#content-dialog').close();
      await openContent(productionId);
    }
    return result;
  } catch (error) {
    showToast(error.message, 'error');
    throw error;
  } finally {
    $('#loading').classList.remove('active');
  }
}

async function mutate(url, method, body, successMessage) {
  $('#loading').classList.add('active');
  try {
    const result = await api(url, { method, body: body === undefined ? undefined : JSON.stringify(body) });
    showToast(successMessage);
    await refreshDashboard(true);
    return result;
  } catch (error) {
    const failures = error.data?.quality?.blockingFailures;
    showToast(failures ? `${error.message}: ${failures.join(', ')}` : error.message, 'error');
    throw error;
  } finally {
    $('#loading').classList.remove('active');
  }
}

document.addEventListener('click', async event => {
  const nav = event.target.closest('[data-view]');
  if (nav) return switchView(nav.dataset.view);
  const go = event.target.closest('[data-go]');
  if (go) return switchView(go.dataset.go);
  if (event.target.closest('[data-close]')) return event.target.closest('dialog').close();

  const open = event.target.closest('[data-open-content]');
  if (open) return openContent(open.dataset.openContent);

  const cancel = event.target.closest('[data-cancel-job]');
  if (cancel && confirm('Cancelar esta geração após a etapa atual?')) {
    await mutate(`/api/jobs/${encodeURIComponent(cancel.dataset.cancelJob)}/cancel`, 'POST', {}, 'Cancelamento solicitado.').catch(() => {});
  }

  const idea = event.target.closest('[data-generate-idea]');
  if (idea) {
    await mutate(`/api/ideas/${encodeURIComponent(idea.dataset.generateIdea)}/generate`, 'POST', { length: 'medium' }, 'Ideia adicionada à fila de geração.').catch(() => {});
  }

  const resume = event.target.closest('[data-resume-job]');
  if (resume) {
    const jobId = resume.dataset.resumeJob;
    const select = $$('[data-resume-stage-for]').find(item => item.dataset.resumeStageFor === jobId);
    const stage = select?.value;
    if (confirm(`Retomar esta geração a partir de ${label(stage)}? Os checkpoints posteriores serão regenerados.`)) {
      await mutate(`/api/jobs/${encodeURIComponent(jobId)}/resume`, 'POST', { stage }, `Geração retomada a partir de ${label(stage)}.`).catch(() => {});
    }
  }

  const learning = event.target.closest('[data-learning-action]');
  if (learning) {
    const action = learning.dataset.learningAction;
    const id = learning.dataset.learningId;
    const message = action === 'approve'
      ? 'Aprendizado aprovado para futuros planos autônomos.'
      : 'Aprendizado rejeitado e excluído dos planos futuros.';
    await mutate(`/api/learning/recommendations/${encodeURIComponent(id)}/${action}`, 'POST', {}, message).catch(() => {});
  }

  const experiment = event.target.closest('[data-experiment-action]');
  if (experiment) {
    const action = experiment.dataset.experimentAction;
    const id = experiment.dataset.experimentId;
    const prompts = {
      approve: 'Aprovar este plano de experimento completo? Isso ainda não altera nada no YouTube.',
      start: 'Iniciar este teste ao vivo? O Lumen alternará apenas as variantes aprovadas e restaurará o controle antes de pedir que você adote um vencedor.',
      adopt: 'Adotar no YouTube o vencedor comprovado por evidências e aprovar o aprendizado dele para planos futuros?',
      cancel: 'Cancelar este experimento e restaurar o título e a thumbnail de controle?'
    };
    if (prompts[action] && !confirm(prompts[action])) return;
    const messages = {
      approve: 'Plano de experimento aprovado.',
      start: 'Experimento controlado iniciado.',
      refresh: 'Evidências do experimento atualizadas.',
      adopt: 'Vencedor adotado e aprovado para planejamentos futuros.',
      cancel: 'Experimento cancelado e controle restaurado.'
    };
    await mutate(`/api/experiments/${encodeURIComponent(id)}/${action}`, 'POST', prompts[action] ? { confirmed: true } : {}, messages[action]).catch(() => {});
  }

  const refreshRetention = event.target.closest('#refresh-retention-button');
  if (refreshRetention?.dataset.videoId) {
    refreshRetention.disabled = true;
    try {
      await api(`/api/retention/${encodeURIComponent(refreshRetention.dataset.videoId)}/refresh`, {
        method: 'POST',
        body: JSON.stringify({ measurementWindow: refreshRetention.dataset.measurementWindow || 'rolling' })
      });
      showToast('Curva de retenção atualizada a partir do YouTube Analytics.');
      await refreshDashboard(true);
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      refreshRetention.disabled = false;
    }
  }

  const syncEngagement = event.target.closest('#engagement-sync-button');
  if (syncEngagement?.dataset.videoId) {
    syncEngagement.disabled = true;
    try {
      await mutate(`/api/engagement/${encodeURIComponent(syncEngagement.dataset.videoId)}/sync`, 'POST', { analyze: true }, 'Comentários sincronizados do YouTube.');
      ui.engagementDetail = null;
      renderEngagement(ui.state?.engagement || {});
    } catch (_error) { /* toast shown */ } finally {
      syncEngagement.disabled = false;
    }
  }

  const draftEngagement = event.target.closest('#engagement-draft-button');
  if (draftEngagement?.dataset.videoId) {
    draftEngagement.disabled = true;
    try {
      await mutate(`/api/engagement/${encodeURIComponent(draftEngagement.dataset.videoId)}/draft-replies`, 'POST', {}, 'Rascunhos de respostas criados para revisão.');
      ui.engagementDetail = null;
      renderEngagement(ui.state?.engagement || {});
    } catch (_error) { /* toast shown */ } finally {
      draftEngagement.disabled = false;
    }
  }

  const replySave = event.target.closest('[data-reply-save]');
  if (replySave) {
    const card = replySave.closest('[data-reply-card]');
    const text = card?.querySelector('[data-reply-text]')?.value || '';
    await mutate(`/api/engagement/replies/${encodeURIComponent(replySave.dataset.replySave)}`, 'PATCH', { editedText: text }, 'Rascunho de resposta atualizado.').catch(() => {});
    ui.engagementDetail = null;
    renderEngagement(ui.state?.engagement || {});
  }

  const replyDiscard = event.target.closest('[data-reply-discard]');
  if (replyDiscard) {
    await mutate(`/api/engagement/replies/${encodeURIComponent(replyDiscard.dataset.replyDiscard)}`, 'PATCH', { discard: true }, 'Rascunho de resposta descartado.').catch(() => {});
    ui.engagementDetail = null;
    renderEngagement(ui.state?.engagement || {});
  }

  const replyApprove = event.target.closest('[data-reply-approve]');
  if (replyApprove) {
    const card = replyApprove.closest('[data-reply-card]');
    const text = card?.querySelector('[data-reply-text]')?.value || '';
    if (!text.trim()) return showToast('O texto da resposta está vazio.', 'error');
    if (confirm(`Publicar esta resposta no YouTube?\n\n${text}`)) {
      await mutate(`/api/engagement/replies/${encodeURIComponent(replyApprove.dataset.replyApprove)}/approve`, 'POST', { confirmed: true, editedText: text }, 'Resposta publicada no YouTube.').catch(() => {});
      ui.engagementDetail = null;
      renderEngagement(ui.state?.engagement || {});
    }
  }

  const proposeShorts = event.target.closest('[data-propose-shorts]');
  if (proposeShorts) {
    const productionId = proposeShorts.dataset.proposeShorts;
    const replacing = Boolean(document.querySelector('[data-short-card]'));
    if (replacing && !confirm('Substituir os rascunhos editáveis de Shorts atuais? Os arquivos já renderizados continuarão no disco, mas o manifesto será substituído.')) return;
    try {
      await api(`/api/content/${encodeURIComponent(productionId)}/shorts/propose`, {
        method: 'POST', body: JSON.stringify({ count: 3, replace: replacing })
      });
      await refreshContentDialog(productionId, 'Três rascunhos locais de Shorts criados a partir da linha do tempo de cenas atual.');
    } catch (error) {
      showToast(error.message, 'error');
    }
    return;
  }

  const discoverabilityRun = event.target.closest('[data-discoverability-run]');
  if (discoverabilityRun) {
    const productionId = discoverabilityRun.dataset.discoverabilityRun;
    try {
      await api(`/api/content/${encodeURIComponent(productionId)}/discoverability/run`, {
        method: 'POST', body: JSON.stringify({ platform: 'youtube' })
      });
      await refreshContentDialog(productionId, 'Pré-verificação de descoberta atualizada. Os apontamentos continuam consultivos até serem revisados.');
    } catch (error) {
      showToast(error.message, 'error');
    }
    return;
  }

  const discoverabilityReview = event.target.closest('[data-discoverability-accept], [data-discoverability-dismiss]');
  if (discoverabilityReview) {
    const card = discoverabilityReview.closest('[data-discoverability-finding]');
    const productionId = $('#content-review-form')?.dataset.productionId;
    if (!card || !productionId) return;
    const status = discoverabilityReview.matches('[data-discoverability-dismiss]') ? 'dismissed' : 'accepted';
    const reason = status === 'dismissed'
      ? (prompt('Por que este apontamento é um falso positivo? O motivo será mantido em futuras auditorias correspondentes.') || '')
      : '';
    if (status === 'dismissed' && !reason) return;
    try {
      await api(`/api/discoverability/findings/${encodeURIComponent(card.dataset.discoverabilityFinding)}`, {
        method: 'PATCH', body: JSON.stringify({ status, reason })
      });
      await refreshContentDialog(productionId, status === 'dismissed' ? 'Apontamento descartado com a justificativa do revisor.' : 'Apontamento mantido como recomendação acionável.');
    } catch (error) {
      showToast(error.message, 'error');
    }
    return;
  }

  const shortAction = event.target.closest('[data-short-save], [data-short-render], [data-short-approve]');
  if (shortAction) {
    const card = shortAction.closest('[data-short-card]');
    const productionId = $('#content-review-form')?.dataset.productionId;
    const clipId = card?.dataset.shortCard;
    if (!productionId || !clipId) return;
    try {
      const values = shortFormData(card);
      await api(`/api/content/${encodeURIComponent(productionId)}/shorts/${encodeURIComponent(clipId)}`, {
        method: 'PATCH', body: JSON.stringify(values)
      });
      if (shortAction.matches('[data-short-save]')) {
        await refreshContentDialog(productionId, 'Rascunho do Short salvo.');
        return;
      }
      if (shortAction.matches('[data-short-render]')) {
        await api(`/api/content/${encodeURIComponent(productionId)}/shorts/${encodeURIComponent(clipId)}/render`, {
          method: 'POST', body: '{}'
        });
        await refreshContentDialog(productionId, 'Short vertical renderizado localmente com legendas para celular.');
        return;
      }
      if (!confirm('Confirmar as evidências herdadas, os direitos de mídia, a privacidade e o horário de publicação deste Short?')) return;
      await api(`/api/content/${encodeURIComponent(productionId)}/shorts/${encodeURIComponent(clipId)}/approve`, {
        method: 'POST', body: JSON.stringify({ ...values, confirmed: true })
      });
      await refreshContentDialog(productionId, 'Short aprovado e adicionado à agenda de publicação.');
    } catch (error) {
      showToast(error.message, 'error');
    }
    return;
  }

  const sceneButton = event.target.closest('[data-scene-save], [data-scene-narration], [data-scene-regenerate], [data-scene-lock], [data-scene-move]');
  if (sceneButton) {
    const card = sceneButton.closest('[data-scene-card]');
    const productionId = $('#content-review-form')?.dataset.productionId;
    const sceneId = card?.dataset.sceneCard;
    if (!productionId || !sceneId) return;
    try {
      if (sceneButton.matches('[data-scene-lock]')) {
        await api(`/api/content/${encodeURIComponent(productionId)}/scenes/${encodeURIComponent(sceneId)}`, {
          method: 'PATCH', body: JSON.stringify({ locked: !card.classList.contains('locked') })
        });
        await refreshContentDialog(productionId, card.classList.contains('locked') ? 'Cena desbloqueada.' : 'Cena bloqueada.');
        return;
      }
      if (sceneButton.matches('[data-scene-move]')) {
        const cards = $$('[data-scene-card]');
        const index = cards.indexOf(card);
        const target = sceneButton.dataset.sceneMove === 'up' ? index - 1 : index + 1;
        if (target < 0 || target >= cards.length) return;
        const ids = cards.map(item => item.dataset.sceneCard);
        [ids[index], ids[target]] = [ids[target], ids[index]];
        await api(`/api/content/${encodeURIComponent(productionId)}/scenes/reorder`, {
          method: 'POST', body: JSON.stringify({ sceneIds: ids })
        });
        await refreshContentDialog(productionId, 'Ordem da linha do tempo atualizada. Reconstrua antes de aprovar.');
        return;
      }
      await api(`/api/content/${encodeURIComponent(productionId)}/scenes/${encodeURIComponent(sceneId)}`, {
        method: 'PATCH', body: JSON.stringify(sceneFormData(card))
      });
      if (sceneButton.matches('[data-scene-save]')) {
        await refreshContentDialog(productionId, 'Rascunho da cena salvo.');
        return;
      }
      if (sceneButton.matches('[data-scene-narration]')) {
        if (!confirm('Regenerar a narração apenas desta cena? Isso pode consumir créditos do provedor de TTS; a fatura do provedor é a referência oficial.')) return;
        await api(`/api/content/${encodeURIComponent(productionId)}/scenes/${encodeURIComponent(sceneId)}/narration`, {
          method: 'POST', body: JSON.stringify({ confirmCost: true })
        });
        await refreshContentDialog(productionId, 'Narração da cena regenerada. Reconstrua o vídeo final quando todos os trechos de narração estiverem prontos.');
        return;
      }
      const estimate = await api(`/api/content/${encodeURIComponent(productionId)}/scenes/${encodeURIComponent(sceneId)}/estimate`);
      const message = estimate.paid
        ? `Regenerar apenas esta cena com ${estimate.provider} (${estimate.generatedSeconds}s)? Isso consome créditos do provedor; a fatura do provedor é a referência oficial. Continuar?`
        : 'Regenerar apenas esta cena com o provedor de imagens configurado? Uma requisição real de imagem pode consumir créditos do provedor. Continuar?';
      if (!confirm(message)) return;
      await api(`/api/content/${encodeURIComponent(productionId)}/scenes/${encodeURIComponent(sceneId)}/regenerate`, {
        method: 'POST', body: JSON.stringify({ confirmPaid: estimate.paid })
      });
      await refreshContentDialog(productionId, 'Cena regenerada. Reconstrua o vídeo final quando a linha do tempo estiver pronta.');
    } catch (error) {
      showToast(error.message, 'error');
    }
    return;
  }

  const silenceAction = event.target.closest('[data-intentional-silence], [data-require-narration]');
  if (silenceAction) {
    const productionId = $('#content-review-form')?.dataset.productionId;
    if (!productionId) return;
    const enabled = silenceAction.matches('[data-intentional-silence]');
    let reason = '';
    if (enabled) {
      reason = prompt('Por que esta produção é intencionalmente silenciosa? O motivo será armazenado com as evidências de aprovação.') || '';
      if (!reason) return;
      if (!confirm('Confirme que esta produção é intencionalmente silenciosa. As legendas e os visuais serão mantidos, e a aprovação registrará esta exceção.')) return;
    } else if (!confirm('Exigir narração novamente? A aprovação ficará bloqueada até que a narração das cenas faltantes seja regenerada e o vídeo reconstruído.')) {
      return;
    }
    try {
      await api(`/api/content/${encodeURIComponent(productionId)}/narration/silence`, {
        method: 'POST', body: JSON.stringify({ enabled, confirmed: enabled, reason })
      });
      await refreshContentDialog(productionId, enabled ? 'Silêncio intencional registrado. Reconstrua antes de aprovar.' : 'A narração voltou a ser obrigatória.');
    } catch (error) {
      showToast(error.message, 'error');
    }
    return;
  }

  const rebuildScenes = event.target.closest('[data-rebuild-scenes]');
  if (rebuildScenes) {
    const productionId = rebuildScenes.dataset.rebuildScenes;
    if (confirm('Reconstruir um novo MP4 final a partir da linha do tempo de cenas atual? O vídeo final anterior será preservado.')) {
      try {
        await api(`/api/content/${encodeURIComponent(productionId)}/scenes/rebuild`, { method: 'POST', body: '{}' });
        await refreshContentDialog(productionId, 'Vídeo final reconstruído a partir da linha do tempo reparada. Revise-o antes de aprovar.');
      } catch (error) {
        showToast(error.message, 'error');
      }
    }
    return;
  }

  const addSource = event.target.closest('[data-add-provenance-source]');
  if (addSource) {
    const list = $('#provenance-sources');
    list.querySelector('.empty-inline')?.remove();
    list.insertAdjacentHTML('beforeend', renderSourceEditor({ id: clientId('source') }));
    return;
  }

  const addClaim = event.target.closest('[data-add-provenance-claim]');
  if (addClaim) {
    const list = $('#provenance-claims');
    list.querySelector('.empty-inline')?.remove();
    list.insertAdjacentHTML('beforeend', renderClaimEditor({ id: clientId('claim') }, currentSourceOptions()));
    return;
  }

  const removeProvenance = event.target.closest('[data-remove-provenance]');
  if (removeProvenance) {
    removeProvenance.closest('.provenance-item')?.remove();
    return;
  }

  const saveProvenance = event.target.closest('[data-save-provenance]');
  if (saveProvenance) {
    const productionId = $('#content-review-form')?.dataset.productionId;
    if (productionId) await persistProvenance(productionId, 'Revisão de evidências salva.').catch(() => {});
    return;
  }

  const save = event.target.closest('[data-save-content]');
  if (save) {
    try {
      await persistProvenance(save.dataset.saveContent);
      await mutate(`/api/content/${encodeURIComponent(save.dataset.saveContent)}`, 'PATCH', contentFormData(), 'Rascunho e revisão de evidências salvos.');
    } catch (_error) { /* toast already shown */ }
  }

  const approve = event.target.closest('[data-approve-content]');
  if (approve) {
    try {
      await persistProvenance(approve.dataset.approveContent);
      await mutate(`/api/content/${encodeURIComponent(approve.dataset.approveContent)}/approve`, 'POST', contentFormData(), 'Conteúdo aprovado e agendado.');
      $('#content-dialog').close();
    } catch (_error) { /* toast already shown */ }
  }

  const reschedule = event.target.closest('[data-reschedule-content]');
  if (reschedule) {
    const publishTime = contentFormData().publishTime;
    if (!publishTime) return showToast('Escolha primeiro um horário de publicação futuro.', 'error');
    try {
      await mutate(`/api/content/${encodeURIComponent(reschedule.dataset.rescheduleContent)}/schedule`, 'PATCH', { publishTime }, 'Conteúdo reagendado.');
      await openContent(reschedule.dataset.rescheduleContent);
    } catch (_error) { /* toast already shown */ }
    return;
  }

  const publishNow = event.target.closest('[data-publish-now-content]');
  if (publishNow) {
    if (!confirm('Publicar este vídeo no YouTube agora com a configuração de privacidade selecionada?')) return;
    try {
      await mutate(`/api/content/${encodeURIComponent(publishNow.dataset.publishNowContent)}/publish-now`, 'POST', {}, 'Conteúdo publicado.');
      $('#content-dialog').close();
    } catch (_error) { /* toast already shown */ }
    return;
  }

  const deleteSchedule = event.target.closest('[data-delete-schedule]');
  if (deleteSchedule) {
    if (!confirm('Excluir este agendamento? O conteúdo e os recursos gerados serão mantidos.')) return;
    try {
      await mutate(`/api/content/${encodeURIComponent(deleteSchedule.dataset.deleteSchedule)}/schedule`, 'DELETE', undefined, 'Agendamento excluído; o conteúdo gerado foi mantido.');
      await openContent(deleteSchedule.dataset.deleteSchedule);
    } catch (_error) { /* toast already shown */ }
    return;
  }

  const reject = event.target.closest('[data-reject-content]');
  if (reject) {
    const notes = prompt('Por que você está rejeitando este conteúdo?', 'Precisa de um ângulo diferente');
    if (notes !== null) {
      await mutate(`/api/content/${encodeURIComponent(reject.dataset.rejectContent)}/reject`, 'POST', { notes }, 'Conteúdo rejeitado.').catch(() => {});
      $('#content-dialog').close();
    }
  }

  const retry = event.target.closest('[data-retry-content]');
  if (retry && confirm('Gerar uma nova versão com o mesmo tema?')) {
    await mutate(`/api/content/${encodeURIComponent(retry.dataset.retryContent)}/retry`, 'POST', {}, 'Regeneração iniciada.').catch(() => {});
    $('#content-dialog').close();
  }
});

document.addEventListener('change', event => {
  if (event.target.matches('#retention-snapshot-select')) {
    ui.retentionSnapshotId = event.target.value;
    renderRetention(ui.state?.learning?.retention || {});
  }
  if (event.target.matches('#engagement-video-select')) {
    ui.engagementVideoId = event.target.value;
    ui.engagementDetail = null;
    renderEngagement(ui.state?.engagement || {});
  }
  if (event.target.matches('[name="selectedTitleVariant"]')) {
    const title = event.target.selectedOptions[0]?.dataset.title;
    const input = $('#content-review-form [name="title"]');
    if (title && input) input.value = title;
  }
  if (event.target.matches('[data-scene-upload]')) {
    const file = event.target.files?.[0];
    const card = event.target.closest('[data-scene-card]');
    const productionId = $('#content-review-form')?.dataset.productionId;
    if (file && card && productionId) {
      uploadSceneAsset(productionId, card.dataset.sceneCard, file);
    }
  }
});

$('#generate-button').addEventListener('click', () => $('#generate-dialog').showModal());
$('#add-idea-button').addEventListener('click', () => $('#idea-dialog').showModal());
$('#refresh-button').addEventListener('click', () => refreshDashboard());
$('#pipeline-filter').addEventListener('change', () => renderPipeline(ui.state?.pipeline || []));

$('#experiment-create-form').addEventListener('submit', async event => {
  event.preventDefault();
  const values = Object.fromEntries(new FormData(event.currentTarget));
  await mutate('/api/experiments', 'POST', {
    productionId: values.productionId,
    armDurationHours: Number(values.armDurationHours),
    minImpressions: Number(values.minImpressions)
  }, 'Rascunho de experimento de crescimento criado para revisão.').catch(() => {});
});

$('#run-readiness-button').addEventListener('click', async event => {
  const button = event.currentTarget;
  button.disabled = true;
  button.textContent = 'Executando verificações reais…';
  try {
    await mutate('/api/readiness/run', 'POST', {
      includePaidMedia: $('#paid-image-probe').checked,
      includePaidVideo: $('#paid-video-probe').checked
    }, 'Verificação de prontidão de produção concluída.');
    switchView('readiness');
  } catch (_error) { /* toast already shown */ }
  finally {
    button.disabled = false;
    button.textContent = 'Executar verificação';
  }
});

$('#automation-toggle').addEventListener('click', async () => {
  const action = ui.state?.system.automationPaused ? 'resume' : 'pause';
  await mutate(`/api/automation/${action}`, 'POST', {}, action === 'pause' ? 'Automação pausada.' : 'Automação retomada.').catch(() => {});
});

function strategyFormData(status = ui.state?.channelStrategy?.status || 'draft') {
  const form = $('#strategy-form');
  const values = Object.fromEntries(new FormData(form));
  return {
    ...values,
    contentPillars: values.contentPillars.split(',').map(value => value.trim()).filter(Boolean),
    cadencePerWeek: Number(values.cadencePerWeek),
    videosPerRun: Number(values.videosPerRun),
    targetValue: values.targetValue === '' ? null : Number(values.targetValue),
    targetWindowDays: Number(values.targetWindowDays),
    monthlyBudget: values.monthlyBudget === '' ? null : Number(values.monthlyBudget),
    status
  };
}

$('#strategy-form').addEventListener('submit', async event => {
  event.preventDefault();
  await mutate('/api/operator/strategy', 'PUT', strategyFormData(), 'Estratégia do canal salva.').catch(() => {});
});

$('#activate-operator-button').addEventListener('click', async () => {
  if (!$('#strategy-form').reportValidity()) return;
  await mutate('/api/operator/start', 'POST', strategyFormData('active'), 'Operador autônomo iniciado.').catch(() => {});
});

$('#pause-operator-button').addEventListener('click', async () => {
  await mutate('/api/operator/pause', 'POST', {}, 'Operador autônomo pausado.').catch(() => {});
});

$('#cancel-operator-run').addEventListener('click', async event => {
  const runId = event.currentTarget.dataset.runId;
  if (runId && confirm('Parar esta execução autônoma após a etapa atual do agente?')) {
    await mutate(`/api/operator/runs/${encodeURIComponent(runId)}/cancel`, 'POST', {}, 'Parada do operador solicitada.').catch(() => {});
  }
});

$('#resume-operator-run').addEventListener('click', async event => {
  const runId = event.currentTarget.dataset.runId;
  if (runId && confirm('Retomar esta execução do operador a partir do plano editorial e dos checkpoints de geração salvos?')) {
    await mutate(`/api/operator/runs/${encodeURIComponent(runId)}/resume`, 'POST', {}, 'Operador autônomo retomado.').catch(() => {});
  }
});

$('#generate-form').addEventListener('submit', async event => {
  event.preventDefault();
  const values = Object.fromEntries(new FormData(event.currentTarget));
  try {
    await mutate('/generate', 'POST', { ...values, topic: values.topic.trim() || null }, 'Geração iniciada.');
    $('#generate-dialog').close();
    event.currentTarget.reset();
  } catch (_error) { /* toast already shown */ }
});

$('#idea-form').addEventListener('submit', async event => {
  event.preventDefault();
  const values = Object.fromEntries(new FormData(event.currentTarget));
  try {
    await mutate('/api/ideas', 'POST', values, 'Ideia adicionada ao backlog.');
    $('#idea-dialog').close();
    event.currentTarget.reset();
  } catch (_error) { /* toast already shown */ }
});

$('#profile-form').addEventListener('submit', async event => {
  event.preventDefault();
  const values = Object.fromEntries(new FormData(event.currentTarget));
  values.bannedTopics = values.bannedTopics.split(',').map(value => value.trim()).filter(Boolean);
  try {
    await mutate('/api/profile', 'PUT', values, 'Configuração do canal salva.');
    await mutate('/api/settings', 'PUT', {
      approval_required: $('#approval-required').checked,
      notification_enabled: $('#notifications-enabled').checked,
      channel_timezone: values.timezone,
      video_provider: values.videoProvider,
      video_generation_mode: values.videoGenerationMode,
      video_clip_duration: Number(values.videoClipDuration),
      video_max_generated_seconds: Number(values.videoMaxGeneratedSeconds)
    }, 'Configurações do operador salvas.');
  } catch (_error) { /* toast already shown */ }
});

$('#api-key-button').addEventListener('click', () => {
  if (requestApiKey() !== null) showToast('Chave de API do painel salva neste navegador.');
});

const initialView = location.hash.slice(1);
if (['overview', 'operator', 'pipeline', 'calendar', 'analytics', 'engagement', 'readiness', 'settings'].includes(initialView)) switchView(initialView);
refreshDashboard();
setInterval(() => refreshDashboard(true), 8000);
