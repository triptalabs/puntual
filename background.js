// background.js
// Seed inicial en la instalación si no hay prompts.
const DEFAULT_PROMPTS = [
  { id: 'p-1', code: 'SUM-ART-01', title: 'Resumen de Artículo', text: 'Crea un resumen conciso del siguiente artículo...', folder: 'root', favorite: false },
  { id: 'p-2', code: 'GEN-TWT-05', title: 'Generador de Tweets', text: 'Genera un tweet atractivo sobre...', folder: 'root', favorite: true },
  { id: 'p-3', code: 'COR-EST-03', title: 'Corrector de Estilo', text: 'Corrige el estilo y gramática del siguiente texto...', folder: 'root', favorite: false }
];

chrome.runtime.onInstalled.addListener(async () => {
  const { prompts } = await chrome.storage.local.get('prompts');
  if (!Array.isArray(prompts) || prompts.length === 0) {
    await chrome.storage.local.set({ prompts: DEFAULT_PROMPTS });
    console.log('[Prompt Manager +] Seed de prompts creado.');
  }
});

// Inyectar content script programáticamente
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && !tab.url.startsWith('chrome://')) {
    try {
      // Intentar inyección múltiple para asegurar que funcione
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['content.js']
      });
      console.log('[Prompt Manager +] Content script inyectado en:', tab.url);
      
      // También intentar inyectar en todos los frames
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tabId, allFrames: true },
          files: ['content.js']
        });
        console.log('[Prompt Manager +] Content script inyectado en todos los frames de:', tab.url);
      } catch (frameError) {
        console.log('[Prompt Manager +] No se pudo inyectar en frames de:', tab.url, frameError);
      }
    } catch (error) {
      console.log('[Prompt Manager +] No se pudo inyectar en:', tab.url, error);
    }
  }
});

// También inyectar cuando se activa una pestaña
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab.url && !tab.url.startsWith('chrome://')) {
      await chrome.scripting.executeScript({
        target: { tabId: activeInfo.tabId },
        files: ['content.js']
      });
      console.log('[Prompt Manager +] Content script inyectado en pestaña activa:', tab.url);
      
      // También intentar en todos los frames
      try {
        await chrome.scripting.executeScript({
          target: { tabId: activeInfo.tabId, allFrames: true },
          files: ['content.js']
        });
        console.log('[Prompt Manager +] Content script inyectado en todos los frames de pestaña activa:', tab.url);
      } catch (frameError) {
        console.log('[Prompt Manager +] No se pudo inyectar en frames de pestaña activa:', frameError);
      }
    }
  } catch (error) {
    console.log('[Prompt Manager +] No se pudo inyectar en pestaña activa:', error);
  }
});

// Inyectar cuando se crea una nueva pestaña
chrome.tabs.onCreated.addListener(async (tab) => {
  // Esperar un poco para que la pestaña se cargue
  setTimeout(async () => {
    try {
      if (tab.url && !tab.url.startsWith('chrome://')) {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        });
        console.log('[Prompt Manager +] Content script inyectado en nueva pestaña:', tab.url);
      }
    } catch (error) {
      console.log('[Prompt Manager +] No se pudo inyectar en nueva pestaña:', error);
    }
  }, 1000);
});

// Manejar atajo de teclado para abrir el popup
chrome.commands.onCommand.addListener((command) => {
  if (command === 'open-popup') {
    // Abrir el popup de la extensión
    chrome.action.openPopup();
  }
});
