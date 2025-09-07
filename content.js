// content.js
// Inserta prompts al escribir ++codigo seguido de Space/Enter/Tab en inputs/textarea.

// Debug inmediato
console.log('[Prompt Manager +] Content script iniciando...');
console.log('[Prompt Manager +] URL actual:', window.location.href);
console.log('[Prompt Manager +] Document ready state:', document.readyState);

let cache = { byCode: new Map(), lastSync: 0 };

async function syncPrompts(force = false) {
  const now = Date.now();
  if (!force && now - cache.lastSync < 3000) return;
  
  console.log('[Prompt Manager +] Sincronizando prompts...');
  const { prompts } = await chrome.storage.local.get('prompts');
  console.log('[Prompt Manager +] Prompts obtenidos:', prompts);
  
  const map = new Map();
  for (const p of (prompts || [])) {
    if (p && typeof p.code === 'string') {
      map.set(p.code.toLowerCase(), p);
      console.log('[Prompt Manager +] Prompt añadido al cache:', p.code, p.title);
    }
  }
  cache.byCode = map;
  cache.lastSync = now;
  console.log('[Prompt Manager +] Cache actualizado con', map.size, 'prompts');
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.prompts) syncPrompts(true);
});
syncPrompts(true);

function isEditable(el) {
  if (!el) return false;
  
  // 1. ELEMENTOS TRADICIONALES HTML (siempre editables)
  if (el.tagName === 'TEXTAREA') {
    console.log('[Prompt Manager +] Elemento editable: TEXTAREA tradicional');
    return true;
  }
  
  if (el.tagName === 'INPUT') {
    const t = (el.type || 'text').toLowerCase();
    const editableTypes = ['text','search','email','url','tel','number','password'];
    if (editableTypes.includes(t)) {
      console.log('[Prompt Manager +] Elemento editable: INPUT tipo', t);
      return true;
    }
  }
  
  // 2. ELEMENTOS CONTENTEDITABLE (cualquier valor)
  if (el.hasAttribute('contenteditable')) {
    console.log('[Prompt Manager +] Elemento editable: tiene atributo contenteditable');
    return true;
  }
  
  // 3. ELEMENTOS CON ROLES DE ACCESIBILIDAD
  const role = el.getAttribute('role');
  if (role === 'textbox' || role === 'combobox' || role === 'searchbox' || role === 'search') {
    console.log('[Prompt Manager +] Elemento editable: rol', role);
    return true;
  }
  
  // 4. ELEMENTOS CON ATRIBUTOS ESPECÍFICOS DE FRAMEWORKS
  if (el.hasAttribute('data-testid')) {
    const testId = el.getAttribute('data-testid').toLowerCase();
    if (testId.includes('textbox') || testId.includes('input') || testId.includes('composer') || 
        testId.includes('editor') || testId.includes('message') || testId.includes('chat')) {
      console.log('[Prompt Manager +] Elemento editable: data-testid', testId);
      return true;
    }
  }
  
  // 5. DETECCIÓN GENÉRICA: SI ESTÁ EN FOCO Y NO ES CLARAMENTE NO-EDITABLE
  if (document.activeElement === el) {
    // Elementos que claramente NO son editables
    const nonEditableElements = [
      'BUTTON', 'IMG', 'VIDEO', 'AUDIO', 'CANVAS', 'SVG', 'IFRAME', 
      'SCRIPT', 'STYLE', 'LINK', 'META', 'TITLE', 'HEAD', 'BR', 'HR'
    ];
    
    if (!nonEditableElements.includes(el.tagName)) {
      console.log('[Prompt Manager +] Elemento editable: está en foco y no es no-editable');
      return true;
    }
  }
  
  // 5.1. DETECCIÓN ULTRA-AGRESIVA: CUALQUIER ELEMENTO QUE PUEDA RECIBIR TEXTO
  if (document.activeElement === el) {
    // Si está en foco, asumir que es editable a menos que sea claramente no-texto
    const definitelyNotText = ['BUTTON', 'IMG', 'VIDEO', 'AUDIO', 'CANVAS', 'SVG', 'IFRAME', 'SCRIPT', 'STYLE', 'LINK', 'META', 'TITLE', 'HEAD', 'BR', 'HR', 'INPUT', 'TEXTAREA'];
    
    if (!definitelyNotText.includes(el.tagName)) {
      console.log('[Prompt Manager +] Elemento editable: detección ultra-agresiva - está en foco');
      return true;
    }
  }
  
  // 6. ELEMENTOS QUE ACEPTAN FOCUS (tabIndex >= 0)
  if (el.tabIndex >= 0) {
    console.log('[Prompt Manager +] Elemento editable: acepta focus (tabIndex >= 0)');
    return true;
  }
  
  // 7. ELEMENTOS CON EVENTOS DE TECLADO
  if (el.onkeydown || el.onkeypress || el.onkeyup) {
    console.log('[Prompt Manager +] Elemento editable: tiene eventos de teclado');
    return true;
  }
  
  // 8. BÚSQUEDA EN PADRES (último recurso)
  let parent = el.parentElement;
  let depth = 0;
  while (parent && parent !== document.body && depth < 3) {
    // Verificar contentEditable en padres
    if (parent.hasAttribute('contenteditable')) {
      console.log('[Prompt Manager +] Elemento editable: padre tiene contenteditable');
      return true;
    }
    
    // Verificar roles en padres
    const parentRole = parent.getAttribute('role');
    if (parentRole === 'textbox' || parentRole === 'combobox' || parentRole === 'searchbox') {
      console.log('[Prompt Manager +] Elemento editable: padre tiene rol', parentRole);
      return true;
    }
    
    parent = parent.parentElement;
    depth++;
  }
  
  console.log('[Prompt Manager +] Elemento NO editable después de todas las verificaciones');
  return false;
}

