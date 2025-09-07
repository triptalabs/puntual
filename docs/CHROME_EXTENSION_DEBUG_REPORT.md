# Chrome Extension "Prompt Manager +" - Reporte de Debug

## 📋 **RESUMEN DEL PROYECTO**

**Chrome Extension "Prompt Manager +"** que permite insertar texto usando comandos `++codigo` + espacio en campos de entrada de texto.

## ✅ **ESTADO ACTUAL**

### **FUNCIONA CORRECTAMENTE:**
- ✅ Google.com (campos de búsqueda)
- ✅ ChatGPT.com (campos de chat)
- ✅ Formularios HTML básicos
- ✅ Elementos `<input type="text">` y `<textarea>` tradicionales

### **NO FUNCIONA:**
- ❌ Qwen.ai (chat.qwen.ai)
- ❌ DeepSeek.com
- ❌ Otros sitios que usan frameworks modernos (Svelte, React, Vue)

## 🔍 **PROBLEMA ESPECÍFICO**

### **Síntomas:**
- La extensión **detecta correctamente** el elemento editable
- El trigger `++codigo` **se encuentra correctamente**
- El prompt **se localiza en el cache**
- El reemplazo **se ejecuta sin errores**
- **PERO** el texto no aparece visualmente en el campo

### **Logs de Ejemplo (Qwen.ai):**
```
[Prompt Manager +] Elemento activo: TEXTAREA textarea
[Prompt Manager +] Elemento editable: TEXTAREA tradicional
[Prompt Manager +] Trigger encontrado: {code: 'hola', start: 0, end: 6, full: '++hola'}
[Prompt Manager +] Prompt encontrado: {text: 'Hola, ¿cómo estás?'}
[Prompt Manager +] Texto reemplazado exitosamente
```

## 🏗️ **ARQUITECTURA TÉCNICA**

### **Archivos Principales:**
- `content.js` - Script inyectado que maneja detección y reemplazo
- `popup.js` - Interfaz de usuario de la extensión
- `popup.html` - Estructura HTML del popup
- `popup.css` - Estilos del popup
- `background.js` - Service worker para inyección de scripts
- `manifest.json` - Configuración y permisos

### **Configuración del Manifest:**
```json
{
  "permissions": ["storage", "activeTab", "scripting"],
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content.js"]
  }]
}
```

### **Inyección de Scripts:**
- **Programática**: `chrome.scripting.executeScript` en `background.js`
- **Eventos**: `chrome.tabs.onUpdated`, `chrome.tabs.onActivated`, `chrome.tabs.onCreated`
- **Frames**: `allFrames: true` para capturar iframes

## 🔧 **IMPLEMENTACIÓN ACTUAL**

### **Detección de Elementos Editables:**
```javascript
function isEditable(el) {
  // 1. Elementos tradicionales HTML
  if (el.tagName === 'TEXTAREA') return true;
  if (el.tagName === 'INPUT' && ['text','search','email','url','tel','number','password'].includes(el.type)) return true;
  
  // 2. Elementos contentEditable
  if (el.hasAttribute('contenteditable')) return true;
  
  // 3. Elementos con roles de accesibilidad
  const role = el.getAttribute('role');
  if (['textbox', 'combobox', 'searchbox', 'search'].includes(role)) return true;
  
  // 4. Detección genérica: si está en foco y no es claramente no-editable
  if (document.activeElement === el) {
    const nonEditableElements = ['BUTTON', 'IMG', 'VIDEO', 'AUDIO', 'CANVAS', 'SVG', 'IFRAME', 'SCRIPT', 'STYLE', 'LINK', 'META', 'TITLE', 'HEAD', 'BR', 'HR'];
    if (!nonEditableElements.includes(el.tagName)) return true;
  }
  
  // 5. Elementos que aceptan focus
  if (el.tabIndex >= 0) return true;
  
  // 6. Elementos con eventos de teclado
  if (el.onkeydown || el.onkeypress || el.onkeyup) return true;
  
  return false;
}
```

### **Detección de Triggers:**
```javascript
// Regex para detectar ++codigo
const m = before.match(/\+\+([a-z0-9_-]{2,32})(?:\s|$)/i);
```

