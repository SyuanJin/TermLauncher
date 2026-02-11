/**
 * 彈窗系統模組
 * 提供通用彈窗元件，支援新增/編輯/刪除確認等操作
 */
import { t } from '../i18n.js';
import { escapeHtml, escapeAttr } from '../utils/escape.js';

// 當前開啟的彈窗
let currentModal = null;

/**
 * 彈窗類型定義
 */
export const ModalType = {
  DIRECTORY: 'directory',
  GROUP: 'group',
  TERMINAL: 'terminal',
  CONFIRM: 'confirm',
  SHORTCUTS: 'shortcuts',
};

/**
 * 建立彈窗 HTML 結構
 * @param {Object} options - 彈窗選項
 * @param {string} options.id - 彈窗 ID
 * @param {string} options.title - 彈窗標題
 * @param {string} options.content - 彈窗內容 HTML
 * @param {string} options.confirmText - 確認按鈕文字
 * @param {string} options.cancelText - 取消按鈕文字
 * @param {boolean} options.showCancel - 是否顯示取消按鈕
 * @param {string} options.confirmClass - 確認按鈕額外 class
 * @param {string} options.modalClass - 彈窗額外 class
 * @returns {HTMLElement} 彈窗元素
 */
function createModalElement(options) {
  const {
    id = 'modal-' + Date.now(),
    title,
    content,
    confirmText,
    cancelText,
    showCancel = true,
    confirmClass = 'btn-primary',
    modalClass = '',
  } = options;

  // 使用 i18n 翻譯預設文字
  const finalConfirmText = confirmText || t('common.save');
  const finalCancelText = cancelText || t('common.close');
  const closeLabel = t('common.close');

  const modalHtml = `
    <div class="modal-overlay" id="${escapeAttr(id)}">
      <div class="modal${modalClass ? ' ' + escapeAttr(modalClass) : ''}" role="dialog" aria-modal="true" aria-labelledby="${escapeAttr(id)}-title">
        <div class="modal-header">
          <h3 id="${escapeAttr(id)}-title">${escapeHtml(title)}</h3>
          <button class="modal-close" aria-label="${escapeAttr(closeLabel)}" data-action="close">✕</button>
        </div>
        <div class="modal-body">
          ${content}
        </div>
        <div class="modal-footer">
          ${showCancel ? `<button class="btn btn-secondary" data-action="cancel">${escapeHtml(finalCancelText)}</button>` : ''}
          <button class="btn ${escapeAttr(confirmClass)}" data-action="confirm">${escapeHtml(finalConfirmText)}</button>
        </div>
      </div>
    </div>
  `;

  const template = document.createElement('template');
  template.innerHTML = modalHtml.trim();
  return template.content.firstChild;
}

/**
 * 開啟彈窗
 * @param {Object} options - 彈窗選項
 * @param {string} options.id - 彈窗 ID
 * @param {string} options.title - 彈窗標題
 * @param {string} options.content - 彈窗內容 HTML
 * @param {string} options.confirmText - 確認按鈕文字
 * @param {string} options.cancelText - 取消按鈕文字
 * @param {boolean} options.showCancel - 是否顯示取消按鈕
 * @param {string} options.confirmClass - 確認按鈕額外 class
 * @param {Function} options.onConfirm - 確認回調
 * @param {Function} options.onCancel - 取消回調
 * @param {Function} options.onClose - 關閉回調
 * @param {Function} options.onOpen - 開啟後回調（用於初始化表單等）
 * @returns {HTMLElement} 彈窗元素
 */
