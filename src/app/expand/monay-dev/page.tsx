'use client';
import { useState } from 'react';
import {
  MTaskCard, MStatusBadge, MPriorityDot, MAgentAvatar,
  MProgressBar, MEmptyState, MKpiCard, MKanbanColumn,
  MChatBubble, MHeatmapHours, MPlaylistPlayer, MPomodoroTimer,
  MClientHero, MFilterBar, MModalOverlay, MSidebarRight,
} from '@/components/monay';

const MOCK_SESSIONS = [
  { date: '2026-08-11', hour: 9, minutes: 90 },
  { date: '2026-08-11', hour: 14, minutes: 45 },
  { date: '2026-08-12', hour: 10, minutes: 120 },
  { date: '2026-08-13', hour: 8, minutes: 60 },
  { date: '2026-08-14', hour: 15, minutes: 30 },
  { date: '2026-08-15', hour: 9, minutes: 75 },
  { date: '2026-08-16', hour: 11, minutes: 50 },
];

export default function MonayDevPage() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div style={{
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      gap: 40,
      maxWidth: 1200,
    }}>
      <div>
        <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--accent)', fontWeight: 700, marginBottom: 6 }}>
          Monay Design System
        </div>
        <h1 style={{ fontFamily: 'var(--serif)', fontSize: 26, fontWeight: 400, color: 'var(--txt)', letterSpacing: '-.3px' }}>
          Componentes — Dev Preview
        </h1>
        <p style={{ fontSize: 13, color: 'var(--dim)', marginTop: 4 }}>
          15 componentes base do painel Monay Expand. Dia 1 concluído.
        </p>
      </div>

      {/* ── Badges & Pills ── */}
      <section>
        <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--dim)', fontWeight: 700, marginBottom: 12 }}>
          Status Badges · Priority Dots · Agent Avatars
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <MStatusBadge status="idle" />
          <MStatusBadge status="run" />
          <MStatusBadge status="done" />
          <MStatusBadge status="late" />
          <MStatusBadge status="wait" />
          <div style={{ width: 1, height: 24, background: 'var(--line)', margin: '0 4px' }} />
          <MPriorityDot priority="urgente" showLabel />
          <MPriorityDot priority="alta" showLabel />
          <MPriorityDot priority="normal" showLabel />
          <MPriorityDot priority="baixa" showLabel />
          <div style={{ width: 1, height: 24, background: 'var(--line)', margin: '0 4px' }} />
          <MAgentAvatar name="Bruno Zorzetti" type="human" size={36} />
          <MAgentAvatar name="Claude Code" type="ai" size={36} />
          <MAgentAvatar name="Bia CS" type="ai" size={36} color="var(--warn)" />
        </div>
      </section>

      {/* ── KPI Cards ── */}
      <section>
        <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--dim)', fontWeight: 700, marginBottom: 12 }}>
          KPI Cards
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 10 }}>
          <MKpiCard label="Tarefas ativas" value={12} sub="3 com SLA vencido" trend="up" />
          <MKpiCard label="Taxa de conclusão" value="87%" sub="últimos 30 dias" trend="up" color="var(--green)" progress={87} />
          <MKpiCard label="Horas foco" value="24h" sub="esta semana" trend="flat" color="var(--warn)" progress={60} />
          <MKpiCard label="Clientes em risco" value={2} sub="saúde < 40" trend="down" color="var(--red)" />
        </div>
      </section>

      {/* ── Progress Bar ── */}
      <section>
        <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--dim)', fontWeight: 700, marginBottom: 12 }}>
          Progress Bars
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 400 }}>
          <MProgressBar value={35} showLabel />
          <MProgressBar value={72} color="var(--green)" showLabel height={8} />
          <MProgressBar value={90} color="var(--warn)" showLabel height={4} />
        </div>
      </section>

      {/* ── Task Cards ── */}
      <section>
        <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--dim)', fontWeight: 700, marginBottom: 12 }}>
          Task Cards
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 10 }}>
          <MTaskCard
            title="Criar playbook do Método 3F no painel"
            status="run"
            priority="alta"
            clienteName="Expand"
            datePrevista="2026-08-20"
            responsaveis={[{ name: 'Bruno Zorzetti', type: 'human' }, { name: 'Claude', type: 'ai' }]}
            agent="claude-code"
            tags={['comercial', 'playbook']}
            commentCount={3}
            attachCount={1}
            onClick={() => setModalOpen(true)}
          />
          <MTaskCard
            title="Corrigir pipeline-trigger Supabase ref"
            status="wait"
            priority="urgente"
            clienteName="Hashes"
            datePrevista="2026-08-18"
            responsaveis={[{ name: 'Bruno', type: 'human' }]}
            tags={['admin', 'bloqueado']}
          />
          <MTaskCard
            title="Biblioteca de objeções de venda"
            status="idle"
            priority="normal"
            clienteName="Expand"
            sla="2d"
            responsaveis={[{ name: 'Téo', type: 'ai' }]}
            agent="teo"
            compact
          />
          <MTaskCard
            title="DRE & Margem — rota /admin/financas"
            status="done"
            priority="baixa"
            clienteName="Expand"
            responsaveis={[{ name: 'Claude', type: 'ai' }]}
            agent="claude-code"
          />
        </div>
      </section>

      {/* ── Kanban Columns ── */}
      <section>
        <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--dim)', fontWeight: 700, marginBottom: 12 }}>
          Kanban Columns
        </div>
        <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 8 }}>
          <MKanbanColumn title="A fazer" count={5} color="var(--dim)">
            <MTaskCard title="Melhorias no placar XP" status="idle" priority="normal" compact />
            <MTaskCard title="Health score de clientes" status="idle" priority="baixa" compact />
          </MKanbanColumn>
          <MKanbanColumn title="Em andamento" count={2} color="var(--accent)">
            <MTaskCard title="Design system Monay" status="run" priority="alta" compact />
          </MKanbanColumn>
          <MKanbanColumn title="Em revisão" count={1} color="var(--warn)">
            <MTaskCard title="Pipeline-trigger fix" status="wait" priority="urgente" compact />
          </MKanbanColumn>
          <MKanbanColumn title="Concluído" count={8} color="var(--green)">
            <MTaskCard title="Perfil do agente — aba Grafo" status="done" priority="normal" compact />
          </MKanbanColumn>
        </div>
      </section>

      {/* ── Client Hero ── */}
      <section>
        <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--dim)', fontWeight: 700, marginBottom: 12 }}>
          Client Hero
        </div>
        <div style={{ maxWidth: 500 }}>
          <MClientHero
            clienteName="Expand"
            taskTitle="Construir Playbook de Vendas High Ticket"
            datePrevista="2026-08-20"
          />
        </div>
      </section>

      {/* ── FilterBar ── */}
      <section>
        <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--dim)', fontWeight: 700, marginBottom: 12 }}>
          Filter Bar
        </div>
        <MFilterBar
          filters={[
            { key: 'status', placeholder: 'Status', options: [{ value: 'run', label: 'Em andamento' }, { value: 'idle', label: 'A fazer' }, { value: 'done', label: 'Concluído' }] },
            { key: 'prioridade', placeholder: 'Prioridade', options: [{ value: 'urgente', label: 'Urgente' }, { value: 'alta', label: 'Alta' }] },
          ]}
          view="kanban"
          onViewChange={() => {}}
        />
      </section>

      {/* ── Chat Bubbles ── */}
      <section>
        <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--dim)', fontWeight: 700, marginBottom: 12 }}>
          Chat Bubbles
        </div>
        <div style={{ maxWidth: 520, background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 12, padding: '12px 16px' }}>
          <MChatBubble author="Bruno" type="human" content="Quais são as objeções mais comuns no fechamento do PIDE?" time="14:23" />
          <MChatBubble
            author="Téo"
            type="ai"
            content="As 3 principais são: (1) Preço — usar CSC + Teorema do Jaque; (2) Tempo — mapear ROI em horas recuperadas; (3) Desconfiança — mostrar prova social com resultados reais."
            time="14:23"
            actions={[
              { icon: '📋', label: 'Copiar script', onClick: () => {} },
              { icon: '🔍', label: 'Ver no grafo', onClick: () => {} },
            ]}
          />
        </div>
      </section>

      {/* ── Heatmap + Pomodoro + Playlist ── */}
      <section>
        <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--dim)', fontWeight: 700, marginBottom: 12 }}>
          Heatmap de Horas · Pomodoro · Playlist
        </div>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 300 }}>
            <div style={{ fontSize: 11, color: 'var(--dim)', marginBottom: 8 }}>Foco por horário</div>
            <MHeatmapHours data={MOCK_SESSIONS} />
          </div>
          <div style={{ width: 260 }}>
            <div style={{ fontSize: 11, color: 'var(--dim)', marginBottom: 8 }}>Timer</div>
            <MPomodoroTimer defaultMinutes={25} />
          </div>
          <div style={{ width: 260 }}>
            <div style={{ fontSize: 11, color: 'var(--dim)', marginBottom: 8 }}>Playlist</div>
            <MPlaylistPlayer />
          </div>
        </div>
      </section>

      {/* ── Empty State ── */}
      <section>
        <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--dim)', fontWeight: 700, marginBottom: 12 }}>
          Empty State
        </div>
        <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 12, maxWidth: 400 }}>
          <MEmptyState
            icon="📭"
            title="Nenhuma tarefa ativa"
            description="Todas as tarefas do dia foram concluídas ou ainda não há prioridades definidas para hoje."
            action={{ label: '+ Criar tarefa', onClick: () => {} }}
          />
        </div>
      </section>

      {/* ── Modal ── */}
      <section>
        <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--dim)', fontWeight: 700, marginBottom: 12 }}>
          Modal Overlay
        </div>
        <button onClick={() => setModalOpen(true)} className="hx-btn hx-btn-primary" style={{ padding: '8px 18px' }}>
          Abrir modal de tarefa
        </button>
        <MModalOverlay open={modalOpen} onClose={() => setModalOpen(false)} maxWidth={700}>
          <div style={{ padding: '28px 28px 24px' }}>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--accent)', fontWeight: 700, marginBottom: 8 }}>
              Tarefa · Expand
            </div>
            <h2 style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 400, color: 'var(--txt)', marginBottom: 12 }}>
              Criar playbook do Método 3F no painel
            </h2>
            <MProgressBar value={35} showLabel />
            <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
              <MStatusBadge status="run" />
              <MPriorityDot priority="alta" showLabel />
            </div>
          </div>
        </MModalOverlay>
      </section>

      <div style={{ height: 48 }} />
    </div>
  );
}
