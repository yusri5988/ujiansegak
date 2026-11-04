const aiState = {
  conversationId: null,
  conversations: [],
  busy: false,
  loaded: false,
};

const aiElements = {
  conversationList: document.getElementById('aiConversationList'),
  messages: document.getElementById('aiChatMessages'),
  pendingActions: document.getElementById('aiPendingActions'),
  sensitiveOutput: document.getElementById('aiSensitiveOutput'),
  form: document.getElementById('aiChatForm'),
  input: document.getElementById('aiChatInput'),
  csvInput: document.getElementById('aiCsvInput'),
  csvAttach: document.getElementById('aiCsvAttach'),
  send: document.getElementById('aiSendMessage'),
  status: document.getElementById('aiChatStatus'),
  newConversation: document.getElementById('aiNewConversation'),
  historyToggle: document.getElementById('aiHistoryToggle'),
  deleteConversation: document.getElementById('aiDeleteConversation'),
};

function setAiHistoryOpen(open) {
  if (!aiElements.conversationList || !aiElements.historyToggle) return;
  aiElements.conversationList.hidden = !open;
  aiElements.historyToggle.setAttribute('aria-expanded', String(open));
}

function setAiStatus(message, isError = false) {
  if (!aiElements.status) return;
  aiElements.status.textContent = message;
  aiElements.status.classList.toggle('is-error', isError);
}

async function aiRequest(path, options = {}) {
  const token = localStorage.getItem('segak_token');
  const headers = new Headers(options.headers || {});
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (options.body) headers.set('Content-Type', 'application/json');

  const response = await fetch(path, { ...options, headers });
  if (response.status === 204) return null;

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && typeof window.logout === 'function') window.logout();
    throw new Error(body.message || 'Permintaan tidak dapat diselesaikan.');
  }
  return body.data;
}

function clearMessages() {
  aiElements.messages?.replaceChildren();
}

function appendAiMessage(role, content) {
  if (!aiElements.messages) return;
  const article = document.createElement('article');
  article.className = `ai-message ${role === 'user' ? 'ai-message-user' : 'ai-message-assistant'}`;
  const text = document.createElement('div');
  text.textContent = content;
  article.setAttribute('aria-label', role === 'user' ? 'Cikgu' : 'Pembantu SmartFit');
  article.append(text);
  aiElements.messages.append(article);
  aiElements.messages.scrollTop = aiElements.messages.scrollHeight;
}

function renderEmptyState() {
  if (!aiElements.messages) return;
  aiElements.messages.replaceChildren();
}

function renderConversationList() {
  if (!aiElements.conversationList) return;
  aiElements.conversationList.replaceChildren();
  for (const conversation of aiState.conversations) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ai-conversation-item';
    button.classList.toggle('is-active', conversation.id === aiState.conversationId);
    const title = document.createElement('span');
    title.textContent = conversation.title;
    button.append(title);
    button.addEventListener('click', () => {
      setAiHistoryOpen(false);
      openAiConversation(conversation.id);
    });
    aiElements.conversationList.append(button);
  }
  if (aiElements.deleteConversation) aiElements.deleteConversation.disabled = !aiState.conversationId;
}

function renderPendingActions(actions) {
  if (!aiElements.pendingActions) return;
  aiElements.pendingActions.replaceChildren();
  for (const action of actions || []) {
    const card = document.createElement('article');
    card.className = 'ai-action-card';
    const heading = document.createElement('h3');
    heading.textContent = action.preview.title;
    const details = document.createElement('dl');
    details.className = 'ai-action-details';
    for (const detail of action.preview.details) {
      const label = document.createElement('dt');
      label.textContent = detail.label;
      const value = document.createElement('dd');
      value.textContent = detail.value;
      details.append(label, value);
    }
    const buttons = document.createElement('div');
    buttons.className = 'ai-action-buttons';
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'ai-action-cancel';
    cancel.textContent = 'Batal';
    cancel.addEventListener('click', () => handleAiAction(action.id, 'cancel'));
    const confirm = document.createElement('button');
    confirm.type = 'button';
    confirm.className = 'ai-action-confirm';
    confirm.textContent = 'Sahkan';
    confirm.addEventListener('click', () => handleAiAction(action.id, 'confirm'));
    buttons.append(cancel, confirm);
    card.append(heading, details, buttons);
    aiElements.pendingActions.append(card);
  }
}

