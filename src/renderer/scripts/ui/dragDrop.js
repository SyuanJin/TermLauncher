/**
 * 拖拉排序模組
 * 處理最愛、群組、目錄的拖拉排序功能
 */
import { getConfig, saveConfig } from '../state.js';

// 當前拖曳的元素
let draggedElement = null;
let draggedType = null; // 'favorite', 'group', 'directory', 'terminal'
let placeholder = null;

/**
 * 創建佔位元素
 * @returns {HTMLElement} 佔位元素
 */
function createPlaceholder() {
  const el = document.createElement('div');
  el.className = 'drag-placeholder';
  return el;
}

/**
 * 取得拖曳目標的插入位置
 * @param {HTMLElement} container - 容器元素
 * @param {number} y - 滑鼠 Y 座標
 * @param {string} itemSelector - 項目選擇器
 * @returns {HTMLElement|null} 插入位置的參考元素
 */
function getDragAfterElement(container, y, itemSelector) {
  const draggableElements = [
    ...container.querySelectorAll(`${itemSelector}:not(.dragging):not(.drag-placeholder)`),
  ];

  return draggableElements.reduce(
    (closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) {
        return { offset, element: child };
      }
      return closest;
    },
    { offset: Number.NEGATIVE_INFINITY }
  ).element;
}

/**
 * 初始化最愛列表的拖拉排序
 */
export function initFavoritesDragDrop() {
  const container = document.querySelector('#favoritesListContainer .directory-list');
  if (!container) return;

  const items = container.querySelectorAll('.directory-item');
  items.forEach(item => {
    item.setAttribute('draggable', 'true');

    item.addEventListener('dragstart', e => {
      draggedElement = item;
      draggedType = 'favorite';
      item.classList.add('dragging');
      placeholder = createPlaceholder();

      // 設定拖曳資料
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', item.dataset.id);

      // 延遲添加佔位元素，避免閃爍
      requestAnimationFrame(() => {
        item.style.display = 'none';
        container.insertBefore(placeholder, item);
      });
    });

    item.addEventListener('dragend', async () => {
      item.classList.remove('dragging');
      item.style.display = '';

      if (placeholder && placeholder.parentNode) {
        placeholder.parentNode.removeChild(placeholder);
      }

      // 儲存新順序
      if (draggedType === 'favorite') {
        await saveFavoritesOrder(container);
      }

      draggedElement = null;
      draggedType = null;
      placeholder = null;
    });
  });

  container.addEventListener('dragover', e => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    if (draggedType !== 'favorite' || !placeholder) return;

    const afterElement = getDragAfterElement(container, e.clientY, '.directory-item');
    if (afterElement) {
      container.insertBefore(placeholder, afterElement);
    } else {
      container.appendChild(placeholder);
    }
  });

  container.addEventListener('drop', e => {
    e.preventDefault();
    if (draggedType !== 'favorite' || !draggedElement || !placeholder) return;

    // 將元素插入到佔位元素的位置
    placeholder.parentNode.insertBefore(draggedElement, placeholder);
  });
}

/**
 * 儲存最愛列表的順序
 * @param {HTMLElement} container - 容器元素
 */
async function saveFavoritesOrder(container) {
  const config = getConfig();
  const items = container.querySelectorAll('.directory-item');
  const newOrder = [...items].map(item => parseInt(item.dataset.id, 10));

  // 更新 favorites 陣列順序
  config.favorites = newOrder;
  await saveConfig();
}

/**
 * 初始化群組列表的拖拉排序
 */
export function initGroupsDragDrop() {
  const container = document.querySelector('#groupsListContainer .groups-grid');
  if (!container) return;

  const cards = container.querySelectorAll('.group-card');
  cards.forEach(card => {
    card.setAttribute('draggable', 'true');

    card.addEventListener('dragstart', e => {
      draggedElement = card;
      draggedType = 'group';
      card.classList.add('dragging');
      placeholder = createPlaceholder();
      placeholder.classList.add('group-card-placeholder');

      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', card.dataset.groupId);

      requestAnimationFrame(() => {
        card.style.display = 'none';
        container.insertBefore(placeholder, card);
      });
    });

    card.addEventListener('dragend', async () => {
      card.classList.remove('dragging');
      card.style.display = '';

      if (placeholder && placeholder.parentNode) {
        placeholder.parentNode.removeChild(placeholder);
      }

      if (draggedType === 'group') {
        await saveGroupsOrder(container);
      }

      draggedElement = null;
      draggedType = null;
      placeholder = null;
    });
  });

  container.addEventListener('dragover', e => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    if (draggedType !== 'group' || !placeholder) return;

    const afterElement = getDragAfterElement(container, e.clientY, '.group-card');
    if (afterElement) {
      container.insertBefore(placeholder, afterElement);
    } else {
      container.appendChild(placeholder);
    }
  });

  container.addEventListener('drop', e => {
    e.preventDefault();
    if (draggedType !== 'group' || !draggedElement || !placeholder) return;

    placeholder.parentNode.insertBefore(draggedElement, placeholder);
  });
}