### **Reemplazo de Texto:**
```javascript
// Para elementos tradicionales
el.setRangeText(prompt.text + ' ', trig.start, trig.end, 'end');

// Para elementos contentEditable
const selection = window.getSelection();
const range = selection.getRangeAt(0);
range.deleteContents();
range.insertNode(document.createTextNode(prompt.text + ' '));
```

## 🚫 **LO QUE SE HA INTENTADO (SIN ÉXITO)**

### **1. Eventos Múltiples:**
- `InputEvent('input')`
- `Event('change')`
- `Event('keyup')`
- `Event('keydown')`
- `Event('paste')`
- `Event('compositionend')`
- `CustomEvent('prompt-inserted')`

### **2. Manipulación del DOM:**
- `el.value = el.value` (forzar actualización)
- `el.focus()`, `el.blur()`, `el.focus()`
- `setTimeout()` para delays

### **3. Simulación de Escritura:**
- Escritura carácter por carácter con delays
- Eventos individuales por cada carácter
- Limpieza y reescritura completa del campo

### **4. Detección Ultra-Agresiva:**
- Detección por clases CSS
- Detección por IDs
- Detección por data-testid
- Búsqueda en elementos padre

## 🎯 **ANÁLISIS DE CAUSAS PROBABLES**

### **1. FRAMEWORKS MODERNOS (CAUSA MÁS PROBABLE)**

#### **Svelte (Qwen.ai):**
- **Compilación en tiempo de compilación**: Svelte compila componentes a JavaScript vanilla optimizado
- **Sistema reactivo**: Usa un sistema de reactividad que intercepta cambios en el DOM
- **Event delegation**: Puede estar interceptando eventos antes de que lleguen al elemento
- **Virtual DOM**: Aunque Svelte no usa Virtual DOM como React, tiene su propio sistema de actualización

#### **React/Vue (otros sitios):**
- **Virtual DOM**: Intercepta cambios y los procesa a través de su sistema virtual
- **Synthetic Events**: React envuelve eventos nativos en su propio sistema
- **State Management**: El estado del input puede estar controlado por el framework

### **2. INTERCEPTACIÓN DE EVENTOS**

#### **Event Delegation:**
```javascript
// El framework puede estar interceptando así:
document.addEventListener('input', (e) => {
  if (e.target.matches('.chat-input')) {
    // Procesar el evento antes de que llegue al elemento
    e.preventDefault();
    // Actualizar estado interno del framework
  }
}, true); // capture phase
```

#### **Event Bubbling Control:**
- Los frameworks pueden estar usando `stopPropagation()` o `stopImmediatePropagation()`
- Pueden estar procesando eventos en la fase de captura (`true` en addEventListener)

### **3. CONTROL DE ESTADO**

#### **Controlled Components:**
```javascript
// El framework puede estar controlando el valor así:
const [inputValue, setInputValue] = useState('');

<input 
  value={inputValue} 
  onChange={(e) => setInputValue(e.target.value)}
/>
```

#### **Two-Way Data Binding:**
- El valor del input está sincronizado con el estado del framework
- Cambios programáticos no actualizan el estado interno

### **4. SECURITY POLICIES**

#### **Content Security Policy (CSP):**
- Aunque no es el caso aquí, algunos sitios bloquean modificaciones programáticas

#### **Input Sanitization:**
- El framework puede estar sanitizando o validando el input antes de mostrarlo

### **5. TIMING ISSUES**

#### **Async State Updates:**
- El framework puede estar procesando cambios de forma asíncrona
- Los eventos pueden estar siendo procesados en el siguiente tick del event loop

#### **Debouncing/Throttling:**
- El framework puede estar debouncing o throttling los eventos de input

## 🔬 **EVIDENCIA TÉCNICA**

