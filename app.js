const STORAGE_KEY = 'devrelay_v2';

const DEV_COLORS = [
    '#059669', '#2563eb', '#e11d48', '#d97706',
    '#7c3aed', '#0d9488', '#ea580c', '#0284c7',
    '#db2777', '#16a34a'
];

let state = {
    users: [],
    currentUser: null,
    posts: [],
    seenPosts: {},
};

function save() {
    const s = { ...state, seenPosts: {} };
    for (const [k, v] of Object.entries(state.seenPosts)) {
        s.seenPosts[k] = [...v];
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

function load() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const s = JSON.parse(raw);
        state.users = s.users || [];
        state.currentUser = s.currentUser || null;
        state.posts = s.posts || [];
        for (const [k, v] of Object.entries(s.seenPosts || {})) {
            state.seenPosts[k] = new Set(v);
        }
    } catch (e) { console.warn('Load error', e); }
}

const uid = () => Math.random().toString(36).slice(2, 9);
const now = () => Date.now();

function getUser(id) {
    return state.users.find(u => u.id === id);
}

function getUserSeen(userId) {
    if (!userId) return new Set();
    if (!state.seenPosts[userId]) state.seenPosts[userId] = new Set();
    return state.seenPosts[userId];
}

function markSeen(userId, postId) {
    if (!userId) return;
    getUserSeen(userId).add(postId);
    save();
}

function unseenCount(userId, filter) {
    if (!userId) return 0;
    const seen = getUserSeen(userId);
    return state.posts.filter(p => {
        if (p.authorId === userId) return false;
        if (filter && p.type !== filter) return false;
        return !seen.has(p.id);
    }).length;
}

