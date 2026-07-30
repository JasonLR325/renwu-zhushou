/* ========================================
   任务助手 - 核心应用逻辑
   ======================================== */

// ============ 常量定义 ============

const PRIORITY_CONFIG = {
  'urgent-important': {
    label: '紧急重要',
    icon: '🔴',
    desc: '有明确截止日期，不做会有严重后果',
  },
  'important': {
    label: '重要不紧急',
    icon: '🟠',
    desc: '对长期目标很关键，短期不完成也能接受',
  },
  'urgent': {
    label: '紧急不重要',
    icon: '🟡',
    desc: '时间紧迫但影响不大，可快速处理',
  },
  'low': {
    label: '低优先级',
    icon: '⚪',
    desc: '有空再做，搁置也不影响大局',
  },
};

const PRIORITY_ORDER = ['urgent-important', 'important', 'urgent', 'low'];

const PRESET_PERIODS = [
  { id: 'preset-week', name: '本周', icon: '📅' },
  { id: 'preset-month', name: '本月', icon: '📆' },
  { id: 'preset-quarter', name: '本季度', icon: '🗓️' },
  { id: 'preset-year', name: '本年', icon: '📊' },
  { id: 'all', name: '全部', icon: '📋' },
];

// 新建任务时的截止日期快捷选项（包含工作日选项）
const DEADLINE_PRESETS = [
  { id: 'preset-week', name: '本周', icon: '📅' },
  { id: 'deadline-next-week', name: '下周', icon: '📅' },
  { id: 'deadline-week-wd', name: '本周(工作日)', icon: '💼' },
  { id: 'deadline-next-week-wd', name: '下周(工作日)', icon: '💼' },
  { id: 'preset-month', name: '本月', icon: '📆' },
  { id: 'deadline-month-wd', name: '本月(工作日)', icon: '💼' },
  { id: 'preset-quarter', name: '本季度', icon: '🗓️' },
  { id: 'preset-year', name: '本年', icon: '📊' },
];
const WORKDAY_IDS = new Set(['deadline-week-wd', 'deadline-next-week-wd', 'deadline-month-wd']);

// 2026年法定节假日放假日期
const HOLIDAYS_2026 = new Set([
  // 元旦 1月1日-3日
  '2026-01-01', '2026-01-02', '2026-01-03',
  // 春节 2月15日-23日
  '2026-02-15', '2026-02-16', '2026-02-17', '2026-02-18',
  '2026-02-19', '2026-02-20', '2026-02-21', '2026-02-22', '2026-02-23',
  // 清明节 4月4日-6日
  '2026-04-04', '2026-04-05', '2026-04-06',
  // 劳动节 5月1日-5日
  '2026-05-01', '2026-05-02', '2026-05-03', '2026-05-04', '2026-05-05',
  // 端午节 6月19日-21日
  '2026-06-19', '2026-06-20', '2026-06-21',
  // 中秋节 9月25日-27日
  '2026-09-25', '2026-09-26', '2026-09-27',
  // 国庆节 10月1日-7日
  '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04',
  '2026-10-05', '2026-10-06', '2026-10-07',
]);
// 2026年调休上班日（周末补班）
const WORKDAY_OVERRIDES_2026 = new Set([
  '2026-01-04',  // 元旦调休
  '2026-02-14', '2026-02-28',  // 春节调休
  '2026-05-09',  // 劳动节调休
  '2026-09-20', '2026-10-10',  // 国庆调休
]);

function isHoliday(d) {
  const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return HOLIDAYS_2026.has(key);
}
function isWorkdayDate(d) {
  const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  if (WORKDAY_OVERRIDES_2026.has(key)) return true;  // 调休补班
  const day = d.getDay();
  if (day === 0 || day === 6) return false;  // 周末
  return !isHoliday(d);  // 非节假日
}
function findLastWorkday(endDate, startDate) {
  const d = new Date(endDate);
  while (d >= startDate) {
    if (isWorkdayDate(d)) return new Date(d);
    d.setDate(d.getDate() - 1);
  }
  return new Date(endDate);
}

// 计算截止日期快捷选项对应的结束日期
function getDeadlineEndDate(presetId) {
  const now = new Date();

  switch (presetId) {
    case 'preset-week': {
      const day = now.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      const monday = new Date(now);
      monday.setDate(now.getDate() + diff);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(10, 0, 0, 0);
      return sunday;
    }
    case 'deadline-week-wd': {
      const day = now.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      const monday = new Date(now);
      monday.setDate(now.getDate() + diff);
      const friday = new Date(monday);
      friday.setDate(monday.getDate() + 4);
      const wd = findLastWorkday(friday, monday);
      wd.setHours(10, 0, 0, 0);
      return wd;
    }
    case 'deadline-next-week-wd': {
      const day = now.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      const nextMonday = new Date(now);
      nextMonday.setDate(now.getDate() + diff + 7);
      const nextFriday = new Date(nextMonday);
      nextFriday.setDate(nextMonday.getDate() + 4);
      const wd = findLastWorkday(nextFriday, nextMonday);
      wd.setHours(10, 0, 0, 0);
      return wd;
    }
    case 'deadline-next-week': {
      const day = now.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      const nextMonday = new Date(now);
      nextMonday.setDate(now.getDate() + diff + 7);
      const nextSunday = new Date(nextMonday);
      nextSunday.setDate(nextMonday.getDate() + 6);
      nextSunday.setHours(10, 0, 0, 0);
      return nextSunday;
    }
    case 'preset-month': {
      const end = new Date(now);
      end.setMonth(end.getMonth() + 1);
      end.setDate(0);
      end.setHours(10, 0, 0, 0);
      return end;
    }
    case 'deadline-month-wd': {
      const monthEnd = new Date(now);
      monthEnd.setMonth(monthEnd.getMonth() + 1);
      monthEnd.setDate(0);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const wd = findLastWorkday(monthEnd, monthStart);
      wd.setHours(10, 0, 0, 0);
      return wd;
    }
    case 'preset-quarter': {
      const qm = Math.floor(now.getMonth() / 3) * 3;
      const end = new Date(now);
      end.setMonth(qm + 3);
      end.setDate(0);
      end.setHours(10, 0, 0, 0);
      return end;
    }
    case 'preset-year': {
      const end = new Date(now);
      end.setMonth(11);
      end.setDate(31);
      end.setHours(10, 0, 0, 0);
      return end;
    }
    default:
      return null;
  }
}

// 将截止日期快捷选项映射到列表分类ID
function mapDeadlineToPeriod(deadlinePresetId) {
  switch (deadlinePresetId) {
    case 'deadline-next-week':
    case 'deadline-next-week-wd':
      return 'preset-week';
    case 'deadline-week-wd':
      return 'preset-week';
    case 'deadline-month-wd':
      return 'preset-month';
    default:
      return deadlinePresetId;
  }
}

function isPresetPeriod(id) {
  return PRESET_PERIODS.some((p) => p.id === id);
}

function getPresetDateRange(presetId) {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);

  switch (presetId) {
    case 'preset-week': {
      const day = start.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      start.setDate(start.getDate() + diff);
      start.setHours(0, 0, 0, 0);
      end.setTime(start.getTime());
      end.setDate(end.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      break;
    }
    case 'preset-month':
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(end.getMonth() + 1);
      end.setDate(0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'preset-quarter': {
      const qm = Math.floor(start.getMonth() / 3) * 3;
      start.setMonth(qm);
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(qm + 3);
      end.setDate(0);
      end.setHours(23, 59, 59, 999);
      break;
    }
    case 'preset-year':
      start.setMonth(0);
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(11);
      end.setDate(31);
      end.setHours(23, 59, 59, 999);
      break;
    case 'all':
    default:
      return null;
  }
  return { start: start.getTime(), end: end.getTime() };
}

function getPeriodLabel(periodId) {
  const preset = PRESET_PERIODS.find((p) => p.id === periodId);
  if (preset) return preset.name;
  const dl = DEADLINE_PRESETS.find((p) => p.id === periodId);
  return dl ? dl.name : '未归类';
}

// 计算某时段内的未完成任务数
function countPeriodTasks(periodId) {
  if (periodId === 'all') {
    return state.tasks.filter((t) => t.status !== 'done').length;
  }
  const range = getPresetDateRange(periodId);
  if (!range) return 0;
  return state.tasks.filter((t) => {
    if (t.status === 'done') return false;
    const ref = t.deadline || t.createdAt;
    return ref >= range.start && ref <= range.end;
  }).length;
}

// 获取默认选中的时段（有任务的预设排前面）
function getDefaultPeriodId() {
  const sortedPresets = [...PRESET_PERIODS].sort((a, b) => {
    const ca = countPeriodTasks(a.id);
    const cb = countPeriodTasks(b.id);
    if (ca > 0 && cb === 0) return -1;
    if (cb > 0 && ca === 0) return 1;
    return 0;
  });
  return sortedPresets[0].id;
}

const DEFAULT_TAGS = [
  { id: 'work', name: '工作', builtin: true },
  { id: 'life', name: '生活', builtin: true },
  { id: 'study', name: '学习', builtin: true },
  { id: 'health', name: '健康', builtin: true },
  { id: 'other', name: '其他', builtin: true },
];

const DEFAULT_REVIEW_TIME = '21:00';

const DB_NAME = 'RenWuZhuShouDB';
const DB_VERSION = 1;

// ============ 数据库 ============

let db = null;

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const database = e.target.result;
      if (!database.objectStoreNames.contains('tasks')) {
        const tasksStore = database.createObjectStore('tasks', { keyPath: 'id' });
        tasksStore.createIndex('periodId', 'periodId', { unique: false });
        tasksStore.createIndex('status', 'status', { unique: false });
        tasksStore.createIndex('createdAt', 'createdAt', { unique: false });
      }
      if (!database.objectStoreNames.contains('periods')) {
        database.createObjectStore('periods', { keyPath: 'id' });
      }
      if (!database.objectStoreNames.contains('tags')) {
        database.createObjectStore('tags', { keyPath: 'id' });
      }
      if (!database.objectStoreNames.contains('settings')) {
        database.createObjectStore('settings', { keyPath: 'key' });
      }
    };
    request.onsuccess = (e) => {
      db = e.target.result;
      resolve(db);
    };
    request.onerror = () => reject(request.error);
  });
}

