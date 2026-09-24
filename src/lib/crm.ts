// CRM de Disparos WhatsApp — tipos, helpers e lógica de timezone por DDD

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type CrmInstance = {
  id: string;
  name: string;
  token: string;
  subdomain: string;
  status: 'disconnected' | 'connecting' | 'connected' | 'hibernated';
  phone: string | null;
  daily_limit: number;
  sent_today: number;
  last_reset_at: string | null;
  created_at: string;
};

export type CrmMessagePool = {
  id: string;
  name: string;
  body: string;
  category: string | null;
  use_ai_rewrite: boolean;
  ativo: boolean;
  created_at: string;
};

export type CrmCampaign = {
  id: string;
  name: string;
  status: 'draft' | 'queued' | 'sending' | 'paused' | 'done';
  instance_ids: string[];
  message_pool_ids: string[];
  delay_min_ms: number;
  delay_max_ms: number;
  daily_limit_per_instance: number;
  use_ai_rewrite: boolean;
  ai_tone: 'profissional' | 'casual' | 'urgente';
  started_at: string | null;
  paused_at: string | null;
  done_at: string | null;
  created_at: string;
};

export type CrmRecipient = {
  id: string;
  campaign_id: string;
  phone: string;
  name: string | null;
  empresa: string | null;
  type: 'individual' | 'group';
  ddd: string | null;
  bairro: string | null;
  state: string | null;
  send_after: string | null;
  instance_id: string | null;
  status: 'pending' | 'sent' | 'failed' | 'replied' | 'read';
  tags: string[];
  message_sent: string | null;
  sent_at: string | null;
  last_replied_at: string | null;
};

export type CrmLead = {
  id: string;
  phone: string;
  name: string | null;
  score: number;
  tags: string[];
  ddd: string | null;
  bairro: string | null;
  state: string | null;
  total_received: number;
  total_replied: number;
  blocked: boolean;
  last_campaign_at: string | null;
  last_reply_at: string | null;
  created_at: string;
};

export type LeadTier = 'hot' | 'warm' | 'cold' | 'blocked';

// ─── Lead Score ───────────────────────────────────────────────────────────────

export const SCORE = {
  entregue:    10,
  lido:        25,
  respondeu1:  50,
  respondeu2:  75,
  respondeu3: 100,
  reagiu:      10,
  bloqueou:   -30,
  falhou:     -10,
} as const;

export function leadTier(score: number, blocked: boolean): LeadTier {
  if (blocked) return 'blocked';
  if (score >= 50) return 'hot';
  if (score >= 10) return 'warm';
  return 'cold';
}

export const TIER_LABEL: Record<LeadTier, string> = {
  hot:     'Quente',
  warm:    'Morno',
  cold:    'Frio',
  blocked: 'Bloqueado',
};

export const TIER_COLOR: Record<LeadTier, string> = {
  hot:     '#ef4444',
  warm:    '#f59e0b',
  cold:    '#64748b',
  blocked: '#334155',
};

// ─── DDD → Fuso Horário (UTC offset, fixo — Brasil aboliu horário de verão em 2019) ──

// Fonte: ANATEL + IBGE
const DDD_TZ_OFFSET: Record<string, number> = {
  // UTC-5 — Acre (AC)
  '68': -5,

  // UTC-4 — Amazonas (AM), Rondônia (RO), Roraima (RR)
  '69': -4,  // RO - Porto Velho, Ji-Paraná
  '92': -4,  // AM - Manaus, Itacoatiara
  '97': -4,  // AM - Tefé, Parintins
  '95': -4,  // RR - Boa Vista

  // Todo o restante é UTC-3 (Horário de Brasília — padrão)
};

