/**
 * 右鍵選單模組
 * 提供統一的右鍵選單功能
 */

let currentMenu = null;

/**
 * 創建右鍵選單項目
 * @param {Object} item - 選單項目配置
 * @returns {HTMLElement}
 */
function createMenuItem(item) {
  // 分隔線
  if (item.separator) {
    const separator = document.createElement('div');
    separator.className = 'context-menu-separator';
    return separator;
  }

  const menuItem = document.createElement('div');

  // 子選單
  if (item.submenu) {
    menuItem.className = 'context-menu-item context-menu-submenu';
    menuItem.innerHTML = `
      <span class="context-menu-icon">${item.icon || ''}</span>
      <span class="context-menu-label">${item.label}</span>
    `;

    const submenu = document.createElement('div');
    submenu.className = 'context-menu context-menu-nested';

    item.submenu.forEach(subItem => {
      const subMenuItem = createMenuItem(subItem);
      submenu.appendChild(subMenuItem);
    });

    menuItem.appendChild(submenu);

    // 滑鼠進入時偵測子選單是否超出右側邊界
    menuItem.addEventListener('mouseenter', () => {
      const menuRect = menuItem.getBoundingClientRect();
      const submenuWidth = 200; // 預估子選單寬度

      if (menuRect.right + submenuWidth > window.innerWidth) {
        menuItem.classList.add('submenu-left');
      } else {
        menuItem.classList.remove('submenu-left');
      }
    });
  } else {
    // 一般項目
    menuItem.className = `context-menu-item${item.danger ? ' danger' : ''}`;
    menuItem.innerHTML = `
      <span class="context-menu-icon">${item.icon || ''}</span>
      <span class="context-menu-label">${item.label}</span>
    `;

    if (item.onClick) {
      menuItem.addEventListener('click', e => {
        e.stopPropagation();
        closeContextMenu();
        item.onClick();
      });
    }
  }

  return menuItem;
}

/**
 * 顯示右鍵選單
 * @param {MouseEvent} event - 滑鼠事件
 * @param {Array} items - 選單項目陣列
 */
export function showContextMenu(event, items) {
  event.preventDefault();
  event.stopPropagation();

  // 關閉現有選單
  closeContextMenu();

  // 創建選單容器
  const menu = document.createElement('div');
  menu.className = 'context-menu';
  menu.setAttribute('role', 'menu');

  // 添加選單項目
  items.forEach(item => {
    const menuItem = createMenuItem(item);
    menu.appendChild(menuItem);
  });

  // 添加到 DOM
  document.body.appendChild(menu);
  currentMenu = menu;

  // 計算位置（確保不超出視窗）
  const rect = menu.getBoundingClientRect();
  let x = event.clientX;
  let y = event.clientY;

  // 右側超出
  if (x + rect.width > window.innerWidth) {
    x = window.innerWidth - rect.width - 8;
  }

  // 底部超出
  if (y + rect.height > window.innerHeight) {
    y = window.innerHeight - rect.height - 8;
  }

  menu.style.left = `${x}px`;
  menu.style.top = `${y}px`;

  // 點擊其他地方關閉選單
  setTimeout(() => {
    document.addEventListener('click', handleOutsideClick);
    document.addEventListener('contextmenu', handleOutsideClick);
    window.addEventListener('blur', closeContextMenu);
    document.addEventListener('keydown', handleEscKey);
  }, 0);
}

/**
 * 關閉右鍵選單
 */
export function closeContextMenu() {
  if (currentMenu) {
    currentMenu.remove();
    currentMenu = null;
  }

  document.removeEventListener('click', handleOutsideClick);
  document.removeEventListener('contextmenu', handleOutsideClick);
  window.removeEventListener('blur', closeContextMenu);
  document.removeEventListener('keydown', handleEscKey);
}

/**
 * 處理點擊選單外部
 */
function handleOutsideClick(e) {
  if (currentMenu && !currentMenu.contains(e.target)) {
    closeContextMenu();
  }
}

/**
 * 處理 ESC 鍵關閉選單
 */
function handleEscKey(e) {
  if (e.key === 'Escape') {
    closeContextMenu();
  }
}

/**
 * 獲取當前是否有選單開啟
 */
export function isContextMenuOpen() {
  return currentMenu !== null;
}