function dbGet(storeName, key) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function dbGetAll(storeName) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function dbPut(storeName, value) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.put(value);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function dbDelete(storeName, key) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ============ 数据初始化 ============

async function initDefaultData() {
  const tags = await dbGetAll('tags');
  if (tags.length === 0) {
    for (const tag of DEFAULT_TAGS) {
      await dbPut('tags', tag);
    }
  }

  const settings = await dbGetAll('settings');
  if (settings.length === 0) {
    await dbPut('settings', { key: 'reviewTime', value: DEFAULT_REVIEW_TIME });
    await dbPut('settings', { key: 'lastBackup', value: '' });
  }

}

// ============ 应用状态 ============

const state = {
  currentTab: 'home', // home | settings
  currentPeriodId: 'preset-week',
  tasks: [],
  periods: [],
  tags: [],
  settings: {},
  editingTask: null,
  reviewMode: false,
  reviewSortBy: 'overdue',   // overdue | priority | deadline | updated
  reviewDoneFirst: false,    // 已完成是否放顶部
  reviewCollapsed: new Set(),  // 已收起的任务ID
  reviewTouched: new Set(),   // 本次复盘中被操作过的任务ID
  currentTagFilter: 'all',   // 当前标签筛选，all 表示不限
  deferredPrompt: null,
};

// ============ UI 工具 ============

function $(sel) { return document.querySelector(sel); }
function $$(sel) { return document.querySelectorAll(sel); }

