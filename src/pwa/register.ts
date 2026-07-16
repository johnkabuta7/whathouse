// Guarded PWA registration. Only registers in production, outside Lovable preview/iframe,
// and honors `?sw=off` kill switch.
export async function registerPWA() {
  if (!('serviceWorker' in navigator)) return;

  const inIframe = (() => { try { return window.self !== window.top; } catch { return true; } })();
  const host = window.location.hostname;
  const isPreviewHost =
    host.startsWith('id-preview--') ||
    host.startsWith('preview--') ||
    host === 'lovableproject.com' || host.endsWith('.lovableproject.com') ||
    host === 'lovableproject-dev.com' || host.endsWith('.lovableproject-dev.com') ||
    host === 'beta.lovable.dev' || host.endsWith('.beta.lovable.dev');
  const killSwitch = new URLSearchParams(window.location.search).get('sw') === 'off';
  const refused = !import.meta.env.PROD || inIframe || isPreviewHost || killSwitch;

  if (refused) {
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r => r.unregister()));
    } catch {}
    return;
  }

  try {
    const { Workbox } = await import('workbox-window');
    const wb = new Workbox('/sw.js');
    wb.addEventListener('waiting', () => wb.messageSkipWaiting());
    await wb.register();
  } catch {}
}