function clearSensitiveOutput() {
  aiElements.sensitiveOutput?.replaceChildren();
}

function renderSensitiveOutput(output) {
  if (!aiElements.sensitiveOutput || !output) return;
  clearSensitiveOutput();
  const card = document.createElement('section');
  card.className = 'ai-sensitive-card';
  const heading = document.createElement('strong');
  heading.textContent = output.label || 'Maklumat sementara';
  const value = document.createElement('div');
  value.className = 'ai-sensitive-value';
  value.textContent = output.value;
  const warning = document.createElement('p');
  warning.className = 'ai-sensitive-warning';
  warning.textContent = output.warning || 'Salin maklumat ini sekarang. Ia tidak disimpan dalam sejarah chat.';
  const copy = document.createElement('button');
  copy.type = 'button';
  copy.className = 'ai-sensitive-copy';
  copy.textContent = 'Salin';
  copy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(output.value);
      copy.textContent = 'Disalin';
    } catch {
      copy.textContent = 'Pilih dan salin teks di atas';
    }
  });
  card.append(heading, value, warning, copy);
  aiElements.sensitiveOutput.append(card);
  window.setTimeout(clearSensitiveOutput, 60_000);
}

async function openAiConversation(conversationId) {
  clearSensitiveOutput();
  aiState.conversationId = conversationId;
  localStorage.setItem('segak_ai_conversation_id', conversationId);
  renderConversationList();
  setAiStatus('Memuatkan perbualan...');
  try {
    const data = await aiRequest(`/api/ai/conversations/${encodeURIComponent(conversationId)}`);
    clearMessages();
    if (!data.messages.length) renderEmptyState();
    for (const message of data.messages) appendAiMessage(message.role, message.content);
    renderPendingActions(data.pendingActions);
    setAiStatus('');
  } catch (error) {
    setAiStatus(error.message, true);
  }
}

async function loadAiConversations() {
  if (!aiElements.conversationList || aiState.busy) return;
  try {
    aiState.conversations = await aiRequest('/api/ai/conversations') || [];
    const savedId = localStorage.getItem('segak_ai_conversation_id');
    const savedExists = savedId && aiState.conversations.some((conversation) => conversation.id === savedId);
    aiState.conversationId = savedExists ? savedId : null;
    if (!savedExists) localStorage.removeItem('segak_ai_conversation_id');
    renderConversationList();
    if (aiState.conversationId) {
      await openAiConversation(aiState.conversationId);
    } else {
      renderEmptyState();
      renderPendingActions([]);
    }
    aiState.loaded = true;
  } catch (error) {
    setAiStatus(error.message, true);
  }
}

async function handleAiAction(actionId, action) {
  if (aiState.busy) return;
  aiState.busy = true;
  for (const button of aiElements.pendingActions.querySelectorAll('button')) button.disabled = true;
  setAiStatus(action === 'confirm' ? 'Menyimpan perubahan...' : 'Membatalkan tindakan...');
  try {
    const result = await aiRequest(`/api/ai/actions/${encodeURIComponent(actionId)}/${action}`, { method: 'POST' });
    setAiStatus(result?.message || 'Selesai.');
    if (aiState.conversationId) await openAiConversation(aiState.conversationId);
    if (result?.sensitiveOutput) renderSensitiveOutput(result.sensitiveOutput);
    await loadAiConversationListOnly();
  } catch (error) {
    setAiStatus(error.message, true);
    if (aiState.conversationId) await openAiConversation(aiState.conversationId);
  } finally {
    aiState.busy = false;
  }
}

async function loadAiConversationListOnly() {
  try {
    aiState.conversations = await aiRequest('/api/ai/conversations') || [];
    renderConversationList();
  } catch (error) {
    setAiStatus(error.message, true);
  }
}

async function deleteAiConversation() {
  if (!aiState.conversationId || aiState.busy) return;
  if (!window.confirm('Padam sejarah perbualan ini?')) return;
  aiState.busy = true;
  try {
    await aiRequest(`/api/ai/conversations/${encodeURIComponent(aiState.conversationId)}`, { method: 'DELETE' });
    aiState.conversationId = null;
    localStorage.removeItem('segak_ai_conversation_id');
    renderEmptyState();
    renderPendingActions([]);
    await loadAiConversationListOnly();
    setAiStatus('Sejarah perbualan dipadam.');
  } catch (error) {
    setAiStatus(error.message, true);
  } finally {
    aiState.busy = false;
  }
}