// Estado por DDD (para enriquecer o lead)
const DDD_STATE: Record<string, string> = {
  '11': 'SP', '12': 'SP', '13': 'SP', '14': 'SP', '15': 'SP',
  '16': 'SP', '17': 'SP', '18': 'SP', '19': 'SP',
  '21': 'RJ', '22': 'RJ', '24': 'RJ',
  '27': 'ES', '28': 'ES',
  '31': 'MG', '32': 'MG', '33': 'MG', '34': 'MG', '35': 'MG',
  '37': 'MG', '38': 'MG',
  '41': 'PR', '42': 'PR', '43': 'PR', '44': 'PR', '45': 'PR', '46': 'PR',
  '47': 'SC', '48': 'SC', '49': 'SC',
  '51': 'RS', '53': 'RS', '54': 'RS', '55': 'RS',
  '61': 'DF',
  '62': 'GO', '64': 'GO',
  '63': 'TO',
  '65': 'MT', '66': 'MT',
  '67': 'MS',
  '68': 'AC',
  '69': 'RO',
  '71': 'BA', '73': 'BA', '74': 'BA', '75': 'BA', '77': 'BA',
  '79': 'SE',
  '81': 'PE', '87': 'PE',
  '82': 'AL',
  '83': 'PB',
  '84': 'RN',
  '85': 'CE', '88': 'CE',
  '86': 'PI', '89': 'PI',
  '91': 'PA', '93': 'PA', '94': 'PA',
  '92': 'AM', '97': 'AM',
  '95': 'RR',
  '96': 'AP',
  '98': 'MA', '99': 'MA',
};

export function dddOffset(ddd: string): number {
  return DDD_TZ_OFFSET[ddd] ?? -3;
}

export function dddState(ddd: string): string | null {
  return DDD_STATE[ddd] ?? null;
}

// Extrai DDD de um número brasileiro (ex: "5511999999999" → "11")
export function extractDdd(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');
  // Remove código do país (55) se presente
  const sem55 = digits.startsWith('55') && digits.length >= 12
    ? digits.slice(2)
    : digits;
  if (sem55.length < 10) return null;
  return sem55.slice(0, 2);
}

// Verifica se agora está dentro da janela de envio (8h–19h horário local do DDD)
export function isInSendWindow(ddd: string, utcNow: Date): boolean {
  const offset = dddOffset(ddd);
  const localHour = ((utcNow.getUTCHours() + offset) % 24 + 24) % 24;
  return localHour >= 8 && localHour < 19;
}

// Calcula o próximo send_after UTC para entrar na janela 8h–19h do DDD
export function nextSendWindowUTC(ddd: string, utcNow: Date): Date {
  const offset = dddOffset(ddd);
  const localHour = ((utcNow.getUTCHours() + offset) % 24 + 24) % 24;
  const localMin  = utcNow.getUTCMinutes();

  if (localHour >= 8 && localHour < 19) {
    // Já está na janela — pode enviar agora
    return utcNow;
  }

  let hoursToWait: number;
  if (localHour < 8) {
    hoursToWait = 8 - localHour - localMin / 60;
  } else {
    // Após 19h — agendar para as 8h do dia seguinte
    hoursToWait = (24 - localHour + 8) - localMin / 60;
  }

  return new Date(utcNow.getTime() + hoursToWait * 3_600_000);
}

// ─── Helpers de campanha ──────────────────────────────────────────────────────

export function randomDelay(minMs: number, maxMs: number): number {
  return Math.floor(Math.random() * (maxMs - minMs) + minMs);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// Distribui recipients entre instâncias disponíveis (round-robin por carga)
export function escolherInstancia(
  instancias: Pick<CrmInstance, 'id' | 'sent_today' | 'daily_limit' | 'status'>[],
  tentativa = 0,
): string | null {
  const disponiveis = instancias.filter(
    (i) => i.status === 'connected' && i.sent_today < i.daily_limit,
  );
  if (!disponiveis.length) return null;
  // Escolhe a instância com mais capacidade restante
  disponiveis.sort((a, b) => (a.daily_limit - a.sent_today) - (b.daily_limit - b.sent_today));
  return disponiveis[tentativa % disponiveis.length].id;
}
