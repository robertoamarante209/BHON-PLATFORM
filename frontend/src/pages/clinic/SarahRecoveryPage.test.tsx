import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SarahRecoveryPage } from './SarahRecoveryPage';

const auth = vi.hoisted(() => ({ currentUser: { role: 'OWNER' } }));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => auth }));
const text = 'Olá! Aqui é Sarah, assistente virtual da clínica. Podemos ajudar com seu próximo atendimento? Se preferir, solicite atendimento humano ou responda SAIR.';
const templates = [{ id: 'CONTINUE', text }, { id: 'RESCHEDULE', text: 'Olá! Gostaria de conversar com nossa equipe?' }];
const opportunity = (overrides = {}) => ({
  id: 'first', patientId: 'patient-1', sourceType: 'BUDGET', sourceId: 'budget-1', priorityScore: 80,
  estimatedValue: 100, stage: 'ACTIVE', nextActionAt: '2026-09-27T12:00:00Z', closedReason: null,
  patient: { id: 'patient-1', name: 'Ana', phone: '(11) 99999-1234' }, consentStatus: 'ACTIVE', outboundEligible: true,
  activeSequence: { id: 'seq-1', step: 0, status: 'ACTIVE', scheduledAt: '2026-09-27T12:00:00Z' },
  events: [{ id: 'event-1', sequenceId: 'seq-1', channel: 'WHATSAPP', direction: 'INTERNAL', kind: 'DRAFT_REVIEWED', contentRedacted: 'protected content must never render', actorType: 'USER', occurredAt: '2026-09-26T12:00:00Z' }],
  ...overrides,
});
const response = (body: object, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const load = (data = [opportunity()]) => response({ data, draftTemplates: templates });
const fetchMock = vi.fn();
async function openAna() {
  await userEvent.click(await screen.findByRole('button', { name: 'Revisar Ana' }));
  return screen.getByRole('region', { name: 'Revisão de Ana' });
}
async function reviewDraft() {
  await openAna();
  await userEvent.selectOptions(screen.getByLabelText('Modelo publicado'), 'CONTINUE');
  await userEvent.click(screen.getByLabelText('Revisei a mensagem e confirmo o uso deste modelo.'));
  await userEvent.click(screen.getByRole('button', { name: 'Preparar rascunho' }));
}

describe('Sarah human review queue', () => {
  beforeEach(() => {
    auth.currentUser.role = 'OWNER';
    window.history.replaceState(null, '', '/clinic/sarah');
    fetchMock.mockReset().mockImplementation(async () => load());
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('blocks preparation without consent and explains the reason', async () => {
    fetchMock.mockResolvedValue(load([opportunity({ consentStatus: 'MISSING', outboundEligible: false })]));
    render(<SarahRecoveryPage />);
    const panel = await openAna();
    expect(within(panel).getByText(/Sem consentimento.*não pode ser preparada/i)).toBeVisible();
    expect(within(panel).getByRole('button', { name: 'Preparar rascunho' })).toBeDisabled();
    expect(within(panel).queryByRole('combobox', { name: 'Modelo publicado' })).not.toBeInTheDocument();
  });

  it('requires selecting and reviewing a published template without arbitrary message input', async () => {
    fetchMock.mockImplementation(async (_url, init) => init?.method === 'POST' ? response({ success: true, data: { id: 'draft-1', text, kind: 'DRAFT_REVIEWED', occurredAt: '2026-09-26T12:00:00Z' } }, 201) : load());
    render(<SarahRecoveryPage />);
    const panel = await openAna();
    expect(within(panel).getByRole('button', { name: 'Preparar rascunho' })).toBeDisabled();
    await userEvent.selectOptions(screen.getByLabelText('Modelo publicado'), 'CONTINUE');
    expect(within(panel).getByText(text)).toBeVisible();
    expect(within(panel).queryByRole('textbox')).not.toBeInTheDocument();
    expect(within(panel).getByRole('button', { name: 'Preparar rascunho' })).toBeDisabled();
    await userEvent.click(screen.getByLabelText('Revisei a mensagem e confirmo o uso deste modelo.'));
    await userEvent.click(screen.getByRole('button', { name: 'Preparar rascunho' }));
    expect(await screen.findByRole('button', { name: 'Copiar mensagem' })).toBeEnabled();
    expect(fetchMock).toHaveBeenCalledWith('/api/recovery/first/drafts', expect.objectContaining({ method: 'POST', body: JSON.stringify({ text, reviewed: true }), credentials: 'include' }));
    expect(screen.queryByText('protected content must never render')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Enviar/ })).not.toBeInTheDocument();
  });

  it('confirms handoff then refreshes and removes the item from Sarah active state', async () => {
    let handedOff = false;
    fetchMock.mockImplementation(async (url) => {
      if (url === '/api/recovery/first/handoff') { handedOff = true; return response({ success: true, data: { id: 'first', stage: 'HUMAN_HANDOFF', closedReason: 'HUMAN_REQUEST', nextActionAt: null } }); }
      return load([opportunity(handedOff ? { stage: 'HUMAN_HANDOFF', outboundEligible: false, activeSequence: null, nextActionAt: null } : {})]);
    });
    render(<SarahRecoveryPage />);
    await openAna();
    await userEvent.click(screen.getByRole('button', { name: 'Transferir para equipe' }));
    expect(handedOff).toBe(false);
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar transferência' }));
    await waitFor(() => expect(within(screen.getByRole('region', { name: 'Sarah conduzindo' })).queryByText('Ana')).not.toBeInTheDocument());
    expect(within(screen.getByRole('region', { name: 'Agir agora' })).getByText('Ana')).toBeVisible();
    expect(screen.queryByRole('link', { name: /Abrir WhatsApp/ })).not.toBeInTheDocument();
  });

  it('opens and focuses the opportunity from the URL and follows later focus changes', async () => {
    fetchMock.mockImplementation(async () => load([opportunity(), opportunity({ id: 'second', patientId: 'patient-2', patient: { id: 'patient-2', name: 'Bia', phone: null } })]));
    window.history.replaceState(null, '', '/clinic/sarah?focus=second');
    render(<SarahRecoveryPage />);
    const panel = await screen.findByRole('region', { name: 'Revisão de Bia' });
    expect(panel).toHaveFocus();
    act(() => window.history.pushState(null, '', '/clinic/sarah?focus=first'));
    expect(await screen.findByRole('region', { name: 'Revisão de Ana' })).toHaveFocus();
  });

  it('keeps failed load visible without a false empty-success queue', async () => {
    fetchMock.mockRejectedValue(new Error('network down'));
    render(<SarahRecoveryPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar a fila da Sarah');
    expect(screen.queryByText(/Nenhuma oportunidade/)).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Sarah conduzindo' })).not.toBeInTheDocument();
  });

  it('normalizes the Brazilian phone and uses the API-approved draft for the manual WhatsApp link', async () => {
    const approved = templates[1].text;
    fetchMock.mockImplementation(async (_url, init) => init?.method === 'POST' ? response({ success: true, data: { id: 'draft-1', text: approved, kind: 'DRAFT_REVIEWED', occurredAt: '2026-09-26T12:00:00Z' } }, 201) : load());
    render(<SarahRecoveryPage />);
    await reviewDraft();
    const link = await screen.findByRole('link', { name: /Abrir WhatsApp/ });
    expect(link).toHaveAttribute('href', 'https://wa.me/5511999991234?text=Ol%C3%A1!%20Gostaria%20de%20conversar%20com%20nossa%20equipe%3F');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.getByText(/A abertura da conversa é manual/)).toBeVisible();
  });

  it('confirms opt-out and refreshes all opportunities for the patient', async () => {
    let optedOut = false;
    fetchMock.mockImplementation(async (url) => {
      if (url === '/api/recovery/first/opt-out') { optedOut = true; return response({ success: true, data: { id: 'first', stage: 'ENDED', closedReason: 'CONSENT_REVOKED', nextActionAt: null } }); }
      return load([opportunity(optedOut ? { stage: 'ENDED', consentStatus: 'REVOKED', outboundEligible: false, activeSequence: null } : {})]);
    });
    render(<SarahRecoveryPage />);
    await openAna();
    await userEvent.click(screen.getByRole('button', { name: 'Registrar recusa de contato' }));
    expect(optedOut).toBe(false);
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar recusa' }));
    await waitFor(() => expect(within(screen.getByRole('region', { name: 'Encerrado' })).getByText('Ana')).toBeVisible());
    expect(screen.getByRole('button', { name: 'Preparar rascunho' })).toBeDisabled();
  });

  it('removes stale rows and drafts when the refresh after an action fails', async () => {
    fetchMock.mockResolvedValueOnce(load()).mockResolvedValueOnce(response({ success: true, data: {} })).mockRejectedValue(new Error('offline'));
    render(<SarahRecoveryPage />);
    await openAna();
    await userEvent.click(screen.getByRole('button', { name: 'Transferir para equipe' }));
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar transferência' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar a fila');
    expect(screen.queryByRole('button', { name: 'Revisar Ana' })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Revisão de Ana' })).not.toBeInTheDocument();
  });

  it('requires explicit capture details before registering consent', async () => {
    fetchMock.mockResolvedValue(load([opportunity({ consentStatus: 'MISSING', outboundEligible: false })]));
    render(<SarahRecoveryPage />);
    await openAna();
    await userEvent.click(screen.getByRole('button', { name: 'Registrar consentimento' }));
    expect(screen.getByRole('button', { name: 'Confirmar consentimento' })).toBeDisabled();
    await userEvent.selectOptions(screen.getByLabelText('Origem do consentimento'), 'SIGNED_FORM');
    await userEvent.type(screen.getByLabelText('Versão da política aceita'), 'v1');
    await userEvent.click(screen.getByLabelText(/Confirmo que o paciente autorizou explicitamente/));
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar consentimento' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/recovery/consents', expect.objectContaining({ method: 'POST', body: JSON.stringify({ patientId: 'patient-1', channel: 'WHATSAPP', purpose: 'RECOVERY', explicit: true, source: 'SIGNED_FORM', policyVersion: 'v1' }) })));
  });

  it('keeps read-only roles from preparing drafts or changing consent', async () => {
    auth.currentUser.role = 'VIEWER';
    render(<SarahRecoveryPage />);
    await openAna();
    expect(screen.getByRole('button', { name: 'Preparar rascunho' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Transferir para equipe' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Registrar consentimento' })).not.toBeInTheDocument();
  });

  it('keeps an explicit action-required stage in the human queue even when drafting is eligible', async () => {
    fetchMock.mockResolvedValue(load([opportunity({ stage: 'ACTION_REQUIRED' })]));
    render(<SarahRecoveryPage />);
    await screen.findByRole('button', { name: 'Revisar Ana' });
    expect(within(screen.getByRole('region', { name: 'Agir agora' })).getByText('Ana')).toBeVisible();
  });
});