function getTriggerFromInput(el) {
  let text, caret;
  
  console.log('[Prompt Manager +] Obteniendo trigger de elemento:', el.tagName, el.type);
  
  // Para elementos tradicionales (input, textarea)
  if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
    text = el.value;
    caret = el.selectionStart;
    console.log('[Prompt Manager +] Elemento tradicional - texto:', text, 'cursor:', caret);
  } 
  // Para elementos contenteditable o híbridos
  else {
    // Intentar obtener texto del elemento de diferentes maneras
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const preCaretRange = range.cloneRange();
      preCaretRange.selectNodeContents(el);
      preCaretRange.setEnd(range.endContainer, range.endOffset);
      text = preCaretRange.toString();
      caret = text.length;
      console.log('[Prompt Manager +] Elemento contenteditable - texto:', text, 'cursor:', caret);
    } else {
      // Fallback: usar textContent o innerText
      text = el.textContent || el.innerText || '';
      caret = text.length;
      console.log('[Prompt Manager +] Elemento fallback - texto:', text, 'cursor:', caret);
    }
  }
  
  if (!text) {
    console.log('[Prompt Manager +] No se pudo obtener texto del elemento');
    return null;
  }
  
  const before = text.slice(0, caret);
  console.log('[Prompt Manager +] Texto antes del cursor:', before);
  
  // Buscar el patrón ++codigo, permitiendo espacios o caracteres de control después
  const m = before.match(/\+\+([a-z0-9_-]{2,32})(?:\s|$)/i);
  if (!m) {
    console.log('[Prompt Manager +] No se encontró patrón ++codigo');
    return null;
  }
  
  const full = m[0]; // incluye el ++codigo y posiblemente un espacio
  const code = m[1].toLowerCase();
  const commandOnly = `++${code}`; // solo el comando sin espacio
  
  // Calcular posiciones basándose en el comando sin el espacio
  const start = caret - full.length;
  const end = start + commandOnly.length;
  
  console.log('[Prompt Manager +] Trigger encontrado:', { code, start, end, full, commandOnly });
  
  return { 
    code, 
    start, 
    end, 
    text, 
    full: commandOnly, // usar solo el comando para el reemplazo
    isContentEditable: el.contentEditable === 'true' || el.tagName !== 'INPUT' 
  };
}

