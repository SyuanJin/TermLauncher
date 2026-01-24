/**
 * 系統托盤模組
 * 處理系統托盤圖示與選單
 */
const { Tray, Menu, nativeImage, app } = require('electron');
const { getMainWindow } = require('./window');

let tray = null;

/**
 * 建立系統托盤
 */
function createTray() {
  // 建立簡單的托盤圖示
  const icon = nativeImage.createFromDataURL(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAA7AAAAOwBeShxvQAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAKoSURBVFiF7ZdNaBNBFMd/s5tNsk2apE1jqy1Si4IIFqwieBDBgxcvnrx4EfTkwYMnwYMX8eLNi+BJ8KQXEUQQBBGtoFYrFa22mvpRm6RJk81md8eDMd1kN2lU8OI/DOy8eW/+M/Nm5q1QSvE/m/a/CfwrC9g2IIRwAR3AWuATEAUGlVJz/ySAEKIMOAvsA1qBeSHEK+AecE8p9TlrwHwVSNqPANATz+uiVcBhYHtKn1JKvU1IgD+sQCnVmq8A2SywJU5qwAJzfyKE08a+m+O5ELh7IYR7IRBCNCAiCvQgOoDhTOP9CzQHPKVUMGXALaVUtB8CYWRFANgwzN2/A1QE5oDGJL8A7gB+4EMG7Q7gqFLqGYAW7wjDfTpKKYRqB67m2wXwXil1J6UP+Iq4AQeBXcByIIi4gR8BJuAAcB1oBH4B55RSoXwEAEgp5ZdStQB7gXeAJxZ7FFiWIvsB2KaUCjpZYBaYVEoF45z3Ai+Bg8AaIYQghBgGJpVS7wGUUp5YQQL0A/twHKD0WwagA3AOcF8p9cRB7jvQqpT6TbwrWuVCVLCB04A7xTKplPqS6AfmhBB3gSql1A0hhF8IcR3YBDQDV5VSbxtMB1DnxKEQwgBuA8FAX9B7s0VKaYCyJLoqFJuBU0FfT7N2UNfHIqMtHg+xHfgJ3APKJaVMcQC2A7uBC0qpkYJ4LLAD2A20AQNKqUdJso7nwAQwAHQA64UQ08ANYAEYA/YopYZN7oZhHA8EAquBzcAssCqL8gDwBAgAr4HBDJaGYYwBe5RSI7FYAKVUOBgMdMQKK4BRk7uhlIoIIW4BQ+k+wqJj+xYAOu/aqgJAEJhSSoVMxEeBCCljF7AZ2BVfp2HgI+BO8ncCzVYngBHgRaGr/l/bH+gXrBaIG2g2AAAAAElFTkSuQmCC'
  );

  tray = new Tray(icon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '顯示視窗',
      click: () => {
        const mainWindow = getMainWindow();
        if (mainWindow) mainWindow.show();
      },
    },
    { type: 'separator' },
    {
      label: '結束',
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setToolTip('TermLauncher');
  tray.setContextMenu(contextMenu);

  tray.on('double-click', () => {
    const mainWindow = getMainWindow();
    if (mainWindow) mainWindow.show();
  });

  return tray;
}

/**
 * 取得托盤實例
 * @returns {Tray|null} 托盤實例
 */
function getTray() {
  return tray;
}

module.exports = {
  createTray,
  getTray,
};