aiElements.form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (aiState.busy || !aiElements.input) return;
  if (aiElements.pendingActions?.children.length) {
    setAiStatus('Sahkan atau batalkan tindakan yang sedang menunggu sebelum menghantar mesej baharu.');
    return;
  }
  const message = aiElements.input.value.trim();
  if (!message) return;
  if (message.includes('[isi nama kelas]')) {
    setAiStatus('Gantikan [isi nama kelas] dengan nama kelas sebelum menghantar.', true);
    return;
  }

  aiState.busy = true;
  aiElements.send.disabled = true;
  aiElements.input.disabled = true;
  appendAiMessage('user', message);
  aiElements.input.value = '';
  setAiStatus('Pembantu sedang menyediakan jawapan...');
  try {
    const body = { message, ...(aiState.conversationId ? { conversationId: aiState.conversationId } : {}) };
    const result = await aiRequest('/api/ai/chat', { method: 'POST', body: JSON.stringify(body) });
    aiState.conversationId = result.conversationId;
    localStorage.setItem('segak_ai_conversation_id', result.conversationId);
    appendAiMessage('assistant', result.reply);
    if (result.pendingAction) renderPendingActions([result.pendingAction]);
    setAiStatus('');
    await loadAiConversationListOnly();
  } catch (error) {
    setAiStatus(error.message, true);
  } finally {
    aiState.busy = false;
    aiElements.send.disabled = false;
    aiElements.input.disabled = false;
    aiElements.input.focus();
  }
});

aiElements.newConversation?.addEventListener('click', () => {
  setAiHistoryOpen(false);
  aiState.conversationId = null;
  localStorage.removeItem('segak_ai_conversation_id');
  clearSensitiveOutput();
  renderConversationList();
  renderEmptyState();
  renderPendingActions([]);
  setAiStatus('');
  aiElements.input?.focus();
});

aiElements.historyToggle?.addEventListener('click', () => {
  setAiHistoryOpen(aiElements.conversationList.hidden);
});

aiElements.csvAttach?.addEventListener('click', () => aiElements.csvInput?.click());
aiElements.csvInput?.addEventListener('change', async () => {
  const file = aiElements.csvInput.files?.[0];
  if (!file || !aiElements.input) return;
  try {
    if (file.size > 3500) throw new Error('Fail terlalu besar. Gunakan maksimum 10 murid dan 3,500 bait setiap import.');
    const text = (await file.text()).replace(/^\uFEFF/, '').trim();
    const lines = text.split(/\r?\n/).filter((line) => line.trim());
    const header = (lines[0] || '').split(',').map((value) => value.trim().replace(/^"|"$/g, '').toLowerCase());
    const supported = [['studentidnum', 'fullname', 'gender', 'dob'], ['id_murid', 'nama', 'jantina', 'tarikh_lahir']];
    if (!supported.some((columns) => columns.every((column, index) => header[index] === column) && header.length === columns.length)) throw new Error('CSV mesti ada empat lajur: studentIdNum, fullName, gender, dob.');
    if (lines.length < 2 || lines.length > 11) throw new Error('CSV mesti mengandungi 1 hingga 10 baris murid, satu murid setiap baris.');
    const prompt = `[SMARTFIT_CSV_ROWS=${lines.length - 1}] Sediakan import ${lines.length - 1} murid ke kelas [isi nama kelas]. Semak semua baris dan jangan abaikan mana-mana murid:\n${text}`;
    if (prompt.length > 4000) throw new Error('Kandungan CSV terlalu panjang untuk satu import.');
    aiElements.input.value = prompt;
    aiElements.input.focus();
    setAiStatus('Gantikan [isi nama kelas], kemudian semak pratonton sebelum sahkan. CSV akan dihantar kepada DeepSeek.');
  } catch (error) {
    setAiStatus(error.message || 'Fail CSV tidak dapat dibaca.', true);
  } finally {
    aiElements.csvInput.value = '';
  }
});

aiElements.deleteConversation?.addEventListener('click', deleteAiConversation);
window.loadAiConversations = loadAiConversations;