async function onKeyDown(e) {
  if (!(e.key === ' ' || e.key === 'Enter' || e.key === 'Tab')) return;
  
  const el = document.activeElement;
  console.log('[Prompt Manager +] Elemento activo:', el.tagName, el.type);
  console.log('[Prompt Manager +] Elemento completo:', el);
  console.log('[Prompt Manager +] ContentEditable:', el.contentEditable);
  console.log('[Prompt Manager +] Role:', el.getAttribute('role'));
  console.log('[Prompt Manager +] Clases:', el.className);
  console.log('[Prompt Manager +] ID:', el.id);
  console.log('[Prompt Manager +] TabIndex:', el.tabIndex);
  
  if (!isEditable(el)) {
    console.log('[Prompt Manager +] Elemento no es editable - investigando...');
    console.log('[Prompt Manager +] TagName:', el.tagName);
    console.log('[Prompt Manager +] Type:', el.type);
    console.log('[Prompt Manager +] ContentEditable:', el.contentEditable);
    console.log('[Prompt Manager +] HasAttribute contenteditable:', el.hasAttribute('contenteditable'));
    console.log('[Prompt Manager +] Role:', el.getAttribute('role'));
    console.log('[Prompt Manager +] ClassName:', el.className);
    console.log('[Prompt Manager +] ID:', el.id);
    console.log('[Prompt Manager +] TabIndex:', el.tabIndex);
    console.log('[Prompt Manager +] IsContentEditable:', el.isContentEditable);
    console.log('[Prompt Manager +] URL actual:', window.location.href);
    console.log('[Prompt Manager +] Document title:', document.title);
    
    // Logging específico para DeepSeek y Qwen
    if (window.location.href.includes('deepseek') || window.location.href.includes('qwen')) {
      console.log('[Prompt Manager +] === DEBUGGING DEEPSEEK/QWEN ===');
      console.log('[Prompt Manager +] Elemento completo:', el);
      console.log('[Prompt Manager +] Elemento outerHTML:', el.outerHTML);
      console.log('[Prompt Manager +] Elemento parentElement:', el.parentElement);
      console.log('[Prompt Manager +] Elemento parentElement outerHTML:', el.parentElement?.outerHTML);
      console.log('[Prompt Manager +] Elemento parentElement parentElement:', el.parentElement?.parentElement);
      console.log('[Prompt Manager +] Elemento parentElement parentElement outerHTML:', el.parentElement?.parentElement?.outerHTML);
      console.log('[Prompt Manager +] === FIN DEBUGGING ===');
    }
    
    return;
  }
  
  if (el.type && el.type.toLowerCase() === 'password') {
    console.log('[Prompt Manager +] Elemento es password, ignorando');
    return;
  }

  const trig = getTriggerFromInput(el);
  console.log('[Prompt Manager +] Trigger encontrado:', trig);
  
  if (!trig) return;
  
  await syncPrompts(false);
  const prompt = cache.byCode.get(trig.code);
  console.log('[Prompt Manager +] Prompt encontrado:', prompt);
  
  if (!prompt) {
    console.log('[Prompt Manager +] No se encontró prompt para código:', trig.code);
    return;
  }

  e.preventDefault(); // evita insertar el espacio/enter original
  try {
    if (trig.isContentEditable) {
      // Para elementos contenteditable (ChatGPT, Discord, etc.)
      const selection = window.getSelection();
      if (selection.rangeCount) {
        const range = selection.getRangeAt(0);
        
        // Obtener el texto completo del elemento
        const fullText = el.textContent || el.innerText || '';
        const commandStart = fullText.lastIndexOf(trig.full);
        
        if (commandStart !== -1) {
          // Crear un rango que cubra exactamente el comando ++codigo
          const commandRange = document.createRange();
          
          // Buscar el nodo de texto que contiene el comando
          const walker = document.createTreeWalker(
            el,
            NodeFilter.SHOW_TEXT,
            null,
            false
          );
          
          let currentPos = 0;
          let textNode = walker.nextNode();
          let targetNode = null;
          let targetOffset = 0;
          
          while (textNode) {
            const nodeLength = textNode.textContent.length;
            if (currentPos + nodeLength > commandStart) {
              targetNode = textNode;
              targetOffset = commandStart - currentPos;
              break;
            }
            currentPos += nodeLength;
            textNode = walker.nextNode();
          }
          
          if (targetNode) {
            // Establecer el rango para cubrir el comando
            commandRange.setStart(targetNode, targetOffset);
            commandRange.setEnd(targetNode, targetOffset + trig.full.length);
            
            // Eliminar el comando y insertar el texto del prompt + espacio
            commandRange.deleteContents();
            commandRange.insertNode(document.createTextNode(prompt.text + ' '));
            
            // Colapsar el rango al final del texto insertado
            commandRange.collapse(false);
            selection.removeAllRanges();
            selection.addRange(commandRange);
            
            console.log('[Prompt Manager +] Comando reemplazado en contenteditable:', trig.full, '→', prompt.text + ' ');
          }
        }
      }
    } else {
      // Para elementos tradicionales (input, textarea)
      el.setRangeText(prompt.text + ' ', trig.start, trig.end, 'end');
      console.log('[Prompt Manager +] Comando reemplazado en elemento tradicional:', trig.full, '→', prompt.text + ' ');
    }
    
    // Dispara eventos básicos para notificar frameworks
    el.dispatchEvent(new InputEvent('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    
    console.log('[Prompt Manager +] Texto reemplazado exitosamente');
  } catch (err) {
    console.warn('[Prompt Manager +] Error reemplazando texto:', err);
    // Fallback para frameworks modernos
    if (trig.isContentEditable) {
      tryClipboardInsertion(prompt.text + ' ', el, trig);
    } else {
      // Para elementos tradicionales que fallaron, intentar clipboard también
      tryClipboardInsertion(prompt.text + ' ', el, trig);
    }
  }
}

// Función de respaldo usando Clipboard API para frameworks modernos
async function tryClipboardInsertion(promptText, element, trigger) {
  console.log('[Prompt Manager +] Intentando inserción con Clipboard API...');

  try {
    // Verificar soporte de Clipboard API
    if (!navigator.clipboard || !navigator.clipboard.writeText) {
      throw new Error('Clipboard API no soportada');
    }

    // Copiar el texto del prompt al clipboard
    await navigator.clipboard.writeText(promptText);

    // Crear un evento de pegado simulado
    const pasteEvent = new ClipboardEvent('paste', {
      bubbles: true,
      cancelable: true
    });
    pasteEvent.clipboardData = new DataTransfer();
    pasteEvent.clipboardData.setData('text/plain', promptText);

    // Disparar el evento de pegado
    element.dispatchEvent(pasteEvent);

    // También disparar input event después
    setTimeout(() => {
      element.dispatchEvent(new InputEvent('input', {
        bubbles: true,
        inputType: 'insertFromPaste'
      }));
      console.log('[Prompt Manager +] Clipboard paste event simulated successfully');
    }, 10);

  } catch (clipboardErr) {
    console.warn('[Prompt Manager +] Clipboard API falló:', clipboardErr);
    
    // Último fallback: manipulación directa con eventos forzados
    tryDirectInsertionFallback(promptText, element, trigger);
  }
}

// Función de último recurso para inserción directa en frameworks reactivos
async function tryDirectInsertionFallback(promptText, element, trigger) {
  console.log('[Prompt Manager +] Intentando inserción directa como último respaldo...');

  try {
    // Para elementos tradicionales
    if (!trigger.isContentEditable) {
      const originalValue = element.value || '';
      const newValue = originalValue.slice(0, trigger.start) + promptText + originalValue.slice(trigger.end);
      
      // Asignar directamente
      element.value = newValue;
      
      // Forzar eventos múltiples
      const events = [
        new InputEvent('input', { bubbles: true, inputType: 'insertText' }),
        new Event('change', { bubbles: true }),
        new Event('input', { bubbles: true }),
        new Event('keyup', { bubbles: true })
      ];

      events.forEach(event => setTimeout(() => element.dispatchEvent(event), 50));

      // Actualizar cursor
      setTimeout(() => {
        element.setSelectionRange(trigger.start + promptText.length, trigger.start + promptText.length);
        element.focus();
      }, 100);

    } else {
      // Para elementos contenteditable
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);

        // Intentar eliminar el comando anterior
        const fullText = element.textContent || element.innerText || '';
        const commandIndex = fullText.indexOf(trigger.full);
        
        if (commandIndex !== -1) {
          const textBefore = fullText.substring(0, commandIndex);
          const textAfter = fullText.substring(commandIndex + trigger.full.length);
          
          // Reemplazar contenido completo
          element.textContent = textBefore + promptText + textAfter;
        } else {
          // Si no encuentra comando, insertar al final
          range.insertNode(document.createTextNode(promptText));
        }

        // Notificar cambios
        setTimeout(() => {
          const events = [
            new InputEvent('input', { bubbles: true, inputType: 'insertText' }),
            new Event('change', { bubbles: true }),
            new Event('compositionend', { bubbles: true }),
            new CustomEvent('input', { bubbles: true, detail: { inputType: 'insertText' } })
          ];

          events.forEach((event, index) => {
            setTimeout(() => element.dispatchEvent(event), index * 20);
          });

          // Restaurar foco y cursor
          setTimeout(() => {
            element.focus();
            const newRange = document.createRange();
            const textNodes = [];
            const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
            let node;
            while (node = walker.nextNode()) {
              textNodes.push(node);
            }
            if (textNodes.length > 0) {
              const targetNode = textNodes[textNodes.length - 1];
              newRange.setStart(targetNode, targetNode.textContent.length);
              newRange.collapse(true);
              selection.removeAllRanges();
              selection.addRange(newRange);
            }
          }, 200);
        }, 100);
      }
    }

    console.log('[Prompt Manager +] Inserción directa ejecutada como último respaldo');

  } catch (directErr) {
    console.warn('[Prompt Manager +] Todas las inserciones fallaron:', directErr);
  }
}