export function openModal(options) {
  // 先關閉現有彈窗
  if (currentModal) {
    closeModal();
  }

  const modalElement = createModalElement(options);
  document.body.appendChild(modalElement);

  // 綁定事件
  const closeBtn = modalElement.querySelector('[data-action="close"]');
  const cancelBtn = modalElement.querySelector('[data-action="cancel"]');
  const confirmBtn = modalElement.querySelector('[data-action="confirm"]');
  const overlay = modalElement;

  // 關閉按鈕
  closeBtn?.addEventListener('click', () => {
    options.onClose?.();
    closeModal();
  });

  // 取消按鈕
  cancelBtn?.addEventListener('click', () => {
    options.onCancel?.();
    closeModal();
  });

  // 確認按鈕
  confirmBtn?.addEventListener('click', async () => {
    const result = await options.onConfirm?.();
    // 如果 onConfirm 回傳 false，不關閉彈窗（用於驗證失敗時）
    if (result !== false) {
      closeModal();
    }
  });

  // 點擊遮罩關閉
  overlay.addEventListener('click', e => {
    if (e.target === overlay) {
      options.onClose?.();
      closeModal();
    }
  });

  // Escape 關閉 + Tab 焦點陷阱
  const handleKeydown = e => {
    if (e.key === 'Escape') {
      options.onClose?.();
      closeModal();
      return;
    }

    // 焦點陷阱：Tab 鍵只在彈窗內循環
    if (e.key === 'Tab') {
      const modal = modalElement.querySelector('.modal');
      const focusable = modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
  };
  document.addEventListener('keydown', handleKeydown);
  modalElement._keydownHandler = handleKeydown;

  // 顯示動畫
  requestAnimationFrame(() => {
    modalElement.classList.add('show');
  });

  currentModal = modalElement;

  // 開啟後回調
  options.onOpen?.(modalElement);

  // 聚焦到第一個輸入框
  const firstInput = modalElement.querySelector('input, select, textarea');
  if (firstInput) {
    firstInput.focus();
  }

  return modalElement;
}

/**
 * 關閉當前彈窗
 */
export function closeModal() {
  if (!currentModal) return;

  // 移除 Escape 事件監聽
  if (currentModal._keydownHandler) {
    document.removeEventListener('keydown', currentModal._keydownHandler);
  }

  currentModal.classList.remove('show');

  // 等待動畫完成後移除元素
  setTimeout(() => {
    currentModal?.remove();
    currentModal = null;
  }, 200);
}

/**
 * 嘗試關閉當前彈窗
 * @returns {boolean} 是否有彈窗被關閉
 */
export function closeCurrentModal() {
  if (currentModal) {
    closeModal();
    return true;
  }
  return false;
}

/**
 * 取得當前彈窗元素
 * @returns {HTMLElement|null}
 */
export function getCurrentModal() {
  return currentModal;
}

/**
 * 開啟確認彈窗
 * @param {Object} options - 確認彈窗選項
 * @param {string} options.title - 標題
 * @param {string} options.message - 確認訊息
 * @param {string} options.confirmText - 確認按鈕文字
 * @param {string} options.cancelText - 取消按鈕文字
 * @param {boolean} options.danger - 是否為危險操作（紅色確認按鈕）
 * @param {Function} options.onConfirm - 確認回調
 */
export function openConfirmModal(options) {
  const { title, message, confirmText, cancelText, danger = false, onConfirm } = options;

  return openModal({
    id: 'confirm-modal',
    title,
    content: '<p class="confirm-message">' + escapeHtml(message) + '</p>',
    confirmText,
    cancelText,
    confirmClass: danger ? 'btn-danger' : 'btn-primary',
    onConfirm,
  });
}

/**
 * 建立表單輸入欄位 HTML
 * @param {Object} field - 欄位定義
 * @param {string} field.name - 欄位名稱
 * @param {string} field.label - 欄位標籤
 * @param {string} field.type - 輸入類型 (text, select, textarea)
 * @param {string} field.placeholder - 佔位文字
 * @param {string} field.value - 預設值
 * @param {Array} field.options - select 選項 [{value, label}]
 * @param {string} field.hint - 提示文字
 * @param {boolean} field.required - 是否必填
 * @param {number} field.maxLength - 最大長度
 * @param {string} field.className - 額外 class
 * @returns {string} HTML 字串
 */
export function createFormField(field) {
  const {
    name,
    label,
    type = 'text',
    placeholder = '',
    value = '',
    options = [],
    hint = '',
    required = false,
    maxLength = '',
    className = '',
  } = field;

  let inputHtml = '';

  if (type === 'select') {
    inputHtml = `
      <select id="modal-${escapeAttr(name)}" name="${escapeAttr(name)}" class="${escapeAttr(className)}"${required ? ' required' : ''}>
        ${options.map(opt => `<option value="${escapeAttr(opt.value)}"${opt.value === value ? ' selected' : ''}>${escapeHtml(opt.label)}</option>`).join('')}
      </select>
    `;
  } else if (type === 'textarea') {
    inputHtml = `
      <textarea id="modal-${escapeAttr(name)}" name="${escapeAttr(name)}" class="${escapeAttr(className)}" placeholder="${escapeAttr(placeholder)}"${required ? ' required' : ''}${maxLength ? ` maxlength="${escapeAttr(maxLength)}"` : ''}>${escapeHtml(value)}</textarea>
    `;
  } else {
    inputHtml = `
      <input type="${escapeAttr(type)}" id="modal-${escapeAttr(name)}" name="${escapeAttr(name)}" class="${escapeAttr(className)}" placeholder="${escapeAttr(placeholder)}" value="${escapeAttr(value)}"${required ? ' required' : ''}${maxLength ? ` maxlength="${escapeAttr(maxLength)}"` : ''} />
    `;
  }

  return `
    <div class="input-group">
      <label for="modal-${escapeAttr(name)}">${escapeHtml(label)}${required ? '<span class="required-mark">*</span>' : ''}</label>
      ${inputHtml}
      ${hint ? `<small class="hint">${escapeHtml(hint)}</small>` : ''}
    </div>
  `;
}

/**
 * 從彈窗表單取得資料
 * @param {HTMLElement} modal - 彈窗元素
 * @param {Array<string>} fieldNames - 欄位名稱陣列
 * @returns {Object} 表單資料
 */
export function getModalFormData(modal, fieldNames) {
  const data = {};
  fieldNames.forEach(name => {
    const input = modal.querySelector(`[name="${name}"]`);
    if (input) {
      if (input.type === 'checkbox') {
        data[name] = input.checked;
      } else {
        data[name] = input.value.trim();
      }
    }
  });
  return data;
}

/**
 * 設定彈窗表單資料
 * @param {HTMLElement} modal - 彈窗元素
 * @param {Object} data - 表單資料
 */
export function setModalFormData(modal, data) {
  Object.entries(data).forEach(([name, value]) => {
    const input = modal.querySelector(`[name="${name}"]`);
    if (input) {
      if (input.type === 'checkbox') {
        input.checked = Boolean(value);
      } else {
        input.value = value;
      }
    }
  });
}