### **Elemento de Qwen.ai:**
```html
<textarea 
  id="chat-input" 
  class="text-area-box scrollbar-hidden placeholder:!text-[#C8CAD9] dark:placeholder:!text-[#686B86] chat-input-element !ml-[-2px] !rounded-none bg-transparent !px-0 !pl-[2px] pt-[0.375rem] chat-input-dark svelte-l6994v" 
  style="text-indent: 0px; height: 32px;" 
  placeholder="¿Cómo puedo ayudarte hoy?" 
  rows="1" 
  data-spm-anchor-id="a2ty_o01.29997169.0.i0.3d4d5171Si2hHs" 
  data-gtm-form-interact-field-id="0">
</textarea>
```

### **Observaciones:**
- **Clase `svelte-l6994v`**: Confirma que usa Svelte
- **ID `chat-input`**: Elemento específico del framework
- **Data attributes**: Múltiples atributos de tracking/analytics
- **Estilos inline**: `text-indent: 0px; height: 32px;`

## 🎯 **POSIBLES SOLUCIONES A EXPLORAR**

### **1. INTERCEPTAR EL FRAMEWORK DIRECTAMENTE**
```javascript
// Interceptar las funciones del framework
const originalSetValue = HTMLTextAreaElement.prototype.setRangeText;
HTMLTextAreaElement.prototype.setRangeText = function(...args) {
  // Llamar función original
  const result = originalSetValue.apply(this, args);
  // Forzar actualización del framework
  this.dispatchEvent(new Event('input', { bubbles: true }));
  return result;
};
```

### **2. MUTATION OBSERVER**
```javascript
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.type === 'attributes' && mutation.attributeName === 'value') {
      // El framework cambió el valor, interceptar
    }
  });
});
```

### **3. PORTAPAPELES (CLIPBOARD API)**
```javascript
// Copiar al portapapeles y simular Ctrl+V
navigator.clipboard.writeText(prompt.text).then(() => {
  el.dispatchEvent(new KeyboardEvent('keydown', { key: 'v', ctrlKey: true }));
});
```

### **4. INYECCIÓN EN CONTEXTO DEL FRAMEWORK**
```javascript
// Inyectar código que se ejecute en el contexto de la página
const script = document.createElement('script');
script.textContent = `
  // Código que se ejecuta en el contexto de la página
  // Acceso directo al estado del framework
`;
document.head.appendChild(script);
```

### **5. INTERCEPTAR FUNCIONES NATIVAS**
```javascript
// Interceptar addEventListener para capturar eventos del framework
const originalAddEventListener = EventTarget.prototype.addEventListener;
EventTarget.prototype.addEventListener = function(type, listener, options) {
  if (type === 'input' && this.tagName === 'TEXTAREA') {
    // Interceptar eventos de input en textareas
  }
  return originalAddEventListener.call(this, type, listener, options);
};
```

## 📊 **MÉTRICAS DE DEBUGGING**

### **Logs Disponibles:**
- ✅ Detección de elementos editables
- ✅ Detección de triggers
- ✅ Búsqueda en cache de prompts
- ✅ Ejecución de reemplazo
- ✅ Disparo de eventos
- ✅ Información completa del elemento (tagName, className, ID, etc.)

### **Información de Debugging:**
- ✅ URL actual
- ✅ Título del documento
- ✅ Estado del documento (readyState)
- ✅ Estructura HTML completa del elemento
- ✅ Elementos padre (hasta 3 niveles)

## 🎯 **PRÓXIMOS PASOS RECOMENDADOS**

1. **Analizar el código fuente** de Qwen.ai para entender cómo maneja los inputs
2. **Interceptar las funciones del framework** antes de que procesen los eventos
3. **Usar MutationObserver** para detectar cambios en el DOM
4. **Implementar solución con portapapeles** como fallback
5. **Inyectar código en el contexto de la página** para acceso directo al framework

## 📝 **NOTAS ADICIONALES**

- **Manifest V3**: La extensión usa la versión más reciente del manifest
- **Permisos**: Tiene todos los permisos necesarios (`activeTab`, `scripting`, `storage`)
- **Compatibilidad**: Funciona en sitios tradicionales sin problemas
- **Performance**: No hay problemas de rendimiento, solo de compatibilidad con frameworks

---

**Este reporte contiene toda la información técnica necesaria para diagnosticar y resolver el problema de compatibilidad con frameworks modernos.**
