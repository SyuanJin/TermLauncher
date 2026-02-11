/**
 * 版本更新檢查模組
 * 透過 GitHub API 檢查是否有新版本可用
 */
const { app } = require('electron');
const { createLogger } = require('./logger');
const { isNewerVersion } = require('./utils/version-utils');

const logger = createLogger('Updater');

const GITHUB_API_URL = 'https://api.github.com/repos/xjin9612/TermLauncher/releases/latest';

/**
 * 檢查是否有新版本
 * @returns {Promise<Object>} { hasUpdate, currentVersion, latestVersion, releaseUrl, releaseNotes }
 */
async function checkForUpdates() {
  const currentVersion = app.getVersion();

  try {
    const response = await fetch(GITHUB_API_URL, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': `TermLauncher/${currentVersion}`,
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      logger.warn(`GitHub API returned ${response.status}`);
      return { hasUpdate: false, currentVersion, error: 'api-error' };
    }

    const release = await response.json();
    const latestVersion = release.tag_name || '';
    const hasUpdate = isNewerVersion(currentVersion, latestVersion);

    logger.info(
      `Update check: current=${currentVersion}, latest=${latestVersion}, hasUpdate=${hasUpdate}`
    );

    return {
      hasUpdate,
      currentVersion,
      latestVersion: latestVersion.replace(/^v/, ''),
      releaseUrl: release.html_url || '',
      releaseNotes: release.body || '',
    };
  } catch (err) {
    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      logger.warn('Update check timed out');
      return { hasUpdate: false, currentVersion, error: 'timeout' };
    }
    logger.warn('Update check failed', err.message);
    return { hasUpdate: false, currentVersion, error: 'network-error' };
  }
}

module.exports = {
  checkForUpdates,
};