function initials(name) {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function formatTime(ts) {
    const d = new Date(ts);
    const now2 = new Date();
    const diffMs = now2 - d;
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'agora';
    if (mins < 60) return `${mins}m atrás`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h atrás`;
    return d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' });
}

function priorityLabel(p) {
    return { low: 'Baixa', medium: 'Média', high: 'Alta', critical: 'Crítica 🔥' }[p] || p;
}

function typeLabel(t) {
    return { task: 'Tarefa', report: 'Report', message: 'Mensagem', standup: 'Relatório' }[t] || t;
}

function startClock() {
    const el = document.getElementById('clock');
    const tick = () => {
        const d = new Date();
        el.textContent = d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };
    tick();
    setInterval(tick, 1000);
}

function renderSidebar() {
    const tabs = document.getElementById('userTabs');
    if (state.users.length === 0) {
        tabs.innerHTML = `<span style="color:var(--fg-dim);font-size:11px;">Nenhum dev registado</span>`;
    } else {
        tabs.innerHTML = state.users.map(u => `
      <button class="user-tab ${u.id === state.currentUser ? 'active' : ''}"
              style="${u.id === state.currentUser ? `background:${u.color}; color:#ffffff;` : ''}"
              data-uid="${u.id}">${u.name}</button>
    `).join('');
    }

    const list = document.getElementById('devsList');
    list.innerHTML = state.users.map(u => `
    <div class="dev-item">
      <div class="dev-avatar" style="background:${u.color};color:#fff;">${initials(u.name)}</div>
      <span class="dev-name">${u.name}</span>
      <span class="dev-dot" style="background:${u.color};box-shadow:0 0 6px ${u.color};"></span>
    </div>
  `).join('');

    const feedUnseen = unseenCount(state.currentUser, null);
    const taskUnseen = unseenCount(state.currentUser, 'task');
    document.getElementById('badgeFeed').textContent = feedUnseen || '';
    document.getElementById('badgeTasks').textContent = taskUnseen || '';

    const sel = document.getElementById('inputAssignee');
    const cur = sel.value;
    sel.innerHTML = `<option value="">— ninguém —</option>` +
        state.users.map(u => `<option value="${u.id}" ${u.id === cur ? 'selected' : ''}>${u.name}</option>`).join('');

    const ml = document.getElementById('mentionsList');
    ml.innerHTML = state.users
        .filter(u => u.id !== state.currentUser)
        .map(u => `
      <button class="mention-toggle" data-uid="${u.id}">
        <span class="m-avatar" style="background:${u.color};color:#fff;">${initials(u.name)}</span>
        ${u.name}
      </button>
    `).join('');
}

function renderPostCard(post) {
    const author = getUser(post.authorId);
    if (!author) return '';
    const seen = getUserSeen(state.currentUser);
    const isNew = state.currentUser && post.authorId !== state.currentUser && !seen.has(post.id);
    const mentions = (post.mentions || []).map(id => {
        const u = getUser(id);
        return u ? `<span class="mention-chip">@${u.name}</span>` : '';
    }).join('');

    const reactions = Object.entries(post.reactions || {}).map(([emoji, users]) => {
        const reacted = state.currentUser && users.includes(state.currentUser);
        return `<button class="reaction-btn ${reacted ? 'reacted' : ''}" data-post="${post.id}" data-emoji="${emoji}">
      ${emoji} <span>${users.length}</span>
    </button>`;
    }).join('');

    const addReaction = `
    <button class="reaction-btn add-reaction-btn" data-post="${post.id}">+ 😊</button>
  `;

    let extra = '';
    if (post.type === 'task') {
        const assignee = post.assigneeId ? getUser(post.assigneeId) : null;
        extra = `
      <div style="display:flex;gap:6px;align-items:center;margin-top:8px;flex-wrap:wrap;">
        <span class="priority-badge priority-${post.priority}">${priorityLabel(post.priority)}</span>
        ${assignee ? `<span class="assignee-tag">→ ${assignee.name}</span>` : ''}
        ${post.status !== 'done' ? `<button class="task-status-btn" data-post="${post.id}" data-action="advance">
          ${post.status === 'todo' ? '▶ Iniciar' : '✓ Concluir'}
        </button>` : '<span class="assignee-tag" style="color:var(--accent)">✓ Concluído</span>'}
      </div>
    `;
    }

    const isOwner = state.currentUser === post.authorId;
    const deleteBtn = isOwner
        ? `<button class="delete-btn" data-post="${post.id}" title="Excluir postagem">❌</button>`
        : '';

    return `
        <div class="post-card" data-type="${post.type}" data-id="${post.id}"
             style="${isNew ? 'border-color:var(--border2);' : ''}">
          <div class="post-header">
            <div class="dev-avatar" style="background:${author.color};color:#fff;">${initials(author.name)}</div>
            <div class="post-meta">
              <span class="post-author">${author.name}</span>
              <span class="post-time">${formatTime(post.ts)}</span>
            </div>
            <span class="post-type-badge type-${post.type}">${typeLabel(post.type)}</span>
            ${deleteBtn}
          </div>
    
          ${post.title ? `<div class="post-title">${escapeHtml(post.title)}</div>` : ''}
    
          ${post.type !== 'standup'
            ? `<div class="post-content">${escapeHtml(post.content)}</div>`
            : ''
        }
    
          ${extra}
    
          <div class="post-footer">
            <div class="post-mentions">${mentions}</div>
            <div class="reaction-bar">${reactions}${addReaction}</div>
          </div>
        </div>
    `;
}

function escapeHtml(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

let feedFilter = 'all';

function renderFeed() {
    const list = document.getElementById('feedList');
    let posts = [...state.posts].sort((a, b) => b.ts - a.ts);
    if (feedFilter !== 'all') posts = posts.filter(p => p.type === feedFilter);

    if (!posts.length) {
        list.innerHTML = `<div class="empty-state"><div class="empty-icon">◈</div><p>Nenhuma postagem ainda</p></div>`;
        return;
    }

    list.innerHTML = posts.map(renderPostCard).join('');
    if (state.currentUser) {
        posts.forEach(p => markSeen(state.currentUser, p.id));
    }
}

function renderTasks() {
    const cols = document.getElementById('taskColumns');
    const tasks = state.posts.filter(p => p.type === 'task');
    const todo = tasks.filter(t => t.status === 'todo');
    const doing = tasks.filter(t => t.status === 'doing');
    const done = tasks.filter(t => t.status === 'done');

    const renderCol = (items, label, cls) => {
        const cards = items.sort((a, b) => b.ts - a.ts).map(t => {
            const author = getUser(t.authorId);
            const assignee = t.assigneeId ? getUser(t.assigneeId) : null;
            const nextLabel = { todo: '▶ Iniciar', doing: '✓ Concluir' };
            const isOwner = state.currentUser === t.authorId;
            return `
        <div class="task-card" data-id="${t.id}">
          <div class="task-card-header">
            <div class="task-card-title">${escapeHtml(t.title || t.content.slice(0, 60))}</div>
            ${isOwner ? `<button class="delete-btn small" data-post="${t.id}" title="Excluir tarefa">❌</button>` : ''}
          </div>
          <div class="task-card-meta">
            <span class="priority-badge priority-${t.priority}">${priorityLabel(t.priority)}</span>
            ${assignee ? `<span class="assignee-tag">→ ${assignee.name}</span>` : ''}
          </div>
          ${author ? `<div class="task-card-author">por ${author.name} · ${formatTime(t.ts)}</div>` : ''}
          ${t.status !== 'done' ? `<button class="task-status-btn" data-post="${t.id}" data-action="advance">${nextLabel[t.status]}</button>` : ''}
        </div>
      `;
        }).join('') || `<div class="empty-state" style="padding:30px 10px"><div class="empty-icon" style="font-size:24px">□</div><p>vazio</p></div>`;

        return `
      <div class="task-col col-${cls}">
        <div class="col-header">
          <span class="col-title">${label}</span>
          <span class="col-count">${items.length}</span>
        </div>
        <div class="col-body">${cards}</div>
      </div>
    `;
    };

    cols.innerHTML =
        renderCol(todo, 'A Fazer', 'todo') +
        renderCol(doing, 'Em Progresso', 'doing') +
        renderCol(done, 'Concluído', 'done');

    if (state.currentUser) {
        tasks.forEach(t => markSeen(state.currentUser, t.id));
    }
}

function renderReports() {
    const list = document.getElementById('reportsList');
    const reports = state.posts.filter(p => p.type === 'report').sort((a, b) => b.ts - a.ts);

    if (!reports.length) {
        list.innerHTML = `<div class="empty-state"><div class="empty-icon">◫</div><p>Nenhum report ainda</p></div>`;
        return;
    }
    list.innerHTML = reports.map(renderPostCard).join('');
    if (state.currentUser) {
        reports.forEach(p => markSeen(state.currentUser, p.id));
    }
}

function renderStandups() {
    const grid = document.getElementById('standupGrid');
    const standups = state.posts.filter(p => p.type === 'standup').sort((a, b) => b.ts - a.ts);

    if (!standups.length) {
        grid.innerHTML = `<div class="empty-state"><div class="empty-icon">◩</div><p>Nenhum relatório ainda</p></div>`;
        return;
    }

    grid.innerHTML = standups.map(p => {
        const author = getUser(p.authorId);
        if (!author) return '';
        const isOwner = state.currentUser === p.authorId;
        const dateStr = p.date || new Date(p.ts).toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        return `
      <div class="standup-card" data-id="${p.id}">
        <div class="standup-header">
          <div class="dev-avatar" style="background:${author.color};color:#fff;">${initials(author.name)}</div>
          <div style="flex:1;min-width:0;">
            <div class="standup-name">${author.name}</div>
            <div class="standup-date-full">${dateStr}</div>
          </div>
          ${isOwner ? `<button class="delete-btn" data-post="${p.id}" title="Excluir">🗑</button>` : ''}
        </div>
        ${p.title ? `<div class="standup-title">${escapeHtml(p.title)}</div>` : ''}
        <div class="standup-section today">
          <div class="standup-section-label">🎯 O que fiz hoje</div>
          <div class="standup-text">${escapeHtml(p.today || p.content || '—')}</div>
        </div>
        ${p.blockers ? `
        <div class="standup-section blockers">
          <div class="standup-section-label">🚧 Problemas / Blockers</div>
          <div class="standup-text">${escapeHtml(p.blockers)}</div>
        </div>` : `
        <div class="standup-section no-blockers">
          <div class="standup-section-label">✅ Sem blockers</div>
        </div>`}
      </div>
    `;
    }).join('');

    if (state.currentUser) {
        standups.forEach(p => markSeen(state.currentUser, p.id));
    }
}

let currentView = 'feed';

function showView(name) {
    currentView = name;
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(`view-${name}`).classList.add('active');
    document.querySelectorAll('.nav-item').forEach(b => {
        b.classList.toggle('active', b.dataset.view === name);
    });

    const titles = { feed: 'Feed Geral', tasks: 'Tarefas', reports: 'Reports', standup: 'Relatórios' };
    const subs = { feed: 'todas as atualizações', tasks: 'kanban da equipe', reports: 'reports da equipe', standup: 'relatórios do dia' };
    document.getElementById('viewTitle').textContent = titles[name];
    document.getElementById('viewSub').textContent = subs[name];

    renderAll();
}

function renderAll() {
    renderSidebar();
    if (currentView === 'feed') renderFeed();
    if (currentView === 'tasks') renderTasks();
    if (currentView === 'reports') renderReports();
    if (currentView === 'standup') renderStandups();
}

let selectedType = 'message';
let selectedMentions = new Set();
let selectedColor = DEV_COLORS[0];

function openModal() {
    if (!state.currentUser) {
        toast('Por favor, adiciona ou seleciona um dev primeiro!', 'error');
        return;
    }
    document.getElementById('modalOverlay').classList.add('active');
    renderSidebar();
    bindMentions();
    if (['tasks', 'reports', 'standup'].includes(currentView)) {
        const map = { tasks: 'task', reports: 'report', standup: 'standup' };
        selectType(map[currentView] || 'message');
    } else {
        selectType('message');
    }
}

function closeModal() {
    document.getElementById('modalOverlay').classList.remove('active');
    document.getElementById('inputTitle').value = '';
    document.getElementById('inputContent').value = '';
    document.getElementById('inputToday').value = '';
    document.getElementById('inputBlockers').value = '';
    selectedMentions = new Set();
    renderSidebar();
}

function selectType(t) {
    selectedType = t;
    document.querySelectorAll('.type-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.type === t);
    });
    document.getElementById('extraTask').classList.toggle('hidden', t !== 'task');
    document.getElementById('extraStandup').classList.toggle('hidden', t !== 'standup');
    document.getElementById('fieldContent').style.display = (t === 'standup') ? 'none' : '';
    // standup tem título próprio (o que fez hoje vira o título)
    if (t === 'standup') {
        document.getElementById('fieldTitle').style.display = '';
        document.getElementById('inputTitle').placeholder = 'Título do relatório (ex: Deploy API v2, Fix bug login...)';
    } else {
        document.getElementById('inputTitle').placeholder = 'Título da postagem...';
    }
}

function bindMentions() {
    document.querySelectorAll('.mention-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
            const uid2 = btn.dataset.uid;
            if (selectedMentions.has(uid2)) {
                selectedMentions.delete(uid2);
                btn.classList.remove('active');
            } else {
                selectedMentions.add(uid2);
                btn.classList.add('active');
            }
        });
    });
}

function submitPost() {
    if (!state.currentUser) {
        toast('Por favor, adiciona ou seleciona um dev primeiro!', 'error');
        return;
    }

    const content = document.getElementById('inputContent').value.trim();
    const title = document.getElementById('inputTitle').value.trim();

    if (selectedType !== 'standup' && !content) {
        toast('Escreve algo primeiro!', 'error');
        return;
    }
    if (selectedType === 'standup' && !document.getElementById('inputToday').value.trim()) {
        toast('Descreve o que fez hoje!', 'error');
        return;
    }

    const post = {
        id: uid(),
        authorId: state.currentUser,
        type: selectedType,
        title: title,
        content: content,
        mentions: [...selectedMentions],
        reactions: {},
        ts: now(),
    };

    if (selectedType === 'task') {
        post.priority = document.getElementById('inputPriority').value;
        post.assigneeId = document.getElementById('inputAssignee').value || null;
        post.status = 'todo';
    }

    if (selectedType === 'standup') {
        post.today = document.getElementById('inputToday').value.trim();
        post.blockers = document.getElementById('inputBlockers').value.trim();
        post.content = post.today || '';
        post.date = new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }

    state.posts.unshift(post);
    markSeen(state.currentUser, post.id);
    save();
    closeModal();
    renderAll();
    toast('Publicado com sucesso!', 'success');
}

function advanceTask(postId) {
    const task = state.posts.find(p => p.id === postId);
    if (!task) return;
    const next = { todo: 'doing', doing: 'done' };
    if (next[task.status]) {
        task.status = next[task.status];
        save();
        renderAll();
        toast(`Tarefa movida para ${typeLabel(task.status) || task.status}!`, 'info');
    }
}

function deletePost(postId) {
    const post = state.posts.find(p => p.id === postId);
    if (!post) return;
    if (post.authorId !== state.currentUser) {
        toast('Só o autor pode excluir esta postagem!', 'error');
        return;
    }
    state.posts = state.posts.filter(p => p.id !== postId);
    save();
    renderAll();
    toast('Postagem excluída.', 'info');
}

const EMOJIS = ['🖕', '🔥', '✅', '🚀', '💡', '❓', '😅', '🤝', '🧑‍💻', '😈', '💀'];

function addReaction(postId, emoji) {
    if (!state.currentUser) {
        toast('Adiciona um dev para reagir!', 'error');
        return;
    }
    const post = state.posts.find(p => p.id === postId);
    if (!post) return;
    if (!post.reactions[emoji]) post.reactions[emoji] = [];
    const idx = post.reactions[emoji].indexOf(state.currentUser);
    if (idx > -1) {
        post.reactions[emoji].splice(idx, 1);
        if (!post.reactions[emoji].length) delete post.reactions[emoji];
    } else {
        post.reactions[emoji].push(state.currentUser);
    }
    save();
    renderAll();
}

function showEmojiPicker(postId, btn) {
    if (!state.currentUser) {
        toast('Adiciona um dev para reagir!', 'error');
        return;
    }
    const existing = document.getElementById('emoji-picker-popup');
    if (existing) existing.remove();

    const picker = document.createElement('div');
    picker.id = 'emoji-picker-popup';
    picker.style.cssText = `
    position:fixed; background:var(--bg2); border:1px solid var(--border2);
    border-radius:8px; padding:8px; display:flex; gap:6px; flex-wrap:wrap;
    width:180px; box-shadow:0 8px 24px rgba(0,0,0,0.5); z-index:9999;
  `;
    const rect = btn.getBoundingClientRect();
    picker.style.top = `${rect.top - 54}px`;
    picker.style.left = `${rect.left}px`;

    picker.innerHTML = EMOJIS.map(e =>
        `<button onclick="addReaction('${postId}','${e}'); this.closest('#emoji-picker-popup').remove();"
     style="background:none;border:none;cursor:pointer;font-size:18px;padding:3px;border-radius:4px;"
     onmouseover="this.style.background='var(--bg3)'"
     onmouseout="this.style.background='none'">${e}</button>`
    ).join('');

    document.body.appendChild(picker);
    setTimeout(() => document.addEventListener('click', function handler(e) {
        if (!picker.contains(e.target)) { picker.remove(); document.removeEventListener('click', handler); }
    }), 50);
}

function openAddUser() {
    selectedColor = DEV_COLORS[0];
    const cp = document.getElementById('colorPicker');
    cp.innerHTML = DEV_COLORS.map((c, i) =>
        `<div class="color-dot ${i === 0 ? 'selected' : ''}" style="background:${c}" data-color="${c}"></div>`
    ).join('');
    cp.querySelectorAll('.color-dot').forEach(d => {
        d.addEventListener('click', () => {
            selectedColor = d.dataset.color;
            cp.querySelectorAll('.color-dot').forEach(x => x.classList.remove('selected'));
            d.classList.add('selected');
        });
    });
    document.getElementById('modalUserOverlay').classList.add('active');
    document.getElementById('inputNewUser').value = '';
    document.getElementById('inputNewUser').focus();
}

function closeAddUser() {
    document.getElementById('modalUserOverlay').classList.remove('active');
}

function confirmAddUser() {
    const name = document.getElementById('inputNewUser').value.trim();
    if (!name) { toast('Digita o nome do dev!', 'error'); return; }
    const id = uid();
    state.users.push({ id, name, color: selectedColor });
    state.currentUser = id;
    save();
    closeAddUser();
    renderAll();
    toast(`Bem-vindo(a), ${name}!`, 'success');
}

function toast(msg, type = 'info') {
    const icons = { success: '✅', error: '❌', info: 'ℹ️' };
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<span class="toast-icon">${icons[type]}</span>${msg}`;
    document.getElementById('toastContainer').appendChild(el);
    setTimeout(() => el.remove(), 3200);
}

document.addEventListener('click', e => {
    const delBtn = e.target.closest('.delete-btn');
    if (delBtn && delBtn.dataset.post) {
        if (confirm('Excluir esta postagem?')) deletePost(delBtn.dataset.post);
        return;
    }

    const tab = e.target.closest('.user-tab');
    if (tab) {
        state.currentUser = tab.dataset.uid;
        save();
        renderAll();
        return;
    }

    const nav = e.target.closest('.nav-item');
    if (nav) { showView(nav.dataset.view); return; }

    const adv = e.target.closest('[data-action="advance"]');
    if (adv) { advanceTask(adv.dataset.post); return; }

    const rxn = e.target.closest('.reaction-btn:not(.add-reaction-btn)');
    if (rxn && rxn.dataset.post) { addReaction(rxn.dataset.post, rxn.dataset.emoji); return; }

    const addRxn = e.target.closest('.add-reaction-btn');
    if (addRxn) { showEmojiPicker(addRxn.dataset.post, addRxn); return; }

    const filt = e.target.closest('.filter-btn');
    if (filt) {
        feedFilter = filt.dataset.filter;
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.toggle('active', b === filt));
        renderFeed();
        return;
    }

    const typeBtn = e.target.closest('.type-btn');
    if (typeBtn) { selectType(typeBtn.dataset.type); return; }
});

document.getElementById('btnNewPost').addEventListener('click', openModal);
document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('btnCancel').addEventListener('click', closeModal);
document.getElementById('btnSubmit').addEventListener('click', submitPost);
document.getElementById('btnAddUser').addEventListener('click', openAddUser);
document.getElementById('modalUserClose').addEventListener('click', closeAddUser);
document.getElementById('btnCancelUser').addEventListener('click', closeAddUser);
document.getElementById('btnAddUserConfirm').addEventListener('click', confirmAddUser);

document.getElementById('modalOverlay').addEventListener('click', e => {
    if (e.target === document.getElementById('modalOverlay')) closeModal();
});
document.getElementById('modalUserOverlay').addEventListener('click', e => {
    if (e.target === document.getElementById('modalUserOverlay')) closeAddUser();
});

document.getElementById('inputNewUser').addEventListener('keydown', e => {
    if (e.key === 'Enter') confirmAddUser();
});

document.addEventListener('keydown', e => {
    if (e.key === 'n' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
        openModal();
    }
});

// Inicialização da aplicação
load();
startClock();
renderAll();