function showToast(message, type = '') {
  const container = $('#toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
}

function formatDate(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${m}月${day}日`;
}

function formatDateTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const h = d.getHours().toString().padStart(2, '0');
  const min = d.getMinutes().toString().padStart(2, '0');
  return `${m}月${day}日 ${h}:${min}`;
}

// 本地时间 → YYYY-MM-DD 字符串（统一工具函数，禁止 toISOString 截取日期）
function toDateString(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// 今天日期 YYYY-MM-DD（本地时间）
function todayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// 显示即时保存提示（复盘模式下修改即存）
let saveIndicatorTimer = null;
function showSaveIndicator() {
  const el = $('#save-indicator');
  if (!el) return;
  el.classList.add('show');
  clearTimeout(saveIndicatorTimer);
  saveIndicatorTimer = setTimeout(() => {
    el.classList.remove('show');
  }, 1500);
}

function isOverdue(ts) {
  if (!ts) return false;
  return Date.now() > ts;
}

// 获取任务最新进展文本
function latestProgress(task) {
  if (!task.progressLog || task.progressLog.length === 0) return '';
  return task.progressLog[task.progressLog.length - 1].content || '';
}

// 追加进展条目
function appendProgress(task, content) {
  if (!content) return;
  if (!task.progressLog) task.progressLog = [];
  task.progressLog.push({ content, timestamp: Date.now() });
}

function isSoon(ts) {
  if (!ts) return false;
  const diff = ts - Date.now();
  return diff > 0 && diff < 24 * 60 * 60 * 1000;
}

function getDeadlineClass(ts) {
  if (isOverdue(ts)) return 'overdue';
  if (isSoon(ts)) return 'soon';
  return '';
}

function getPriorityWeight(priority) {
  const idx = PRIORITY_ORDER.indexOf(priority);
  return idx >= 0 ? idx : 99;
}

// ============ 模态框管理 ============

let currentModal = null;

function showModal(html, center = false) {
  closeModal();
  const overlay = document.createElement('div');
  overlay.className = `modal-overlay${center ? ' center' : ''}`;
  overlay.innerHTML = html;
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      if (overlay.onCloseAttempt) overlay.onCloseAttempt();
      else closeModal();
    }
  });
  document.body.appendChild(overlay);
  currentModal = overlay;
  // 防止背景滚动
  $('#app-content').style.overflow = 'hidden';
  return overlay;
}

function closeModal() {
  if (currentModal) {
    currentModal.remove();
    currentModal = null;
    $('#app-content').style.overflow = '';
  }
}

// ============ 任务添加模态框 ============

function showAddTaskModal(presetPeriodId) {
  const tagChips = state.tags
    .map(
      (t) =>
        `<span class="tag-chip${t.builtin ? ' builtin' : ''}" data-tag="${t.id}">${t.name}</span>`
    )
    .join('');

  const priorityOptions = PRIORITY_ORDER.map(
    (key) => `
    <div class="priority-option" data-priority="${key}">
      <span class="priority-option-icon">${PRIORITY_CONFIG[key].icon}</span>
      <div class="priority-option-label">${PRIORITY_CONFIG[key].label}</div>
      <div class="priority-option-desc">${PRIORITY_CONFIG[key].desc}</div>
    </div>`
  ).join('');

  const html = `
    <div class="modal-sheet">
      <div class="modal-handle"></div>
      <div class="modal-header">
        <span class="modal-title">新建任务</span>
        <button class="modal-close" onclick="closeModal()">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">任务名称</label>
          <input class="form-input" id="add-task-name" placeholder="输入要做的事情..." autocomplete="off">
        </div>

        <div class="form-group">
          <label class="form-label">标签</label>
          <div class="tag-chips" id="add-tag-chips">
            ${tagChips}
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">优先级</label>
          <div class="priority-options add-priority-compact" id="add-priority-options">
            ${priorityOptions}
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">⏱ 预计完成时间</label>
          <div id="add-period-mode">
            <div class="period-selector" id="add-period-chips" style="padding:0;margin-bottom:6px;"></div>
            <div style="font-size:12px;color:var(--color-text-hint);margin-bottom:4px;" id="add-deadline-hint"></div>
            <span id="add-switch-manual" style="font-size:12px;color:var(--color-primary);cursor:pointer;">📅 我想指定具体日期</span>
          </div>
          <div id="add-manual-mode" style="display:none;">
            <input class="form-input" type="date" id="add-task-date">
            <div style="margin-top:6px;display:flex;align-items:center;gap:8px;">
              <span id="add-time-toggle" style="font-size:12px;color:var(--color-primary);cursor:pointer;">+ 设定具体时间</span>
              <span id="add-time-row" style="display:none;align-items:center;gap:6px;">
                <input class="time-input" id="add-task-hour" maxlength="2" value="18">
                <span class="time-separator">:</span>
                <input class="time-input" id="add-task-minute" maxlength="2" value="00">
              </span>
            </div>
            <div style="margin-top:8px;">
              <span id="add-reset-period" style="font-size:12px;color:var(--color-text-hint);cursor:pointer;text-decoration:underline;">🔄 还是用模糊预估</span>
            </div>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">备注 <span style="font-weight:400;color:var(--color-text-hint);">（选填）</span></label>
          <textarea class="form-textarea" id="add-task-notes" placeholder="补充说明、关键信息、相关链接..." rows="2"></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-primary btn-block" id="btn-add-task">确认添加</button>
      </div>
    </div>`;

  const overlay = showModal(html);
  let selectedPriority = null;
  let selectedTags = [];
  let usingPeriod = 'preset-week'; // 当前选中的预估时段
  let isManual = false; // 是否手动指定日期

  // 根据是否选中“工作”标签，决定快捷选项排序
  function getSortedPresets() {
    if (selectedTags.includes('work')) {
      return [...DEADLINE_PRESETS].sort((a, b) => {
        const aw = WORKDAY_IDS.has(a.id) ? 0 : 1;
        const bw = WORKDAY_IDS.has(b.id) ? 0 : 1;
        return aw - bw;
      });
    }
    return DEADLINE_PRESETS;
  }

  // 渲染时段选择芯片
  const chipsContainer = overlay.querySelector('#add-period-chips');
  function renderPeriodChips() {
    const presets = getSortedPresets();
    chipsContainer.innerHTML = presets
      .map(
        (p) =>
          `<span class="period-chip${p.id === usingPeriod ? ' active' : ''}" data-period="${p.id}">${p.icon} ${p.name}</span>`
      )
      .join('');
    chipsContainer.querySelectorAll('.period-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        usingPeriod = chip.dataset.period;
        renderPeriodChips();
        updateAutoDeadline();
      });
    });
  }

  // 根据时段自动计算截止日期
  function updateAutoDeadline() {
    const endDate = getDeadlineEndDate(usingPeriod);
    const hint = overlay.querySelector('#add-deadline-hint');
    if (endDate) {
      const dateStr = toDateString(endDate);
      overlay.querySelector('#add-task-date').value = dateStr;
      hint.textContent = `👉 自动设为 ${formatDate(endDate)}（10:00）`;
    } else {
      overlay.querySelector('#add-task-date').value = '';
      hint.textContent = '';
    }
  }

  // 切换到手动模式
  function switchToManual() {
    isManual = true;
    overlay.querySelector('#add-period-mode').style.display = 'none';
    overlay.querySelector('#add-manual-mode').style.display = 'block';
    // 确保日期输入框有当前值
    if (!overlay.querySelector('#add-task-date').value) {
      overlay.querySelector('#add-task-date').value = todayString();
    }
  }

  // 切换回时段模式
  function switchToPeriod() {
    isManual = false;
    overlay.querySelector('#add-period-mode').style.display = 'block';
    overlay.querySelector('#add-manual-mode').style.display = 'none';
    updateAutoDeadline();
  }

  // 初始化
  renderPeriodChips();
  updateAutoDeadline();
  overlay.querySelector('#add-task-name').focus();

  // 优先级选择
  overlay.querySelectorAll('.priority-option').forEach((el) => {
    el.addEventListener('click', () => {
      overlay.querySelectorAll('.priority-option').forEach((e) => e.classList.remove('selected'));
      el.classList.add('selected');
      selectedPriority = el.dataset.priority;
    });
  });

  // 标签选择
  overlay.querySelectorAll('#add-tag-chips .tag-chip').forEach((el) => {
    el.addEventListener('click', () => {
      el.classList.toggle('selected');
      const tagId = el.dataset.tag;
      if (el.classList.contains('selected')) {
        selectedTags.push(tagId);
      } else {
        selectedTags = selectedTags.filter((t) => t !== tagId);
      }
      // 工作标签与预计完成时间快捷选项联动
      const newPresets = getSortedPresets();
      usingPeriod = newPresets[0].id;
      renderPeriodChips();
      updateAutoDeadline();
    });
  });

  // 切换到手动模式
  overlay.querySelector('#add-switch-manual').addEventListener('click', switchToManual);

  // 重置回时段模式
  overlay.querySelector('#add-reset-period').addEventListener('click', switchToPeriod);

  // 时间切换
  overlay.querySelector('#add-time-toggle').addEventListener('click', function () {
    this.style.display = 'none';
    overlay.querySelector('#add-time-row').style.display = 'flex';
  });

  // 确认
  overlay.querySelector('#btn-add-task').addEventListener('click', async () => {
    const name = overlay.querySelector('#add-task-name').value.trim();
    if (!name) { showToast('请输入任务名称', 'error'); return; }
    if (!selectedPriority) { showToast('请选择优先级', 'error'); return; }

    const dateStr = overlay.querySelector('#add-task-date').value;
    let deadline = null;
    if (dateStr) {
      const h = parseInt(overlay.querySelector('#add-task-hour').value) || 18;
      const m = parseInt(overlay.querySelector('#add-task-minute').value) || 0;
      deadline = new Date(dateStr + 'T00:00:00').getTime() + h * 3600000 + m * 60000;
    }

    const task = {
      id: generateId(),
      name,
      priority: selectedPriority,
      deadline,
      tags: selectedTags,
      periodId: mapDeadlineToPeriod(usingPeriod),
      status: 'todo',
      progressLog: overlay.querySelector('#add-task-notes').value.trim()
        ? [{ content: overlay.querySelector('#add-task-notes').value.trim(), timestamp: Date.now() }]
        : [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await dbPut('tasks', task);
    closeModal();
    showToast('任务已添加 ✓', 'success');
    await loadData();
    renderCurrentView();
  });
}

// ============ 任务编辑模态框 ============

async function showEditTaskModal(task) {
  const priorityOptions = PRIORITY_ORDER.map(
    (key) => `
    <div class="priority-option${task.priority === key ? ' selected' : ''}" data-priority="${key}">
      <span class="priority-option-icon">${PRIORITY_CONFIG[key].icon}</span>
      <div class="priority-option-label">${PRIORITY_CONFIG[key].label}</div>
    </div>`
  ).join('');

  const tagChips = state.tags
    .map((t) => {
      const sel = task.tags && task.tags.includes(t.id) ? ' selected' : '';
      return `<span class="tag-chip${t.builtin ? ' builtin' : ''}${sel}" data-tag="${t.id}">${t.name}</span>`;
    })
    .join('');

  const statusOptions = [
    { key: 'todo', label: '待办' },
    { key: 'progress', label: '进行中' },
    { key: 'done', label: '已完成' },
  ]
    .map(
      (s) =>
        `<span class="status-option ${s.key}${task.status === s.key ? ' selected' : ''}" data-status="${s.key}">${s.label}</span>`
    )
    .join('');

  const deadlineDate = toDateString(task.deadline);
  const deadlineHour = task.deadline
    ? new Date(task.deadline).getHours().toString().padStart(2, '0')
    : '18';
  const deadlineMin = task.deadline
    ? new Date(task.deadline).getMinutes().toString().padStart(2, '0')
    : '00';
  const hasTime = task.deadline && (new Date(task.deadline).getHours() !== 18 || new Date(task.deadline).getMinutes() !== 0);

  // 进展时间轴 HTML
  const logEntries = (task.progressLog || []).slice().reverse(); // 最新在前
  let progressTimelineHtml = '';
  if (logEntries.length > 0) {
    progressTimelineHtml = `
      <div class="progress-timeline">
        ${logEntries.map((entry, idx) => `
          <div class="progress-timeline-item" data-log-ts="${entry.timestamp}">
            <div class="progress-timeline-dot"></div>
            <div class="progress-timeline-content">
              <div>
                <div class="progress-timeline-text">${escapeHtml(entry.content)}</div>
                <div class="progress-timeline-time">${formatDateTime(entry.timestamp)}</div>
              </div>
              <button class="progress-delete-btn" data-log-ts="${entry.timestamp}">删除</button>
            </div>
          </div>
        `).join('')}
      </div>`;
  }

  const html = `
    <div class="modal-sheet">
      <div class="modal-handle"></div>
      <div class="modal-header">
        <span class="modal-title">编辑任务</span>
        <button class="modal-close" id="edit-modal-close">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">任务名称</label>
          <input class="form-input" id="edit-task-name" value="${escapeHtml(task.name)}">
        </div>

        <div class="form-group">
          <label class="form-label">完成状态</label>
          <div class="status-toggle" id="edit-status-toggle">
            ${statusOptions}
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">优先级</label>
          <div class="priority-options add-priority-compact" id="edit-priority-options">
            ${priorityOptions}
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">截止日期</label>
          <input class="form-input" type="date" id="edit-task-date" value="${deadlineDate}">
          <div style="margin-top:6px;display:flex;align-items:center;gap:8px;">
            <span id="edit-time-toggle" class="time-toggle" style="font-size:12px;color:var(--color-primary);cursor:pointer;${hasTime ? 'display:none' : ''}">+ 添加具体时间</span>
            <span id="edit-time-row" style="${hasTime ? 'display:flex' : 'display:none'};align-items:center;gap:6px;">
              <input class="time-input" id="edit-task-hour" value="${deadlineHour}" maxlength="2">
              <span class="time-separator">:</span>
              <input class="time-input" id="edit-task-minute" value="${deadlineMin}" maxlength="2">
            </span>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">标签</label>
          <div class="tag-chips" id="edit-tag-chips">
            ${tagChips}
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">📝 进展记录</label>
          <div style="display:flex;gap:6px;margin-bottom:12px;">
            <input class="form-input" id="edit-new-progress" placeholder="添加新的进展..." style="flex:1;">
            <button class="btn btn-primary" id="btn-add-progress" style="display:none;flex-shrink:0;padding:5px 10px;font-size:12px;">保存</button>
          </div>
          ${progressTimelineHtml}
        </div>
      </div>
      <div class="modal-footer" style="flex-wrap:wrap;">
        <button class="btn btn-danger btn-sm" id="btn-delete-task">删除任务</button>
        <div style="flex:1;"></div>
        <button class="btn btn-primary" id="btn-save-task">保存修改</button>
      </div>
    </div>`;

  const overlay = showModal(html);
  let editPriority = task.priority;
  let editStatus = task.status;
  let editTags = [...(task.tags || [])];

  // 初始状态快照（用于检测未保存的改动，不含进展记录）
  const initialState = {
    name: task.name,
    priority: task.priority,
    status: task.status,
    tags: [...(task.tags || [])].sort().join(','),
    deadline: task.deadline || null,
  };

  // 拦截关闭（点击背景或✕按钮）
  overlay.onCloseAttempt = tryCloseEditModal;
  overlay.querySelector('#edit-modal-close').addEventListener('click', tryCloseEditModal);

  function hasUnsavedChanges() {
    if (overlay.querySelector('#edit-task-name').value.trim() !== initialState.name) return true;
    if (editPriority !== initialState.priority) return true;
    if (editStatus !== initialState.status) return true;
    const currentTags = [...editTags].sort().join(',');
    if (currentTags !== initialState.tags) return true;
    const dateStr = overlay.querySelector('#edit-task-date')?.value;
    let currentDeadline = null;
    if (dateStr) {
      const h = parseInt(overlay.querySelector('#edit-task-hour')?.value) || 18;
      const m = parseInt(overlay.querySelector('#edit-task-minute')?.value) || 0;
      currentDeadline = new Date(dateStr + 'T00:00:00').getTime() + h * 3600000 + m * 60000;
    }
    if (currentDeadline !== initialState.deadline) return true;
    return false;
  }

  function tryCloseEditModal() {
    if (!hasUnsavedChanges()) {
      closeModal();
      return;
    }
    // 隐藏编辑弹窗，显示未保存确认框
    overlay.style.display = 'none';
    currentModal = null;
    showUnsavedChangesDialog(
      '有未保存的修改',
      '是否保存当前修改后再退出？',
      async () => { await saveAndClose(); },
      () => { closeModal(); },
      () => {
        // 取消：恢复编辑弹窗
        overlay.style.display = '';
        currentModal = overlay;
        $('#app-content').style.overflow = 'hidden';
      }
    );
  }

  async function saveAndClose() {
    const name = overlay.querySelector('#edit-task-name').value.trim();
    if (!name) { showToast('任务名称不能为空', 'error'); return; }
    const dateStr = overlay.querySelector('#edit-task-date').value;
    let deadline = null;
    if (dateStr) {
      const h = parseInt(overlay.querySelector('#edit-task-hour').value) || 18;
      const m = parseInt(overlay.querySelector('#edit-task-minute').value) || 0;
      deadline = new Date(dateStr + 'T00:00:00').getTime() + h * 3600000 + m * 60000;
    }
    task.name = name;
    task.priority = editPriority;
    task.deadline = deadline;
    task.tags = editTags;
    task.status = editStatus;
    task.updatedAt = Date.now();
    await dbPut('tasks', task);
    closeModal();
    showToast('任务已更新 ✓', 'success');
    await loadData();
    renderCurrentView();
  }

  overlay.querySelectorAll('#edit-priority-options .priority-option').forEach((el) => {
    el.addEventListener('click', () => {
      overlay.querySelectorAll('#edit-priority-options .priority-option').forEach((e) => e.classList.remove('selected'));
      el.classList.add('selected');
      editPriority = el.dataset.priority;
    });
  });

  overlay.querySelectorAll('#edit-status-toggle .status-option').forEach((el) => {
    el.addEventListener('click', () => {
      overlay.querySelectorAll('#edit-status-toggle .status-option').forEach((e) => e.classList.remove('selected'));
      el.classList.add('selected');
      editStatus = el.dataset.status;
    });
  });

  overlay.querySelectorAll('#edit-tag-chips .tag-chip').forEach((el) => {
    el.addEventListener('click', () => {
      el.classList.toggle('selected');
      const tagId = el.dataset.tag;
      if (el.classList.contains('selected')) {
        editTags.push(tagId);
      } else {
        editTags = editTags.filter((t) => t !== tagId);
      }
    });
  });

  overlay.querySelector('#edit-time-toggle')?.addEventListener('click', function () {
    this.style.display = 'none';
    overlay.querySelector('#edit-time-row').style.display = 'flex';
  });

  // 进展记录删除按钮
  overlay.querySelectorAll('.progress-delete-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!btn.classList.contains('confirm')) {
        // 第一次点击：变为确认删除
        btn.textContent = '确认删除';
        btn.classList.add('confirm');
        return;
      }
      // 第二次点击：执行删除
      const ts = parseInt(btn.dataset.logTs);
      task.progressLog = (task.progressLog || []).filter((e) => e.timestamp !== ts);
      await dbPut('tasks', task);
      btn.closest('.progress-timeline-item').remove();
      // 如果时间轴为空，移除整个容器
      const timeline = overlay.querySelector('.progress-timeline');
      if (timeline && timeline.children.length === 0) timeline.remove();
      showToast('进展已删除', 'success');
    });
  });

  // 输入内容时显示/隐藏保存按钮
  const progressInput = overlay.querySelector('#edit-new-progress');
  const addProgressBtn = overlay.querySelector('#btn-add-progress');
  if (progressInput && addProgressBtn) {
    progressInput.addEventListener('input', () => {
      addProgressBtn.style.display = progressInput.value.trim() ? 'inline-block' : 'none';
    });
  }

  // 添加新进展（直接更新界面，不关弹窗）
  addProgressBtn?.addEventListener('click', async () => {
    const inputEl = overlay.querySelector('#edit-new-progress');
    const content = inputEl.value.trim();
    if (!content) { showToast('请输入进展内容', 'error'); return; }
    appendProgress(task, content);
    await dbPut('tasks', task);
    inputEl.value = '';
    addProgressBtn.style.display = 'none';
    const newTs = Date.now();
    // 直接在当前弹窗的时间轴顶部插入新条目
    const timeline = overlay.querySelector('.progress-timeline');
    const newEntry = document.createElement('div');
    newEntry.className = 'progress-timeline-item';
    newEntry.dataset.logTs = newTs;
    newEntry.innerHTML = `
      <div class="progress-timeline-dot"></div>
      <div class="progress-timeline-content">
        <div>
          <div class="progress-timeline-text">${escapeHtml(content)}</div>
          <div class="progress-timeline-time">${formatDateTime(newTs)}</div>
        </div>
        <button class="progress-delete-btn" data-log-ts="${newTs}">删除</button>
      </div>`;
    // 绑定新条目的删除事件
    const newDelBtn = newEntry.querySelector('.progress-delete-btn');
    newDelBtn.addEventListener('click', async () => {
      if (!newDelBtn.classList.contains('confirm')) {
        newDelBtn.textContent = '确认删除';
        newDelBtn.classList.add('confirm');
        return;
      }
      task.progressLog = (task.progressLog || []).filter((e) => e.timestamp !== newTs);
      await dbPut('tasks', task);
      newEntry.remove();
      const tl = overlay.querySelector('.progress-timeline');
      if (tl && tl.children.length === 0) tl.remove();
      showToast('进展已删除', 'success');
    });
    if (timeline) {
      timeline.insertBefore(newEntry, timeline.firstChild);
    } else {
      const container = document.createElement('div');
      container.className = 'progress-timeline';
      container.appendChild(newEntry);
      inputEl.parentElement.after(container);
    }
    showToast('进展已记录 ✓', 'success');
  });

  overlay.querySelector('#btn-save-task').addEventListener('click', async () => {
    const name = overlay.querySelector('#edit-task-name').value.trim();
    if (!name) { showToast('任务名称不能为空', 'error'); return; }

    const dateStr = overlay.querySelector('#edit-task-date').value;
    let deadline = null;
    if (dateStr) {
      const h = parseInt(overlay.querySelector('#edit-task-hour').value) || 18;
      const m = parseInt(overlay.querySelector('#edit-task-minute').value) || 0;
      deadline = new Date(dateStr + 'T00:00:00').getTime() + h * 3600000 + m * 60000;
    }

    task.name = name;
    task.priority = editPriority;
    task.deadline = deadline;
    task.tags = editTags;
    task.status = editStatus;
    // 新进展通过 #btn-add-progress 已实时追加到 progressLog，这里不再覆盖
    task.updatedAt = Date.now();

    await dbPut('tasks', task);
    closeModal();
    showToast('任务已更新 ✓', 'success');
    await loadData();
    renderCurrentView();
  });

  overlay.querySelector('#btn-delete-task').addEventListener('click', async () => {
    // 隐藏编辑弹窗（不销毁），取消时可恢复
    overlay.style.display = 'none';
    currentModal = null; // 断开关联，避免 showModal 内部 closeModal 将其移除
    showConfirmDialog(
      '确定要删除这个任务吗？',
      '删除后无法恢复',
      async () => {
        await dbDelete('tasks', task.id);
        showToast('任务已删除', 'success');
        await loadData();
        renderCurrentView();
      },
      () => {
        // 取消删除：恢复编辑弹窗
        overlay.style.display = '';
        currentModal = overlay;
        $('#app-content').style.overflow = 'hidden';
      }
    );
  });
}

// ============ 确认对话框 ============

function showConfirmDialog(title, desc, onConfirm, onCancel) {
  const html = `
    <div class="modal-sheet">
      <div class="confirm-dialog">
        <div class="confirm-dialog-icon">⚠️</div>
        <div class="confirm-dialog-title">${title}</div>
        <div class="confirm-dialog-desc">${desc}</div>
        <div style="display:flex;gap:10px;">
          <button class="btn btn-secondary" id="confirm-cancel" style="flex:1;">取消</button>
          <button class="btn btn-danger" id="confirm-ok" style="flex:1;">确认删除</button>
        </div>
      </div>
    </div>`;
  const overlay = showModal(html);

  // 点击背景也视为取消
  overlay.onCloseAttempt = () => {
    closeModal();
    if (onCancel) onCancel();
  };

  overlay.querySelector('#confirm-cancel').addEventListener('click', () => {
    closeModal();
    if (onCancel) onCancel();
  });
  overlay.querySelector('#confirm-ok').addEventListener('click', () => {
    closeModal();
    if (onConfirm) onConfirm();
  });
}

function showUnsavedChangesDialog(title, desc, onSave, onDiscard, onCancel) {
  const html = `
    <div class="modal-sheet">
      <div class="confirm-dialog">
        <div class="confirm-dialog-icon">⚠️</div>
        <div class="confirm-dialog-title">${title}</div>
        <div class="confirm-dialog-desc">${desc}</div>
        <div style="display:flex;gap:10px;margin-bottom:10px;">
          <button class="btn btn-secondary" id="unsaved-discard" style="flex:1;">不保存</button>
          <button class="btn btn-primary" id="unsaved-save" style="flex:1;">保存</button>
        </div>
        <button class="btn btn-block" id="unsaved-cancel" style="width:100%;background:var(--color-border-light);color:var(--color-text);">取消</button>
      </div>
    </div>`;
  const overlay = showModal(html);

  // 点击背景也视为取消
  overlay.onCloseAttempt = () => {
    closeModal();
    if (onCancel) onCancel();
  };

  overlay.querySelector('#unsaved-discard').addEventListener('click', () => {
    closeModal();
    if (onDiscard) onDiscard();
  });
  overlay.querySelector('#unsaved-save').addEventListener('click', async () => {
    closeModal();
    if (onSave) await onSave();
  });
  overlay.querySelector('#unsaved-cancel').addEventListener('click', () => {
    closeModal();
    if (onCancel) onCancel();
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ============ 时间段管理 ============


// ============ 标签管理 ============

function showTagManageModal() {
  const tagList = state.tags
    .map(
      (t) => `
    <div class="settings-item">
      <div class="settings-item-left">
        <span>${t.name}</span>
      </div>
      <div style="display:flex;align-items:center;gap:8px;">
        ${t.builtin ? '<span style="font-size:11px;color:var(--color-text-hint);">内置</span>' : `<button class="btn btn-sm btn-danger" data-delete-tag="${t.id}">删除</button>`}
      </div>
    </div>`
    )
    .join('');

  const html = `
    <div class="modal-sheet">
      <div class="modal-handle"></div>
      <div class="modal-header">
        <span class="modal-title">标签管理</span>
        <button class="modal-close" onclick="closeModal()">✕</button>
      </div>
      <div class="modal-body">
        <div style="margin-bottom:14px;display:flex;gap:8px;">
          <input class="form-input" id="new-tag-name" placeholder="新建标签名称" style="flex:1;">
          <button class="btn btn-primary btn-sm" id="btn-add-tag">添加</button>
        </div>
        <div style="background:var(--color-surface);border-radius:var(--radius-md);overflow:hidden;">
          ${tagList}
        </div>
      </div>
    </div>`;

  const overlay = showModal(html);

  overlay.querySelector('#btn-add-tag').addEventListener('click', async () => {
    const name = overlay.querySelector('#new-tag-name').value.trim();
    if (!name) { showToast('请输入标签名称', 'error'); return; }
    const exists = state.tags.some((t) => t.name === name);
    if (exists) { showToast('标签已存在', 'error'); return; }

    await dbPut('tags', { id: generateId(), name, builtin: false });
    overlay.querySelector('#new-tag-name').value = '';
    showToast('标签已添加', 'success');
    await loadData();
    closeModal();
    showTagManageModal();
  });

  overlay.querySelectorAll('[data-delete-tag]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const tagId = btn.dataset.deleteTag;
      await dbDelete('tags', tagId);
      showToast('标签已删除', 'success');
      await loadData();
      closeModal();
      showTagManageModal();
    });
  });
}

// ============ 数据备份与恢复 ============

async function exportBackup() {
  const tasks = await dbGetAll('tasks');
  const periods = await dbGetAll('periods');
  const tags = await dbGetAll('tags');
  const settings = await dbGetAll('settings');

  const backup = {
    version: 1,
    exportedAt: new Date().toISOString(),
    data: { tasks, periods, tags, settings },
  };

  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${(now.getMonth()+1).toString().padStart(2,'0')}-${now.getDate().toString().padStart(2,'0')}`;
  a.download = `任务助手备份_${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  await dbPut('settings', { key: 'lastBackup', value: new Date().toISOString() });
  await loadData();
  showToast('备份已导出到下载目录 ✓', 'success');
}

function importBackup() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const backup = JSON.parse(text);

      if (!backup.data || !backup.data.tasks) {
        throw new Error('无效的备份文件');
      }

      showConfirmDialog(
        '确认恢复备份？',
        `备份时间：${backup.exportedAt || '未知'}。当前数据将被覆盖！`,
        async () => {
          // 清空现有数据
          const tx = db.transaction(['tasks', 'periods', 'tags', 'settings'], 'readwrite');
          await Promise.all([
            (() => { const s = tx.objectStore('tasks'); return new Promise(r => { const req = s.clear(); req.onsuccess = r; }); })(),
            (() => { const s = tx.objectStore('periods'); return new Promise(r => { const req = s.clear(); req.onsuccess = r; }); })(),
            (() => { const s = tx.objectStore('tags'); return new Promise(r => { const req = s.clear(); req.onsuccess = r; }); })(),
            (() => { const s = tx.objectStore('settings'); return new Promise(r => { const req = s.clear(); req.onsuccess = r; }); })(),
          ]);

          // 导入备份数据
          for (const task of backup.data.tasks || []) await dbPut('tasks', task);
          for (const period of backup.data.periods || []) await dbPut('periods', period);
          for (const tag of backup.data.tags || []) await dbPut('tags', tag);
          for (const setting of backup.data.settings || []) await dbPut('settings', setting);

          showToast('数据恢复成功 ✓', 'success');
          await loadData();
          renderCurrentView();
        }
      );
    } catch (err) {
      showToast('备份文件格式无效', 'error');
    }
  });
  input.click();
}

// ============ 提醒时间设置 ============

function showReviewTimeModal() {
  const currentTime = state.settings.reviewTime || DEFAULT_REVIEW_TIME;
  const [h, m] = currentTime.split(':');

  const html = `
    <div class="modal-sheet">
      <div class="modal-handle"></div>
      <div class="modal-header">
        <span class="modal-title">设置复盘提醒时间</span>
        <button class="modal-close" onclick="closeModal()">✕</button>
      </div>
      <div class="modal-body">
        <div style="text-align:center;padding:20px 0;">
          <div style="font-size:14px;color:var(--color-text-hint);margin-bottom:16px;">每天固定时间提醒你复盘任务</div>
          <div style="display:flex;align-items:center;justify-content:center;gap:8px;">
            <input class="time-input" id="review-hour" value="${h}" maxlength="2" style="width:80px;font-size:24px;padding:12px;">
            <span style="font-size:24px;font-weight:600;">:</span>
            <input class="time-input" id="review-minute" value="${m}" maxlength="2" style="width:80px;font-size:24px;padding:12px;">
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-primary btn-block" id="btn-save-review-time">保存</button>
      </div>
    </div>`;

  const overlay = showModal(html, true);

  overlay.querySelector('#btn-save-review-time').addEventListener('click', async () => {
    let hour = parseInt(overlay.querySelector('#review-hour').value) || 21;
    let minute = parseInt(overlay.querySelector('#review-minute').value) || 0;
    hour = Math.max(0, Math.min(23, hour));
    minute = Math.max(0, Math.min(59, minute));
    const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    await dbPut('settings', { key: 'reviewTime', value: time });
    showToast(`复盘时间已设为 ${time}`, 'success');
    closeModal();
    await loadData();
    setupReminderCheck();
    renderCurrentView();
  });
}

// ============ 数据加载 ============

async function loadData() {
  state.tasks = await dbGetAll('tasks');
  state.periods = await dbGetAll('periods');
  state.tags = await dbGetAll('tags');
  const settingsArr = await dbGetAll('settings');
  state.settings = {};
  settingsArr.forEach((s) => {
    state.settings[s.key] = s.value;
  });
  if (!state.settings.reviewTime) state.settings.reviewTime = DEFAULT_REVIEW_TIME;

  // 旧数据兼容：单字符串 progress → progressLog 数组
  let needSave = false;
  state.tasks.forEach((t) => {
    if (typeof t.progress === 'string') {
      t.progressLog = t.progress
        ? [{ content: t.progress, timestamp: t.createdAt }]
        : [];
      delete t.progress;
      needSave = true;
    }
    if (!Array.isArray(t.progressLog)) t.progressLog = [];
  });
  if (needSave) {
    for (const t of state.tasks) {
      await dbPut('tasks', t);
    }
  }

  // 按创建时间排序
  state.periods.sort((a, b) => b.createdAt - a.createdAt);
  // 内置标签按 DEFAULT_TAGS 顺序，自定义标签按名称拼音
  const builtinOrder = DEFAULT_TAGS.map((t) => t.id);
  state.tags.sort((a, b) => {
    const aIdx = builtinOrder.indexOf(a.id);
    const bIdx = builtinOrder.indexOf(b.id);
    if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;  // 两个都是内置
    if (aIdx !== -1) return -1;  // a是内置，排前
    if (bIdx !== -1) return 1;   // b是内置，排前
    return a.name.localeCompare(b.name, 'zh');  // 都是自定义，按拼音
  });
}

// ============ 排序任务 ============

function sortTasks(tasks) {
  return [...tasks].sort((a, b) => {
    // 已完成的排最后
    if (a.status === 'done' && b.status !== 'done') return 1;
    if (b.status === 'done' && a.status !== 'done') return -1;
    // 按优先级
    const pwA = getPriorityWeight(a.priority);
    const pwB = getPriorityWeight(b.priority);
    if (pwA !== pwB) return pwA - pwB;
    // 按截止日期（逾期>临近>有日期>无日期）
    const aOverdue = isOverdue(a.deadline) ? 1 : 0;
    const bOverdue = isOverdue(b.deadline) ? 1 : 0;
    if (aOverdue !== bOverdue) return bOverdue - aOverdue;
    if (!a.deadline && b.deadline) return 1;
    if (a.deadline && !b.deadline) return -1;
    if (a.deadline && b.deadline) return a.deadline - b.deadline;
    return b.createdAt - a.createdAt;
  });
}

// 复盘模式专用排序
function sortReviewTasks(tasks, sortBy, doneFirst) {
  return [...tasks].sort((a, b) => {
    // 已完成位置
    if (a.status === 'done' && b.status !== 'done') return doneFirst ? -1 : 1;
    if (b.status === 'done' && a.status !== 'done') return doneFirst ? 1 : -1;

    switch (sortBy) {
      case 'priority': {
        const pwA = getPriorityWeight(a.priority);
        const pwB = getPriorityWeight(b.priority);
        if (pwA !== pwB) return pwA - pwB;
        const aOv = isOverdue(a.deadline) ? 1 : 0;
        const bOv = isOverdue(b.deadline) ? 1 : 0;
        if (aOv !== bOv) return bOv - aOv;
        if (a.deadline && b.deadline) return a.deadline - b.deadline;
        break;
      }
      case 'deadline': {
        if (!a.deadline && !b.deadline) break;
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        const aOv = isOverdue(a.deadline) ? 1 : 0;
        const bOv = isOverdue(b.deadline) ? 1 : 0;
        if (aOv !== bOv) return bOv - aOv;
        return a.deadline - b.deadline;
      }
      case 'updated':
        return b.updatedAt - a.updatedAt;
      case 'overdue':
      default: {
        const aOv = isOverdue(a.deadline) ? 1 : 0;
        const bOv = isOverdue(b.deadline) ? 1 : 0;
        if (aOv !== bOv) return bOv - aOv;
        const pwA = getPriorityWeight(a.priority);
        const pwB = getPriorityWeight(b.priority);
        if (pwA !== pwB) return pwA - pwB;
        if (a.deadline && b.deadline) return a.deadline - b.deadline;
        break;
      }
    }
    return b.createdAt - a.createdAt;
  });
}

// ============ 渲染 ============

function renderCurrentView() {
  switch (state.currentTab) {
    case 'home': renderHome(); break;
    case 'settings': renderSettings(); break;
  }
  updateNav();
  updateFab();
}

function updateNav() {
  $$('.nav-item').forEach((el) => {
    el.classList.toggle('active', el.dataset.tab === state.currentTab);
  });
}

function updateFab() {
  // 加号按钮始终显示在底部导航栏中，是所有页面的全局入口
  $('#fab-btn').style.display = 'flex';
}

function updateHeader(title) {
  $('#header-title').textContent = title;
}

// ============ 首页 ============

function renderHome() {
  updateHeader('任务助手');
  const content = $('#app-content');

  // === 保存指示器 ===
  const saveIndicatorHtml = '<span class="save-indicator" id="save-indicator">✓ 已保存</span>';

  // 浮动按钮：复盘模式显示“结束复盘”，任务列表模式显示“立即复盘”
  const reviewFloatBtn = state.reviewMode
    ? '<button class="review-end-float" id="btn-end-review">结束复盘</button>'
    : '<button class="review-start-float" id="btn-start-review-float">🔄 立即复盘</button>';

  // 获取当前时间段的筛选任务
  let periodTasks;
  const range = getPresetDateRange(state.currentPeriodId);
  if (range) {
    periodTasks = state.tasks.filter((t) => {
      const ref = t.deadline || t.createdAt;
      return ref >= range.start && ref <= range.end;
    });
  } else {
    periodTasks = [...state.tasks];
  }
  // 复盘模式和任务列表模式均按时间段筛选
  let sourceTasks = periodTasks;

  // 保留一份筛选前的副本，用于标签计数（不受标签筛选影响）
  const baseTasks = sourceTasks;

  // 标签筛选
  if (state.currentTagFilter !== 'all') {
    sourceTasks = sourceTasks.filter((t) => (t.tags || []).includes(state.currentTagFilter));
  }

  const sorted = state.reviewMode
    ? sortReviewTasks(sourceTasks, state.reviewSortBy, state.reviewDoneFirst)
    : sortTasks(sourceTasks);

  // PWA 安装提示
  let installBanner = '';
  if (state.deferredPrompt) {
    installBanner = `
      <div class="install-banner" id="install-banner">
        <span class="install-banner-text">💡 添加到桌面，提醒更稳定</span>
        <button class="install-banner-btn" id="btn-install">立即添加</button>
      </div>`;
  }

  // 未读提醒提示（复盘模式下不显示）
  let reviewBanner = '';
  if (!state.reviewMode) {
    const lastReviewDate = state.settings.lastReviewDate || '';
    const today = todayString();
    if (lastReviewDate !== today) {
      const reviewTime = state.settings.reviewTime || DEFAULT_REVIEW_TIME;
      const [h, m] = reviewTime.split(':');
      const reviewTarget = new Date();
      reviewTarget.setHours(parseInt(h), parseInt(m), 0, 0);
      const isPastReview = Date.now() > reviewTarget.getTime();
      if (isPastReview) {
        const pendingCount = periodTasks.filter((t) => t.status !== 'done').length;
        reviewBanner = `
          <div class="review-banner">
            <div class="review-banner-title">📋 ${pendingCount > 0 ? `有 ${pendingCount} 件事待复盘` : '今日复盘'}</div>
            <div class="review-banner-desc">${pendingCount > 0 ? '回顾进度，及时调整计划' : '今天的事情都完成了？回顾一下吧'}</div>
            <button class="review-banner-btn" id="btn-start-review">开始复盘 →</button>
          </div>`;
      }
    }
  }

  // 时间段选择器：复盘模式下“全部”固定在最前；任务列表模式按是否有任务排序
  const sortedPresets = [...PRESET_PERIODS].sort((a, b) => {
    if (state.reviewMode) {
      if (a.id === 'all') return -1;
      if (b.id === 'all') return 1;
    }
    const ca = countPeriodTasks(a.id);
    const cb = countPeriodTasks(b.id);
    if (ca > 0 && cb === 0) return -1;
    if (cb > 0 && ca === 0) return 1;
    return 0;
  });

  function countAllPeriodTasks(periodId) {
    if (periodId === 'all') return state.tasks.length;
    const range = getPresetDateRange(periodId);
    if (!range) return 0;
    return state.tasks.filter((t) => {
      const ref = t.deadline || t.createdAt;
      return ref >= range.start && ref <= range.end;
    }).length;
  }

  const periodChips = sortedPresets
    .filter((p) => {
      const count = countAllPeriodTasks(p.id);
      return count > 0 || p.id === state.currentPeriodId;
    })
    .map((p) => {
      const count = countAllPeriodTasks(p.id);
      return `<span class="period-chip period-preset${p.id === state.currentPeriodId ? ' active' : ''}" data-period="${p.id}">${p.icon} ${p.name}${count > 0 ? ` <small style="opacity:0.7;">${count}</small>` : ''}</span>`;
    })
    .join('');

  const periodSection = `
      <div class="period-selector" id="period-selector">
        ${periodChips}
      </div>`;

  // 标签筛选条（隐藏无任务的标签）
  const tagFilterChips = state.tags
    .map((t) => {
      const count = baseTasks.filter((task) => (task.tags || []).includes(t.id)).length;
      return { t, count };
    })
    .filter(({ t, count }) => count > 0 || state.currentTagFilter === t.id)
    .map(({ t, count }) => `<span class="tag-filter-chip${state.currentTagFilter === t.id ? ' active' : ''}" data-tag="${t.id}">${t.name}${count > 0 ? ` <small>${count}</small>` : ''}</span>`)
    .join('');
  const tagFilterBar = `
      <div class="tag-filter-bar" id="tag-filter-bar">
        <span class="tag-filter-chip tag-filter-all${state.currentTagFilter === 'all' ? ' active' : ''}" data-tag="all">全部</span>
        ${tagFilterChips}
      </div>`;

  // 任务列表 / 复盘视图
  let taskListHtml = '';
  if (state.reviewMode) {
    // === 复盘模式 ===
    taskListHtml = renderReviewList(sorted);
  } else {
    // === 正常任务列表 ===
    if (sorted.length === 0) {
      taskListHtml = `
        <div class="empty-state">
          <div class="empty-icon">📝</div>
          <div class="empty-title">还没有任务</div>
          <div class="empty-desc">点击下方 ＋ 按钮开始记录要做的事情</div>
        </div>`;
    } else {
      const overdue = sorted.filter((t) => isOverdue(t.deadline) && t.status !== 'done');
      const active = sorted.filter((t) => !isOverdue(t.deadline) && t.status !== 'done');
      const done = sorted.filter((t) => t.status === 'done');

      if (overdue.length > 0) {
        taskListHtml += `<div class="section-header"><span class="section-title" style="color:var(--color-danger);">⚠ 已逾期</span><span class="section-count">${overdue.length}</span></div>`;
        taskListHtml += overdue.map((t) => renderTaskCard(t)).join('');
      }
      if (active.length > 0) {
        taskListHtml += `<div class="section-header"><span class="section-title">待办事项</span><span class="section-count">${active.length}</span></div>`;
        taskListHtml += active.map((t) => renderTaskCard(t)).join('');
      }
      if (done.length > 0) {
        taskListHtml += `<div class="section-header"><span class="section-title" style="color:var(--color-success);">✅ 已完成</span><span class="section-count">${done.length}</span></div>`;
        taskListHtml += done.map((t) => renderTaskCard(t)).join('');
      }
    }
  }

  content.innerHTML = `
    ${saveIndicatorHtml}
    ${installBanner}
    ${reviewBanner}
    ${periodSection}
    ${tagFilterBar}
    ${taskListHtml}
    ${reviewFloatBtn}
  `;

  // === 事件绑定 ===

  // 立即复盘浮动按钮
  const startReviewFloat = content.querySelector('#btn-start-review-float');
  if (startReviewFloat) {
    startReviewFloat.addEventListener('click', () => {
      state.reviewMode = true;
      state.currentPeriodId = 'all';
      state.reviewTouched.clear();
      renderHome();
    });
  }

  // 任务卡片左滑删除（支持触屏 + 鼠标）
  const SWIPE_THRESHOLD = 40;
  content.querySelectorAll('.task-card-wrapper').forEach((wrapper) => {
    const card = wrapper.querySelector('.task-card');
    const deleteBtn = wrapper.querySelector('.task-delete-btn');
    let startX = 0;
    let startY = 0;
    let deltaX = 0;
    let swiping = false;
    let pointerDown = false;

    function closeSwipe() {
      wrapper.classList.remove('swiped');
      deleteBtn.textContent = '删除';
      deleteBtn.classList.remove('confirm');
    }

    // 统一指针事件（触屏 + 鼠标）
    card.addEventListener('pointerdown', (e) => {
      startX = e.clientX;
      startY = e.clientY;
      deltaX = 0;
      swiping = false;
      pointerDown = true;
    });

    card.addEventListener('pointermove', (e) => {
      if (!pointerDown) return;
      deltaX = e.clientX - startX;
      const deltaY = Math.abs(e.clientY - startY);
      if (Math.abs(deltaX) > deltaY && deltaX < 0) {
        swiping = true;
      }
    });

    card.addEventListener('pointerup', () => {
      if (!pointerDown) return;
      pointerDown = false;
      if (swiping && deltaX < -SWIPE_THRESHOLD) {
        // 滑动距离足够，打开删除按钮
        content.querySelectorAll('.task-card-wrapper.swiped').forEach((w) => {
          if (w !== wrapper) w.classList.remove('swiped');
        });
        wrapper.classList.add('swiped');
      } else if (!swiping) {
        // 普通点击
        if (!wrapper.classList.contains('swiped')) {
          const taskId = wrapper.dataset.taskId;
          const task = state.tasks.find((t) => t.id === taskId);
          if (task) showEditTaskModal(task);
        } else {
          closeSwipe();
        }
      } else {
        // 滑动距离不够，回弹
        closeSwipe();
      }
    });

    card.addEventListener('pointercancel', () => {
      pointerDown = false;
      closeSwipe();
    });

    // 删除按钮点击：第一次变“确认删除”，第二次执行删除
    deleteBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (deleteBtn.classList.contains('confirm')) {
        const taskId = wrapper.dataset.taskId;
        await dbDelete('tasks', taskId);
        showToast('任务已删除', 'success');
        await loadData();
        renderHome();
      } else {
        deleteBtn.textContent = '确认删除';
        deleteBtn.classList.add('confirm');
      }
    });
  });

  // 时间段芯片
  content.querySelectorAll('.period-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      state.currentPeriodId = chip.dataset.period;
      content.querySelectorAll('.period-chip').forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      renderHome();
    });
  });

  // 标签筛选芯片
  content.querySelectorAll('.tag-filter-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      state.currentTagFilter = chip.dataset.tag;
      renderHome();
    });
  });

  // 复盘横幅按钮
  const reviewBtn = content.querySelector('#btn-start-review');
  if (reviewBtn) {
    reviewBtn.addEventListener('click', () => {
      state.reviewMode = true;
      state.currentPeriodId = 'all';
      state.reviewTouched.clear();
      renderHome();
    });
  }

  // 安装按钮
  const installBtn = content.querySelector('#btn-install');
  if (installBtn) {
    installBtn.addEventListener('click', () => {
      if (state.deferredPrompt) {
        state.deferredPrompt.prompt();
        state.deferredPrompt.userChoice.then(() => {
          state.deferredPrompt = null;
          renderHome();
        });
      }
    });
  }

  // 复盘模式下的交互绑定
  if (state.reviewMode) {
    bindReviewInteractions(content);
  }
}

function renderTaskCard(task) {
  const priorityInfo = PRIORITY_CONFIG[task.priority] || {};
  const deadlineClass = getDeadlineClass(task.deadline);
  const deadlineText = task.deadline
    ? (task.deadline % (24 * 3600000) === 0 ? formatDate(task.deadline) : formatDateTime(task.deadline))
    : '';
  const deadlineDisplay = deadlineText
    ? `<span class="badge-deadline ${deadlineClass}">📅 ${deadlineText}</span>`
    : '';
  const isDone = task.status === 'done';

  const tagBadges = (task.tags || [])
    .map((tagId) => {
      const tag = state.tags.find((t) => t.id === tagId);
      return tag ? `<span class="badge badge-tag">${tag.name}</span>` : '';
    })
    .join('');

  const statusBadge = isDone
    ? '<span class="badge badge-status">已完成</span>'
    : task.status === 'progress'
      ? '<span class="badge badge-status progress">进行中</span>'
      : '';

  return `
    <div class="task-card-wrapper" data-task-id="${task.id}">
      <div class="task-card priority-${task.priority}${isDone ? ' done' : ''}" data-task-id="${task.id}">
        <div class="task-card-header">
          <span class="task-card-title">${escapeHtml(task.name)}</span>
          <span class="badge badge-priority-${task.priority}">${priorityInfo.icon || ''} ${priorityInfo.label || task.priority}</span>
        </div>
        <div class="task-card-meta">
          <div class="task-card-meta-left">
            ${deadlineDisplay}
            ${statusBadge}
          </div>
          ${tagBadges ? `<div class="task-card-tags">${tagBadges}</div>` : ''}
        </div>
        ${latestProgress(task) ? `<div class="task-card-progress">最新进展：${escapeHtml(latestProgress(task)).slice(0, 50)}${latestProgress(task).length > 50 ? '...' : ''}</div>` : ''}
      </div>
      <div class="task-delete-zone">
        <button class="task-delete-btn">删除</button>
      </div>
    </div>`;
}

// ============ 复盘功能 ============

// 渲染复盘模式下的任务列表
function renderReviewList(sorted) {
  let html = '';
  const activeTasks = sorted.filter((t) => t.status !== 'done');
  const doneTasks = sorted.filter((t) => t.status === 'done');
  const reviewedCount = state.reviewTouched.size;
  const totalCount = sorted.length;

  // 排序控件
  const sortOptions = [
    { value: 'overdue', label: '逾期优先' },
    { value: 'priority', label: '优先级优先' },
    { value: 'deadline', label: '截止日期近→远' },
    { value: 'updated', label: '最近修改优先' },
  ];
  const sortOptionsHtml = sortOptions
    .map((o) => `<option value="${o.value}"${state.reviewSortBy === o.value ? ' selected' : ''}>${o.label}</option>`)
    .join('');

  html += `<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:12px;font-size:12px;color:var(--color-text-secondary);">`;
  html += `<div style="display:flex;align-items:center;gap:4px;">`;
  html += `<span style="white-space:nowrap;">排序：</span>`;
  html += `<select class="review-sort-select" id="review-sort-by" style="font-size:12px;padding:4px 8px;border:1px solid var(--color-border);border-radius:6px;background:var(--color-surface);color:var(--color-text);">${sortOptionsHtml}</select>`;
  html += `</div>`;
  html += `<div style="display:flex;align-items:center;gap:8px;">`;
  html += `<label style="display:flex;align-items:center;gap:4px;cursor:pointer;white-space:nowrap;">`;
  html += `<input type="checkbox" id="review-done-first"${state.reviewDoneFirst ? ' checked' : ''} style="width:14px;height:14px;"> 已完成放顶部`;
  html += `</label></div>`;
  html += `</div>`;

  html += `<div style="display:flex;align-items:center;justify-content:space-between;font-size:13px;color:var(--color-text-hint);margin-bottom:6px;">`;
  html += `<span>${new Date().toLocaleDateString('zh-CN', { weekday: 'long', month: 'long', day: 'numeric' })}  · 已复盘 ${reviewedCount}/${totalCount}</span>`;
  html += `<button id="review-collapse-all" style="font-size:11px;padding:2px 8px;border:1px solid var(--color-border);border-radius:6px;background:var(--color-surface);color:var(--color-text-secondary);cursor:pointer;">全部收起</button>`;
  html += `</div>`;

  if (sorted.length === 0) {
    html += `<div class="empty-state"><div class="empty-icon">🎉</div><div class="empty-title">当前时段没有任务</div></div>`;
  } else {
    const activeSection = activeTasks.length > 0
      ? `<div class="section-header"><span class="section-title">需要关注 (${activeTasks.length})</span></div>${activeTasks.map((t) => renderReviewTask(t)).join('')}`
      : '';
    const doneSection = doneTasks.length > 0
      ? `<div class="section-header"><span class="section-title" style="color:var(--color-success);">✅ 已完成 (${doneTasks.length})</span></div>${doneTasks.map((t) => renderReviewTask(t)).join('')}`
      : '';
    // 已完成放顶部：先已完成再需要关注；否则反过来
    html += state.reviewDoneFirst ? (doneSection + activeSection) : (activeSection + doneSection);
  }

  return html;
}

// 绑定复盘模式下的交互事件
function bindReviewInteractions(content) {
  // 单个任务收起/展开
  content.querySelectorAll('.review-collapse-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const taskId = btn.closest('.review-task').dataset.taskId;
      state.reviewCollapsed.add(taskId);
      renderHome();
    });
  });
  // 已收起的卡片，点击即展开
  content.querySelectorAll('.review-task.collapsed').forEach((el) => {
    el.addEventListener('click', () => {
      const taskId = el.dataset.taskId;
      state.reviewCollapsed.delete(taskId);
      renderHome();
    });
  });

  // 全部收起/展开按钮
  const collapseAllBtn = content.querySelector('#review-collapse-all');
  if (collapseAllBtn) {
    const allTaskEls = content.querySelectorAll('.review-task');
    const allIds = Array.from(allTaskEls).map((el) => el.dataset.taskId);
    const allCollapsed = allIds.length > 0 && allIds.every((id) => state.reviewCollapsed.has(id));
    collapseAllBtn.textContent = allCollapsed ? '全部展开' : '全部收起';
    collapseAllBtn.addEventListener('click', () => {
      if (allCollapsed) {
        state.reviewCollapsed.clear();
      } else {
        allIds.forEach((id) => state.reviewCollapsed.add(id));
      }
      renderHome();
    });
  }

  content.querySelectorAll('.review-task').forEach((el) => {
    const taskId = el.dataset.taskId;
    const task = state.tasks.find((t) => t.id === taskId);
    if (!task) return;

    const statusSelect = el.querySelector('.review-status');
    if (statusSelect) {
      statusSelect.addEventListener('change', async () => {
        task.status = statusSelect.value;
        task.updatedAt = Date.now();
        state.reviewTouched.add(task.id);
        await dbPut('tasks', task);
        await loadData();
        renderHome();
        showSaveIndicator();
      });
    }

    const prioritySelect = el.querySelector('.review-priority');
    if (prioritySelect) {
      prioritySelect.addEventListener('change', async () => {
        task.priority = prioritySelect.value;
        task.updatedAt = Date.now();
        state.reviewTouched.add(task.id);
        await dbPut('tasks', task);
        await loadData();
        renderHome();
        showSaveIndicator();
      });
    }

    const dateInput = el.querySelector('.review-deadline');
    if (dateInput) {
      dateInput.addEventListener('change', async () => {
        if (dateInput.value) {
          // 用本地时间构造，与显示格式保持一致，避免时区偏移导致日期差一天
          const parts = dateInput.value.split('-');
          const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
          task.deadline = d.getTime();
        }
        state.reviewTouched.add(task.id);
        task.updatedAt = Date.now();
        await dbPut('tasks', task);
        await loadData();
        renderHome();
        showSaveIndicator();
      });
    }

    const progressInput = el.querySelector('.review-progress');
    const saveBtn = el.querySelector('.review-progress-save');
    if (progressInput && saveBtn) {
      // 输入时显示保存按钮
      progressInput.addEventListener('input', () => {
        saveBtn.style.display = progressInput.value.trim() ? 'inline-block' : 'none';
      });
      // 点击保存按钮提交进展
      saveBtn.addEventListener('click', async () => {
        const content = progressInput.value.trim();
        if (!content) return;
        appendProgress(task, content);
        task.updatedAt = Date.now();
        state.reviewTouched.add(task.id);
        await dbPut('tasks', task);
        await loadData();
        progressInput.value = '';
        saveBtn.style.display = 'none';
        showSaveIndicator();
      });
    }
  });

  // 结束复盘按钮（先保存所有未保存的进展）
  const endBtn = content.querySelector('#btn-end-review');
  if (endBtn) {
    endBtn.addEventListener('click', async () => {
      // 批量保存所有已输入但未保存的进展
      const progressInputs = content.querySelectorAll('.review-progress');
      for (const input of progressInputs) {
        const content_ = input.value.trim();
        if (content_) {
          const taskId = input.closest('.review-task')?.dataset.taskId;
          const task = state.tasks.find((t) => t.id === taskId);
          if (task) {
            appendProgress(task, content_);
            task.updatedAt = Date.now();
            state.reviewTouched.add(task.id);
            await dbPut('tasks', task);
          }
        }
      }
      await dbPut('settings', { key: 'lastReviewDate', value: todayString() });
      await loadData();
      state.reviewMode = false;
      state.reviewTouched.clear();
      state.currentPeriodId = getDefaultPeriodId();
      showToast('复盘完成，明天继续加油 💪', 'success');
      renderHome();
      autoBackup();
    });
  }

  // 排序控件事件
  const sortSelect = content.querySelector('#review-sort-by');
  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      state.reviewSortBy = sortSelect.value;
      renderHome();
    });
  }
  const doneFirstCheck = content.querySelector('#review-done-first');
  if (doneFirstCheck) {
    doneFirstCheck.addEventListener('change', () => {
      state.reviewDoneFirst = doneFirstCheck.checked;
      renderHome();
    });
  }
}

