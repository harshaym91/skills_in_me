const STORAGE_KEY = 'daymark-workspace-v1';
const today = new Date();
const isoToday = today.toISOString().slice(0, 10);
const formatDate = (value) => value ? new Date(`${value}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'No date';
const dateLabel = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase();
const makeId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const seed = {
  projects: [
    { id: 'proj-studio', name: 'Studio refresh', color: 'sage' },
    { id: 'proj-personal', name: 'Personal', color: 'coral' },
    { id: 'proj-learning', name: 'Learning', color: 'blue' }
  ],
  tasks: [
    { id: 'task-1', title: 'Send revised project brief to Maya', notes: '', projectId: 'proj-studio', priority: 'high', due: isoToday, completed: false, createdAt: Date.now() - 40000 },
    { id: 'task-2', title: 'Book dentist appointment', notes: '', projectId: 'proj-personal', priority: 'medium', due: isoToday, completed: false, createdAt: Date.now() - 30000 },
    { id: 'task-3', title: 'Read chapter four of The Creative Act', notes: '', projectId: 'proj-learning', priority: 'low', due: '2026-09-12', completed: false, createdAt: Date.now() - 20000 },
    { id: 'task-4', title: 'Archive old research notes', notes: '', projectId: 'proj-studio', priority: 'low', due: '', completed: true, createdAt: Date.now() - 10000 }
  ]
};
let state = loadState();
let currentView = 'inbox';
let searchTerm = '';
let priorityFilter = 'all';
let sortMode = 'smart';
const $ = (selector) => document.querySelector(selector);
const taskList = $('#task-list');

function loadState() { try { const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)); if (saved?.tasks && saved?.projects) return saved; } catch (error) {} return structuredClone(seed); }
function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); fetch('/api/state', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(state) }).catch(() => {}); }
async function syncFromApi() { try { const response = await fetch('/api/state'); if (!response.ok) return; const remoteState = await response.json(); if (remoteState?.tasks && remoteState?.projects) { state = remoteState; localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); render(); } } catch (error) {} }
function projectById(id) { return state.projects.find((project) => project.id === id); }
function activeTasks() { return state.tasks.filter((task) => !task.completed); }
function viewTasks() {
  let tasks = state.tasks.slice();
  if (currentView === 'today') tasks = tasks.filter((task) => task.due === isoToday && !task.completed);
  if (currentView === 'upcoming') tasks = tasks.filter((task) => task.due > isoToday && !task.completed);
  if (currentView === 'completed') tasks = tasks.filter((task) => task.completed);
  if (currentView.startsWith('project:')) tasks = tasks.filter((task) => task.projectId === currentView.slice(8) && !task.completed);
  if (searchTerm) tasks = tasks.filter((task) => `${task.title} ${task.notes}`.toLowerCase().includes(searchTerm.toLowerCase()));
  if (priorityFilter !== 'all') tasks = tasks.filter((task) => task.priority === priorityFilter);
  const priority = { high: 0, medium: 1, low: 2 };
  tasks.sort((a, b) => { if (sortMode === 'newest') return b.createdAt - a.createdAt; if (sortMode === 'priority') return priority[a.priority] - priority[b.priority]; if (sortMode === 'due') return (a.due || '9999').localeCompare(b.due || '9999'); if (a.completed !== b.completed) return Number(a.completed) - Number(b.completed); return priority[a.priority] - priority[b.priority] || (a.due || '9999').localeCompare(b.due || '9999'); });
  return tasks;
}
function viewCopy() { const project = currentView.startsWith('project:') ? projectById(currentView.slice(8)) : null; return project ? { title: project.name, subtitle: 'A focused view of this project.' } : ({ inbox: { title: 'Inbox', subtitle: 'Everything that needs your attention.' }, today: { title: 'Today', subtitle: 'A clear view of what matters today.' }, upcoming: { title: 'Upcoming', subtitle: 'Stay one step ahead of what is next.' }, completed: { title: 'Completed', subtitle: 'A record of progress worth keeping.' } }[currentView]); }
function render() { renderNavigation(); renderHeader(); renderTasks(); renderSummary(); }
function renderNavigation() {
  document.querySelectorAll('.nav-item[data-view]').forEach((button) => button.classList.toggle('active', button.dataset.view === currentView));
  $('#project-list').innerHTML = state.projects.map((project) => `<button class="project-item ${currentView === `project:${project.id}` ? 'active' : ''}" data-project="${project.id}"><span class="project-dot ${project.color}"></span><span>${escapeHtml(project.name)}</span><span class="project-count">${state.tasks.filter((task) => task.projectId === project.id && !task.completed).length}</span></button>`).join('');
  document.querySelectorAll('.project-item').forEach((button) => button.addEventListener('click', () => { currentView = `project:${button.dataset.project}`; render(); }));
  const counts = { inbox: activeTasks().length, today: activeTasks().filter((task) => task.due === isoToday).length, upcoming: activeTasks().filter((task) => task.due > isoToday).length, completed: state.tasks.filter((task) => task.completed).length };
  Object.entries(counts).forEach(([key, value]) => { $(`[data-count="${key}"]`).textContent = value; });
}
function renderHeader() { const copy = viewCopy(); $('#breadcrumb-title').textContent = copy.title; $('#page-title').textContent = copy.title; $('#page-subtitle').textContent = copy.subtitle; $('#date-kicker').textContent = dateLabel; }
function renderSummary() { const total = state.tasks.length; const complete = state.tasks.filter((task) => task.completed).length; const percent = total ? Math.round(complete / total * 100) : 0; $('#progress-label').textContent = `${complete} of ${total} complete`; $('#progress-bar').style.width = `${percent}%`; $('#focus-message').textContent = activeTasks().length ? `${activeTasks().length} active ${activeTasks().length === 1 ? 'task' : 'tasks'} across your workspace.` : 'You have a clear runway today.'; }
function renderTasks() { const tasks = viewTasks(); $('#visible-count').textContent = tasks.length; taskList.innerHTML = tasks.map(taskTemplate).join(''); const empty = tasks.length === 0; $('#empty-state').classList.toggle('hidden', !empty); $('#empty-title').textContent = searchTerm ? 'No tasks found' : currentView === 'completed' ? 'Nothing completed yet' : 'Your list is clear'; $('#empty-copy').textContent = searchTerm ? 'Try a different search or clear the filters.' : 'A quiet inbox is a good place to start. Add a task whenever something comes to mind.'; document.querySelectorAll('[data-action="toggle"]').forEach((button) => button.addEventListener('click', () => toggleTask(button.dataset.id))); document.querySelectorAll('[data-action="edit"]').forEach((button) => button.addEventListener('click', () => openTaskDialog(button.dataset.id))); document.querySelectorAll('[data-action="delete"]').forEach((button) => button.addEventListener('click', () => deleteTask(button.dataset.id))); }
function taskTemplate(task) { const project = projectById(task.projectId); const overdue = task.due && task.due < isoToday && !task.completed; return `<article class="task-row ${task.completed ? 'done' : ''}"><button class="check-button" data-action="toggle" data-id="${task.id}" aria-label="Mark ${escapeHtml(task.title)} ${task.completed ? 'active' : 'complete'}">${task.completed ? '✓' : ''}</button><div class="task-main"><p class="task-title">${escapeHtml(task.title)}</p><div class="task-meta"><span class="priority-badge ${task.priority}">${task.priority}</span>${project ? `<span>${escapeHtml(project.name)}</span>` : ''}${task.due ? `<span class="due-date ${overdue ? 'overdue' : ''}">${overdue ? 'Overdue · ' : ''}${formatDate(task.due)}</span>` : ''}</div></div><div class="task-actions"><button data-action="edit" data-id="${task.id}" aria-label="Edit task">✎</button><button data-action="delete" data-id="${task.id}" aria-label="Delete task">×</button></div></article>`; }
function toggleTask(id) { const task = state.tasks.find((item) => item.id === id); if (task) task.completed = !task.completed; saveState(); render(); }
function deleteTask(id) { state.tasks = state.tasks.filter((task) => task.id !== id); saveState(); render(); }
function openTaskDialog(id = '') { const task = state.tasks.find((item) => item.id === id); $('#task-form').reset(); $('#task-id').value = id; $('#dialog-title').textContent = task ? 'Edit task' : 'Add a new task'; $('#task-title').value = task?.title || ''; $('#task-notes').value = task?.notes || ''; $('#task-priority').value = task?.priority || 'medium'; $('#task-due').value = task?.due || ''; $('#task-project').innerHTML = `<option value="">No project</option>${state.projects.map((project) => `<option value="${project.id}">${escapeHtml(project.name)}</option>`).join('')}`; $('#task-project').value = task?.projectId || ''; $('#task-dialog').showModal(); setTimeout(() => $('#task-title').focus(), 50); }
function saveTask(event) { event.preventDefault(); const data = { title: $('#task-title').value.trim(), notes: $('#task-notes').value.trim(), projectId: $('#task-project').value, priority: $('#task-priority').value, due: $('#task-due').value }; if (!data.title) return; const id = $('#task-id').value; if (id) Object.assign(state.tasks.find((task) => task.id === id), data); else state.tasks.unshift({ ...data, id: makeId('task'), completed: false, createdAt: Date.now() }); saveState(); $('#task-dialog').close(); render(); }
function addProject(event) { event.preventDefault(); const name = $('#project-name').value.trim(); if (!name) return; state.projects.push({ id: makeId('project'), name, color: $('#project-color').value }); saveState(); $('#project-dialog').close(); $('#project-form').reset(); render(); }
function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char])); }

document.querySelectorAll('.nav-item[data-view]').forEach((button) => button.addEventListener('click', () => { currentView = button.dataset.view; render(); }));
$('#quick-add').addEventListener('click', () => openTaskDialog()); $('#empty-add').addEventListener('click', () => openTaskDialog()); $('#task-form').addEventListener('submit', saveTask); $('#project-form').addEventListener('submit', addProject); $('#add-project').addEventListener('click', () => $('#project-dialog').showModal()); $('#clear-completed').addEventListener('click', () => { state.tasks = state.tasks.filter((task) => !task.completed); saveState(); render(); }); $('#search-input').addEventListener('input', (event) => { searchTerm = event.target.value; renderTasks(); }); $('#priority-filter').addEventListener('change', (event) => { priorityFilter = event.target.value; renderTasks(); }); $('#sort-select').addEventListener('change', (event) => { sortMode = event.target.value; renderTasks(); }); $('#mobile-menu').addEventListener('click', () => $('.sidebar').classList.toggle('open')); document.addEventListener('click', (event) => { if (window.innerWidth <= 780 && event.target.closest('.sidebar') === null && !event.target.closest('#mobile-menu')) $('.sidebar').classList.remove('open'); });
render();