// Añadir el event listener de forma simple y directa
document.addEventListener('keydown', onKeyDown, true);
console.log('[Prompt Manager +] Event listener añadido');

// También probar con un listener más simple para debug
document.addEventListener('keydown', (e) => {
  if (e.key === ' ' || e.key === 'Enter' || e.key === 'Tab') {
    console.log('[Prompt Manager +] Tecla detectada:', e.key, 'en elemento:', e.target.tagName);
  }
}, true);

// Observador de mutaciones para elementos dinámicos en frameworks modernos
let mutationObserver = null;

function initMutationObserver() {
  if (mutationObserver) return;

  mutationObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE && (
            node.querySelector('[contenteditable]') ||
            node.querySelector('[role="textbox"]') ||
            node.querySelector('[role="combobox"]') ||
            node.querySelector('[data-testid*="textbox"]') ||
            node.querySelector('[data-testid*="input"]')
          )) {
            console.log('[Prompt Manager +] Elemento dinámico detectado, añadiendo listener');
            attachListenersToDynamicElement(node);
          }
        });
      }
    });
  });

  mutationObserver.observe(document.body, {
    childList: true,
    subtree: true
  });

  console.log('[Prompt Manager +] MutationObserver iniciado');
}

function attachListenersToDynamicElement(element) {
  // Asegurar que elementos dinámicos tienen nuestros listeners
  if (element.nodeType === Node.ELEMENT_NODE) {
    const editableElements = element.querySelectorAll('[contenteditable], [role="textbox"], [role="combobox"]');
    editableElements.forEach(el => {
      // Forzar focus event para asegurar que nuestros listeners se adjunten
      el.addEventListener('focus', () => {
        console.log('[Prompt Manager +] Elemento dinámico enfocado, verificando triggers');
        // Llamar a onKeyDown cuando se enfoque
        document.addEventListener('keydown', onKeyDown, true);
      }, true);
    });
  }
}

// Iniciar observador de mutaciones cuando el DOM esté listo
const waitForDomReady = setInterval(() => {
  if (document.readyState === 'complete') {
    clearInterval(waitForDomReady);
    initMutationObserver();
    console.log('[Prompt Manager +] DOM listo, observadores iniciados');
  }
}, 100);