function renderReviewTask(task) {
  const priorityInfo = PRIORITY_CONFIG[task.priority] || {};
  const isDone = task.status === 'done';
  const isCollapsed = state.reviewCollapsed.has(task.id);
  const deadlineDate = toDateString(task.deadline);
  const deadlineClass = getDeadlineClass(task.deadline);
  const deadlineText = task.deadline
    ? (task.deadline % (24 * 3600000) === 0 ? formatDate(task.deadline) : formatDateTime(task.deadline))
    : '';
  const deadlineDisplay = deadlineText
    ? `<span class="badge-deadline ${deadlineClass}">📅 ${deadlineText}</span>`
    : '';

  const statusBadge = isDone
    ? '<span class="badge badge-status">已完成</span>'
    : task.status === 'progress'
      ? '<span class="badge badge-status progress">进行中</span>'
      : '';

  const priorityOptions = PRIORITY_ORDER.map(
    (key) =>
      `<option value="${key}"${task.priority === key ? ' selected' : ''}>${PRIORITY_CONFIG[key].icon} ${PRIORITY_CONFIG[key].label}</option>`
  ).join('');

  return `
    <div class="review-task priority-${task.priority}${isDone ? ' done' : ''}${isCollapsed ? ' collapsed' : ''}" data-task-id="${task.id}">
      <div class="review-task-header">
        <span class="review-task-name-text">${escapeHtml(task.name)}</span>
        ${isCollapsed ? '' : '<button class="review-collapse-btn">收起</button>'}
      </div>

      <div class="review-task-compact"${isCollapsed ? '' : ' style="display:none;"'}>
        ${deadlineDisplay}
        ${statusBadge}
        <span class="badge badge-priority-${task.priority}">${priorityInfo.icon || ''} ${priorityInfo.label || ''}</span>
      </div>

      <div class="review-task-details"${isCollapsed ? ' style="display:none;"' : ''}>
        <div class="review-task-field">
          <span class="review-task-field-label">状态</span>
          <select class="review-status">
            <option value="todo"${task.status === 'todo' ? ' selected' : ''}>待办</option>
            <option value="progress"${task.status === 'progress' ? ' selected' : ''}>进行中</option>
            <option value="done"${task.status === 'done' ? ' selected' : ''}>已完成</option>
          </select>
        </div>

        <div class="review-task-field">
          <span class="review-task-field-label">优先级</span>
          <select class="review-priority">${priorityOptions}</select>
        </div>

        <div class="review-task-field">
          <span class="review-task-field-label">截止</span>
          <input type="date" class="review-deadline" value="${deadlineDate}" style="flex:1;" onfocus="this.showPicker()">
        </div>

        <div class="review-task-field">
          <span class="review-task-field-label">进展</span>
          <input type="text" class="review-progress" value="" placeholder="${latestProgress(task) ? '上次：' + latestProgress(task).slice(0, 20) : '记录新进展...'}" style="flex:1;">
          <button class="review-progress-save" style="display:none;">保存</button>
        </div>
      </div>
    </div>`;
}