/**
 * 儲存群組列表的順序
 * @param {HTMLElement} container - 容器元素
 */
async function saveGroupsOrder(container) {
  const config = getConfig();
  const cards = container.querySelectorAll('.group-card');

  cards.forEach((card, index) => {
    const groupId = card.dataset.groupId;
    const group = config.groups.find(g => g.id === groupId);
    if (group) {
      group.order = index;
    }
  });

  await saveConfig();
}

/**
 * 初始化目錄列表的拖拉排序（群組內）
 */
export function initDirectoriesDragDrop() {
  const sections = document.querySelectorAll('#directoryGroups .group-section');

  sections.forEach(section => {
    const list = section.querySelector('.directory-list');
    if (!list) return;

    const items = list.querySelectorAll('.directory-item');
    items.forEach(item => {
      item.setAttribute('draggable', 'true');

      item.addEventListener('dragstart', e => {
        draggedElement = item;
        draggedType = 'directory';
        item.classList.add('dragging');
        placeholder = createPlaceholder();

        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', item.dataset.id);

        requestAnimationFrame(() => {
          item.style.display = 'none';
          list.insertBefore(placeholder, item);
        });
      });

      item.addEventListener('dragend', async () => {
        item.classList.remove('dragging');
        item.style.display = '';

        if (placeholder && placeholder.parentNode) {
          placeholder.parentNode.removeChild(placeholder);
        }

        if (draggedType === 'directory') {
          await saveDirectoriesOrder();
        }

        draggedElement = null;
        draggedType = null;
        placeholder = null;
      });
    });

    list.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';

      if (draggedType !== 'directory' || !placeholder) return;

      const afterElement = getDragAfterElement(list, e.clientY, '.directory-item');
      if (afterElement) {
        list.insertBefore(placeholder, afterElement);
      } else {
        list.appendChild(placeholder);
      }
    });

    list.addEventListener('drop', e => {
      e.preventDefault();
      if (draggedType !== 'directory' || !draggedElement || !placeholder) return;

      placeholder.parentNode.insertBefore(draggedElement, placeholder);
    });
  });
}

/**
 * 儲存目錄列表的順序
 */
async function saveDirectoriesOrder() {
  const config = getConfig();
  const sections = document.querySelectorAll('#directoryGroups .group-section');

  sections.forEach(section => {
    const groupId = section.dataset.groupId;
    const items = section.querySelectorAll('.directory-item');

    items.forEach((item, index) => {
      const dirId = parseInt(item.dataset.id, 10);
      const dir = config.directories.find(d => d.id === dirId);
      if (dir) {
        dir.order = index;
        // 如果拖到不同群組，更新群組
        if (dir.group !== groupId) {
          dir.group = groupId;
        }
      }
    });
  });

  await saveConfig();
}

/**
 * 初始化終端列表的拖拉排序
 */
export function initTerminalsDragDrop() {
  const container = document.getElementById('terminalsList');
  if (!container) return;

  const items = container.querySelectorAll('.terminal-item');
  items.forEach(item => {
    item.setAttribute('draggable', 'true');

    item.addEventListener('dragstart', e => {
      draggedElement = item;
      draggedType = 'terminal';
      item.classList.add('dragging');
      placeholder = createPlaceholder();

      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', item.dataset.terminalId);

      requestAnimationFrame(() => {
        item.style.display = 'none';
        container.insertBefore(placeholder, item);
      });
    });

    item.addEventListener('dragend', async () => {
      item.classList.remove('dragging');
      item.style.display = '';

      if (placeholder && placeholder.parentNode) {
        placeholder.parentNode.removeChild(placeholder);
      }

      if (draggedType === 'terminal') {
        await saveTerminalsOrder(container);
      }

      draggedElement = null;
      draggedType = null;
      placeholder = null;
    });
  });

  container.addEventListener('dragover', e => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    if (draggedType !== 'terminal' || !placeholder) return;

    const afterElement = getDragAfterElement(container, e.clientY, '.terminal-item');
    if (afterElement) {
      container.insertBefore(placeholder, afterElement);
    } else {
      container.appendChild(placeholder);
    }
  });

  container.addEventListener('drop', e => {
    e.preventDefault();
    if (draggedType !== 'terminal' || !draggedElement || !placeholder) return;

    placeholder.parentNode.insertBefore(draggedElement, placeholder);
  });
}

/**
 * 儲存終端列表的順序
 * @param {HTMLElement} container - 容器元素
 */
async function saveTerminalsOrder(container) {
  const config = getConfig();
  const items = container.querySelectorAll('.terminal-item');

  items.forEach((item, index) => {
    const terminalId = item.dataset.terminalId;
    const terminal = config.terminals.find(t => t.id === terminalId);
    if (terminal) {
      terminal.order = index;
    }
  });

  // 按 order 物理重排陣列
  config.terminals.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  await saveConfig();
}