async function autoBackup() {
  try {
    const tasks = await dbGetAll('tasks');
    const periods = await dbGetAll('periods');
    const tags = await dbGetAll('tags');
    const settings = await dbGetAll('settings');
    const backup = { version: 1, exportedAt: new Date().toISOString(), data: { tasks, periods, tags, settings } };
    const json = JSON.stringify(backup);
    localStorage.setItem('renwu_zhushou_auto_backup', json);
    await dbPut('settings', { key: 'lastBackup', value: new Date().toISOString() });
  } catch (e) {
    // 静默失败
  }
}

// ============ 标签页 ============


// ============ 设置页 ============

function renderSettings() {
  updateHeader('我的');
  const content = $('#app-content');
  const reviewTime = state.settings.reviewTime || DEFAULT_REVIEW_TIME;
  const totalTasks = state.tasks.length;
  const doneTasks = state.tasks.filter((t) => t.status === 'done').length;
  const lastBackup = state.settings.lastBackup || '';

  let lastBackupStr = '未备份';
  if (lastBackup) {
    const d = new Date(lastBackup);
    lastBackupStr = `${d.getMonth() + 1}月${d.getDate()}日 ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  }

  content.innerHTML = `
    <div class="review-banner" style="margin-bottom:20px;">
      <div class="review-banner-title">📊 任务概览</div>
      <div class="review-banner-desc">共 ${totalTasks} 个任务，已完成 ${doneTasks} 个</div>
      ${totalTasks > 0 ? `<div style="height:4px;background:rgba(255,255,255,0.2);border-radius:2px;overflow:hidden;"><div style="height:100%;width:${Math.round((doneTasks / totalTasks) * 100)}%;background:white;border-radius:2px;transition:width 0.5s;"></div></div>` : ''}
    </div>

    <div class="settings-group">
      <div class="settings-group-title">分类管理</div>
      <div class="settings-item" id="btn-tag-manage">
        <div class="settings-item-left">
          <span class="settings-item-icon">🏷️</span>
          <div>
            <div class="settings-item-label">标签管理</div>
            <div class="settings-item-desc">共 ${state.tags.length} 个标签</div>
          </div>
        </div>
        <span class="settings-item-value">›</span>
      </div>
    </div>

    <div class="settings-group">
      <div class="settings-group-title">提醒设置</div>
      <div class="settings-item" id="btn-review-time">
        <div class="settings-item-left">
          <span class="settings-item-icon">⏰</span>
          <div>
            <div class="settings-item-label">每日复盘提醒</div>
            <div class="settings-item-desc">每天固定时间提醒你复盘</div>
          </div>
        </div>
        <span class="settings-item-value">${reviewTime} ›</span>
      </div>
    </div>

    <div class="settings-group">
      <div class="settings-group-title">数据管理</div>
      <div class="settings-item" id="btn-export-backup">
        <div class="settings-item-left">
          <span class="settings-item-icon">📤</span>
          <div>
            <div class="settings-item-label">导出备份</div>
            <div class="settings-item-desc">上次备份：${lastBackupStr}</div>
          </div>
        </div>
        <span class="settings-item-value">›</span>
      </div>
      <div class="settings-item" id="btn-import-backup">
        <div class="settings-item-left">
          <span class="settings-item-icon">📥</span>
          <div>
            <div class="settings-item-label">恢复备份</div>
            <div class="settings-item-desc">从备份文件恢复数据</div>
          </div>
        </div>
        <span class="settings-item-value">›</span>
      </div>
    </div>

    <div style="text-align:center;padding:24px;color:var(--color-text-hint);font-size:12px;">
      任务助手 v1.0<br>
      数据仅存储在本地，无需联网
    </div>
  `;

  content.querySelector('#btn-tag-manage')?.addEventListener('click', showTagManageModal);
  content.querySelector('#btn-review-time')?.addEventListener('click', showReviewTimeModal);
  content.querySelector('#btn-export-backup')?.addEventListener('click', exportBackup);
  content.querySelector('#btn-import-backup')?.addEventListener('click', importBackup);
}

// ============ 提醒系统 ============

let reminderInterval = null;

function setupReminderCheck() {
  if (reminderInterval) clearInterval(reminderInterval);

  reminderInterval = setInterval(() => {
    checkReviewTime();
    checkDeadlines();
  }, 60000); // 每分钟检查一次

  // 立即检查一次
  checkReviewTime();
}

function checkReviewTime() {
  const reviewTime = state.settings.reviewTime || DEFAULT_REVIEW_TIME;
  const [h, m] = reviewTime.split(':');
  const now = new Date();
  const target = new Date();
  target.setHours(parseInt(h), parseInt(m), 0, 0);

  // 在目标时间 ±1 分钟内触发
  const diff = Math.abs(now - target);
  if (diff < 60000) {
    const lastReviewDate = state.settings.lastReviewDate || '';
    const today = todayString();
    if (lastReviewDate !== today) {
      sendNotification();
    }
  }
}

function checkDeadlines() {
  const activeTasks = state.tasks.filter((t) => t.status !== 'done' && t.deadline);
  const now = Date.now();
  activeTasks.forEach((task) => {
    const diff = task.deadline - now;
    // 剩余1小时内提醒
    if (diff > 0 && diff < 3600000) {
      const notifiedKey = `notified_${task.id}`;
      if (!sessionStorage.getItem(notifiedKey)) {
        const n = new Notification('⏰ 任务即将到期', {
          body: `「${task.name}」将在1小时内到期`,
          icon: './icons/icon-192.png',
          vibrate: [200, 100, 200],
          requireInteraction: true,
        });
        sessionStorage.setItem(notifiedKey, '1');
      }
    }
  });
}

function sendNotification() {
  if ('Notification' in window && Notification.permission === 'granted') {
    const pendingTasks = state.tasks.filter((t) => t.status !== 'done').length;
    new Notification('📋 每日复盘提醒', {
      body: pendingTasks > 0
        ? `还有 ${pendingTasks} 件事需要关注，点击开始复盘`
        : '今天的事情都做完了吗？回顾一下吧',
      icon: './icons/icon-192.png',
      badge: './icons/icon-192.png',
      vibrate: [200, 100, 200, 100, 200],
      tag: 'nightly-review',
      requireInteraction: true,
    });
  } else if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'SEND_NOTIFICATION',
      title: '📋 每日复盘提醒',
      body: '该进行今天的任务复盘了，回顾一下进展吧！',
    });
  }
}

async function requestNotificationPermission() {
  if ('Notification' in window) {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      showToast('通知已开启 ✓', 'success');
    }
  }
}

// ============ PWA 安装 ============

function setupPWA() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('./sw.js')
        .then((reg) => {
          console.log('SW registered');
        })
        .catch(() => {
          // Service Worker 注册失败，提醒功能降级
        });
    });

    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'REVIEW_REMINDER') {
        showToast('📋 该复盘了！', '');
      }
    });
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    state.deferredPrompt = e;
    renderHome();
  });

  window.addEventListener('appinstalled', () => {
    state.deferredPrompt = null;
    showToast('已添加到桌面 ✓', 'success');
    renderHome();
  });
}

// ============ 导航切换 ============

function switchTab(tab) {
  if (!tab) return; // 忽略没有 data-tab 的按钮（如中间的 +）
  if (state.reviewMode && tab !== 'home') {
    state.reviewMode = false;
    state.reviewTouched.clear();
    state.currentPeriodId = getDefaultPeriodId();
  }
  state.currentTab = tab;
  renderCurrentView();
}

// ============ 初始化 ============

async function initApp() {
  await openDB();
  await initDefaultData();
  await loadData();

  // 根据实际任务数据，自动选中排第一的时段
  state.currentPeriodId = getDefaultPeriodId();

  setupPWA();
  setupReminderCheck();

  // 导航事件（只绑定有 data-tab 属性的按钮，排除中间的 +）
  $$('.nav-item[data-tab]').forEach((item) => {
    item.addEventListener('click', () => {
      switchTab(item.dataset.tab);
    });
  });

  // FAB 按钮
  $('#fab-btn').addEventListener('click', async () => {
    if (state.reviewMode) {
      // 复盘模式下点击新建：先结束复盘再弹出
      await dbPut('settings', { key: 'lastReviewDate', value: todayString() });
      await loadData();
      state.reviewMode = false;
      state.reviewTouched.clear();
      state.currentPeriodId = getDefaultPeriodId();
      renderHome();
    }
    showAddTaskModal(state.currentPeriodId);
  });

  // 首次请求通知权限
  setTimeout(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      requestNotificationPermission();
    }
  }, 3000);

  renderCurrentView();

  // 打开即弹出录入框，方便快速记录
  setTimeout(() => {
    showAddTaskModal(state.currentPeriodId);
  }, 300);
}

// 启动应用
document.addEventListener('DOMContentLoaded', initApp);
