// popup.js
let allPrompts = [];
let filteredPrompts = [];
let showFavoritesOnly = false;
let importData = null;

function el(tag, attrs={}, children=[]) {
  const e = document.createElement(tag);
  for (const [k,v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v;
    else if (k === 'text') e.textContent = v;
    else e.setAttribute(k, v);
  }
  for (const c of children) e.appendChild(c);
  return e;
}

async function load() {
  const { prompts=[] } = await chrome.storage.local.get('prompts');
  
  // Si no hay prompts, crear los de ejemplo de la imagen + algunos extras para probar scroll
  if (!prompts.length) {
    const examplePrompts = [
      { id: 'p-1', code: 'SUM-ART-01', title: 'Resumen de Artículo', text: 'Crea un resumen conciso del siguiente artículo...', folder: 'root', favorite: false },
      { id: 'p-2', code: 'GEN-TWT-05', title: 'Generador de Tweets', text: 'Genera un tweet atractivo sobre...', folder: 'root', favorite: true },
      { id: 'p-3', code: 'COR-EST-03', title: 'Corrector de Estilo', text: 'Corrige el estilo y gramática del siguiente texto...', folder: 'root', favorite: false },
      { id: 'p-4', code: 'TRA-TEX-01', title: 'Traductor de Texto', text: 'Traduce el siguiente texto al inglés...', folder: 'root', favorite: false },
      { id: 'p-5', code: 'GEN-EMA-02', title: 'Generador de Email', text: 'Escribe un email profesional sobre...', folder: 'root', favorite: true },
      { id: 'p-6', code: 'ANA-DAT-01', title: 'Analizador de Datos', text: 'Analiza los siguientes datos y proporciona insights...', folder: 'root', favorite: false },
      { id: 'p-7', code: 'CRE-IDE-03', title: 'Generador de Ideas', text: 'Genera 10 ideas creativas para...', folder: 'root', favorite: false },
      { id: 'p-8', code: 'REV-COD-01', title: 'Revisor de Código', text: 'Revisa el siguiente código y sugiere mejoras...', folder: 'root', favorite: true },
      { id: 'p-9', code: 'DOC-API-02', title: 'Documentador de API', text: 'Crea documentación para la siguiente API...', folder: 'root', favorite: false },
      { id: 'p-10', code: 'PRE-PRE-01', title: 'Preparador de Presentación', text: 'Prepara una presentación sobre...', folder: 'root', favorite: false }
    ];
    allPrompts = examplePrompts;
    await chrome.storage.local.set({ prompts: examplePrompts });
  } else {
    allPrompts = prompts;
  }
  
  filteredPrompts = allPrompts;
  renderPrompts();
  
  // Configurar navegación con teclado
  setupKeyboardNavigation();
}

// Función para configurar navegación con teclado
function setupKeyboardNavigation() {
  console.log('Configurando navegación con teclado...');
  
  // Event listener global
  window.addEventListener('keydown', (e) => {
    console.log('Tecla presionada:', e.key, 'Ctrl:', e.ctrlKey);
    
    // Enter para copiar y cerrar
    if (e.key === 'Enter') {
      console.log('Enter presionado');
      e.preventDefault();
      e.stopPropagation();
      
      // Buscar el prompt seleccionado directamente
      const selectedCard = document.querySelector('.prompt-card.selected');
      console.log('Card seleccionada:', selectedCard);
      
      if (selectedCard) {
        const promptId = selectedCard.dataset.promptId;
        console.log('Prompt ID:', promptId);
        console.log('All prompts:', allPrompts);
        
        const prompt = allPrompts.find(p => p.id === promptId);
        console.log('Prompt encontrado:', prompt);
        
        if (prompt) {
          console.log('Copiando texto:', prompt.text);
          
          // Copiar al portapapeles
          navigator.clipboard.writeText(prompt.text).then(() => {
            console.log('Texto copiado exitosamente');
            // Feedback visual
            selectedCard.classList.add('copy-success');
            // Cerrar inmediatamente
            window.close();
          }).catch(err => {
            console.error('Error copiando:', err);
            // Cerrar incluso si hay error
            window.close();
          });
        } else {
          console.log('No se encontró el prompt con ID:', promptId);
        }
      } else {
        console.log('No hay prompt seleccionado');
      }
      return;
    }
    
    // Navegación con flechas
    if (e.key === 'ArrowDown') {
      console.log('Flecha abajo presionada');
      e.preventDefault();
      e.stopPropagation();
      navigatePrompts(1);
    } else if (e.key === 'ArrowUp') {
      console.log('Flecha arriba presionada');
      e.preventDefault();
      e.stopPropagation();
      navigatePrompts(-1);
    }
  });
}

function renderPrompts() {
  const list = document.getElementById('list');
  list.textContent = '';
  
  if (!filteredPrompts.length) {
    const emptyState = el('div', { 
      class: 'flex items-center justify-center py-8 text-gray-500',
      text: showFavoritesOnly ? 'No hay favoritos' : 'No hay prompts'
    });
    list.appendChild(emptyState);
    return;
  }
  
  for (const p of filteredPrompts) {
    const card = el('div', { class: 'prompt-card', 'data-prompt-id': p.id });
    
    const content = el('div', { class: 'prompt-content' });
    content.appendChild(el('p', { 
      class: 'prompt-title',
      text: p.title || p.code 
    }));
    content.appendChild(el('p', { 
      class: 'prompt-code',
      text: `Código: ${p.code}` 
    }));
    
    const actions = el('div', { class: 'prompt-actions' });
    
    // Botón de favorito
    const favoriteBtn = el('button', { 
      class: `action-btn favorite-btn ${p.favorite ? 'active' : ''}`,
      'aria-label': p.favorite ? 'Quitar de favoritos' : 'Añadir a favoritos'
    });
    
    const starIcon = el('span', { class: 'material-symbols-outlined' });
    starIcon.textContent = 'star';
    if (p.favorite) {
      starIcon.classList.add('filled');
    }
    favoriteBtn.appendChild(starIcon);
    
    favoriteBtn.addEventListener('click', async () => {
      p.favorite = !p.favorite;
      await savePrompts();
      renderPrompts();
    });
    
    // Botón de editar
    const editBtn = el('button', { 
      class: 'action-btn edit-btn',
      'aria-label': 'Editar prompt'
    });
    
    const editIcon = el('span', { class: 'material-symbols-outlined', text: 'edit' });
    editBtn.appendChild(editIcon);
    
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // Evitar que se active el click de la card
      editPrompt(p);
    });
    
    actions.appendChild(favoriteBtn);
    actions.appendChild(editBtn);
    
    // Agregar funcionalidad de copia al hacer click en la card
    card.addEventListener('click', async () => {
      try { 
        await navigator.clipboard.writeText(p.text || ''); 
        // Feedback visual temporal
        card.classList.add('copy-success');
        setTimeout(() => {
          card.classList.remove('copy-success');
        }, 1000);
      } catch (e) { 
        console.error('Error al copiar:', e); 
      }
    });
    
    card.appendChild(content);
    card.appendChild(actions);
    list.appendChild(card);
  }
}

async function savePrompts() {
  await chrome.storage.local.set({ prompts: allPrompts });
}

// Función para editar un prompt existente
function editPrompt(prompt) {
  // Cambiar al formulario de edición
  showAddForm();
  
  // Cambiar el título del formulario
  document.querySelector('.form-title').textContent = 'Editar Prompt';
  
  // Llenar el formulario con los datos del prompt
  document.getElementById('prompt-title').value = prompt.title || '';
  document.getElementById('prompt-code').value = prompt.code || '';
  document.getElementById('prompt-text').value = prompt.text || '';
  
  // Cambiar el botón de guardar para indicar que es una edición
  const submitBtn = document.querySelector('#prompt-form button[type="submit"]');
  submitBtn.textContent = 'Actualizar';
  
  // Guardar referencia al prompt que se está editando
  document.getElementById('prompt-form').dataset.editingId = prompt.id;
  
  // Cambiar el botón cancelar para restaurar el formulario original
  const cancelBtn = document.getElementById('cancel-add');
  cancelBtn.textContent = 'Cancelar edición';
}

// Funciones para manejar el formulario de nuevo prompt
function showAddForm() {
  document.body.classList.add('form-active'); // Estirar al máximo
  document.getElementById('add-form').classList.remove('hidden');
  document.getElementById('list').classList.add('hidden');
  document.querySelector('.search-container').classList.add('hidden');
  
  // Cambiar el botón + a "lista"
  const addButton = document.getElementById('add-prompt');
  const addIcon = addButton.querySelector('.material-symbols-outlined');
  addIcon.textContent = 'list';
  addButton.title = 'Volver a la lista';
  
  // Ocultar el botón de favoritos
  document.getElementById('favorites-toggle').classList.add('hidden');
  
  document.getElementById('prompt-title').focus();
}

function hideAddForm() {
  document.body.classList.remove('form-active'); // Volver al tamaño normal
  document.getElementById('add-form').classList.add('hidden');
  document.getElementById('list').classList.remove('hidden');
  document.querySelector('.search-container').classList.remove('hidden');
  
  // Restaurar el botón + original
  const addButton = document.getElementById('add-prompt');
  const addIcon = addButton.querySelector('.material-symbols-outlined');
  addIcon.textContent = 'add';
  addButton.title = 'Añadir nuevo prompt';
  
  // Mostrar el botón de favoritos
  document.getElementById('favorites-toggle').classList.remove('hidden');
  
  // Restaurar el formulario a su estado original
  document.getElementById('prompt-form').reset();
  document.querySelector('.form-title').textContent = 'Nuevo Prompt';
  const submitBtn = document.querySelector('#prompt-form button[type="submit"]');
  submitBtn.textContent = 'Guardar';
  const cancelBtn = document.getElementById('cancel-add');
  cancelBtn.textContent = 'Cancelar';
  delete document.getElementById('prompt-form').dataset.editingId;
}

// Funciones para manejar la importación JSON
function showImportView() {
  document.body.classList.add('form-active'); // Estirar al máximo
  document.getElementById('import-view').classList.remove('hidden');
  document.getElementById('list').classList.add('hidden');
  document.querySelector('.search-container').classList.add('hidden');
  
  // Ocultar botones del header
  document.getElementById('favorites-toggle').classList.add('hidden');
  document.getElementById('export').classList.add('hidden');
  document.getElementById('add-prompt').classList.add('hidden');
  
  // Cambiar el botón de importar a "lista"
  const importButton = document.getElementById('import-json');
  const importIcon = importButton.querySelector('.material-symbols-outlined');
  importIcon.textContent = 'list';
  importButton.title = 'Volver a la lista';
}

function hideImportView() {
  document.body.classList.remove('form-active');
  document.getElementById('import-view').classList.add('hidden');
  document.getElementById('list').classList.remove('hidden');
  document.querySelector('.search-container').classList.remove('hidden');
  
  // Mostrar drop zone y título nuevamente
  document.getElementById('drop-zone').style.display = 'block';
  document.querySelector('.import-title').style.display = 'block';
  
  // Mostrar botones del header
  document.getElementById('favorites-toggle').classList.remove('hidden');
  document.getElementById('export').classList.remove('hidden');
  document.getElementById('add-prompt').classList.remove('hidden');
  
  // Restaurar el botón de importar original
  const importButton = document.getElementById('import-json');
  const importIcon = importButton.querySelector('.material-symbols-outlined');
  importIcon.textContent = 'file_upload';
  importButton.title = 'Importar prompts desde JSON';
  
  // Limpiar datos de importación
  importData = null;
  document.getElementById('import-preview').classList.add('hidden');
  document.getElementById('file-input').value = '';
}

function toggleImportView() {
  const importView = document.getElementById('import-view');
  if (importView.classList.contains('hidden')) {
    showImportView();
  } else {
    hideImportView();
  }
}

// Función para procesar archivo JSON
function processImportFile(file) {
  const reader = new FileReader();
  
  reader.onload = function(e) {
    try {
      const jsonData = JSON.parse(e.target.result);
      
      // Validar que sea un array de prompts
      if (!Array.isArray(jsonData)) {
        throw new Error('El archivo JSON debe contener un array de prompts');
      }
      
      // Validar estructura básica de los prompts
      const validPrompts = jsonData.filter(prompt => {
        return prompt && 
               typeof prompt.code === 'string' && 
               typeof prompt.title === 'string' && 
               typeof prompt.text === 'string';
      });
      
      if (validPrompts.length === 0) {
        throw new Error('No se encontraron prompts válidos en el archivo');
      }
      
      // Ocultar drop zone y título
      document.getElementById('drop-zone').style.display = 'none';
      document.querySelector('.import-title').style.display = 'none';
      
      // Detectar duplicados
      const duplicateAnalysis = analyzeDuplicates(validPrompts);
      importData = duplicateAnalysis.filteredPrompts;
      showImportPreview(duplicateAnalysis);
      
    } catch (error) {
      alert('Error al procesar el archivo: ' + error.message);
      console.error('Error de importación:', error);
    }
  };
  
  reader.readAsText(file);
}

// Función para analizar duplicados
function analyzeDuplicates(newPrompts) {
  const existingCodes = new Set(allPrompts.map(p => p.code.toLowerCase()));
  const duplicates = [];
  const unique = [];
  const internalDuplicates = [];
  const seenCodes = new Set();
  
  // Analizar cada prompt del archivo
  newPrompts.forEach(prompt => {
    const code = prompt.code.toLowerCase();
    
    // Verificar duplicados internos (dentro del archivo)
    if (seenCodes.has(code)) {
      internalDuplicates.push(prompt);
    } else {
      seenCodes.add(code);
      
      // Verificar duplicados con prompts existentes
      if (existingCodes.has(code)) {
        duplicates.push(prompt);
      } else {
        unique.push(prompt);
      }
    }
  });
  
  return {
    filteredPrompts: unique, // Solo prompts únicos
    duplicates: duplicates, // Duplicados con prompts existentes
    internalDuplicates: internalDuplicates, // Duplicados dentro del archivo
    total: newPrompts.length,
    unique: unique.length,
    duplicateCount: duplicates.length,
    internalDuplicateCount: internalDuplicates.length
  };
}

// Función para mostrar vista previa de importación
function showImportPreview(analysis) {
  const previewContent = document.getElementById('preview-content');
  previewContent.innerHTML = '';
  
  const summary = el('div', { class: 'import-summary' });
  
  // Construir mensaje principal
  let mainMessage = '';
  if (analysis.unique > 0) {
    mainMessage = `Se importarán ${analysis.unique} prompts únicos`;
  } else {
    mainMessage = `No hay prompts nuevos para importar`;
  }
  
         // Construir estadísticas
         let statsHTML = '';
         if (analysis.unique > 0) {
           statsHTML = `
             <div class="import-stats">
               <div class="stat-card">
                 <div class="stat-icon">
                   <span class="material-symbols-outlined">description</span>
                 </div>
                 <div class="stat-content">
                   <div class="stat-number">${analysis.unique}</div>
                 </div>
               </div>
               <div class="stat-card">
                 <div class="stat-icon">
                   <span class="material-symbols-outlined">star</span>
                 </div>
                 <div class="stat-content">
                   <div class="stat-number">${analysis.filteredPrompts.filter(p => p.favorite).length}</div>
                 </div>
               </div>
             </div>
           `;
         }
  
  // Mostrar advertencias de duplicados
  let warningsHTML = '';
  if (analysis.duplicateCount > 0 || analysis.internalDuplicateCount > 0) {
    warningsHTML = `
      <div class="import-warnings">
        ${analysis.duplicateCount > 0 ? `
          <div class="warning-item">
            <span class="material-symbols-outlined warning-icon">warning</span>
            <div class="warning-content">
              <div class="warning-title">${analysis.duplicateCount} prompts ya existen</div>
              <div class="warning-subtitle">Se omitirán automáticamente</div>
            </div>
          </div>
        ` : ''}
        ${analysis.internalDuplicateCount > 0 ? `
          <div class="warning-item">
            <span class="material-symbols-outlined warning-icon">refresh</span>
            <div class="warning-content">
              <div class="warning-title">${analysis.internalDuplicateCount} duplicados internos</div>
              <div class="warning-subtitle">Se omitirán automáticamente</div>
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }
  
  // Lista de prompts (solo los únicos)
  let listHTML = '';
  if (analysis.filteredPrompts.length > 0) {
    listHTML = `
      <div class="import-list">
        ${analysis.filteredPrompts.map(p => `
          <div class="import-item">
            <div class="import-item-header">
              <div class="import-item-title">
                <span class="material-symbols-outlined item-icon">text_snippet</span>
                <span class="item-title">${p.title || p.code}</span>
                ${p.favorite ? '<span class="material-symbols-outlined favorite-badge">star</span>' : ''}
              </div>
              <div class="import-item-code">
                <span class="code-label">Código:</span>
                <span class="code-value">${p.code}</span>
              </div>
            </div>
            <div class="import-item-text">
              "${p.text.substring(0, 80)}${p.text.length > 80 ? '...' : ''}"
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }
  
  summary.innerHTML = `
    <div class="import-summary-header">
      <span class="material-symbols-outlined summary-icon">${analysis.unique > 0 ? 'check_circle' : 'info'}</span>
      <span class="summary-text">${mainMessage}</span>
    </div>
    ${statsHTML}
    ${warningsHTML}
    ${listHTML}
  `;
  
  previewContent.appendChild(summary);
  document.getElementById('import-preview').classList.remove('hidden');
}

// Función para confirmar importación
async function confirmImport() {
  if (!importData || importData.length === 0) {
    alert('No hay prompts únicos para importar.');
    return;
  }
  
  try {
    // Generar IDs únicos para los nuevos prompts
    const newPrompts = importData.map(prompt => ({
      ...prompt,
      id: generateId(),
      folder: prompt.folder || 'root',
      favorite: prompt.favorite || false
    }));
    
    // Agregar a la lista existente
    allPrompts.push(...newPrompts);
    await savePrompts();
    
    alert(`¡Importación exitosa! Se agregaron ${newPrompts.length} prompts únicos.`);
    hideImportView();
    filterPrompts(); // Recargar la lista
    
  } catch (error) {
    console.error('Error en importación:', error);
    alert('Error al importar los prompts. Inténtalo de nuevo.');
  }
}

// Función para manejar el toggle del botón add/list
function toggleAddForm() {
  const addForm = document.getElementById('add-form');
  if (addForm.classList.contains('hidden')) {
    showAddForm();
  } else {
    hideAddForm();
  }
}

function generateId() {
  return 'p-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

function validateCode(code) {
  const regex = /^[a-z0-9][a-z0-9_-]{1,31}$/i;
  return regex.test(code);
}

function isCodeUnique(code) {
  return !allPrompts.some(p => p.code.toLowerCase() === code.toLowerCase());
}

async function addNewPrompt(event) {
  event.preventDefault();
  
  const title = document.getElementById('prompt-title').value.trim();
  const code = document.getElementById('prompt-code').value.trim().toLowerCase();
  const text = document.getElementById('prompt-text').value.trim();
  const editingId = document.getElementById('prompt-form').dataset.editingId;
  
  // Validaciones
  if (!title || !code || !text) {
    alert('Por favor completa todos los campos obligatorios.');
    return;
  }
  
  if (!validateCode(code)) {
    alert('El código debe tener entre 2-32 caracteres y solo puede contener letras, números, _ y -.');
    return;
  }
  
  // Validar código único solo si no estamos editando o si el código cambió
  if (!editingId || allPrompts.find(p => p.id === editingId)?.code !== code) {
    if (!isCodeUnique(code)) {
      alert('Ya existe un prompt con ese código. Por favor usa otro.');
      return;
    }
  }
  
  try {
    if (editingId) {
      // Modo edición: actualizar prompt existente
      const promptIndex = allPrompts.findIndex(p => p.id === editingId);
      if (promptIndex !== -1) {
        allPrompts[promptIndex] = {
          ...allPrompts[promptIndex],
          code: code,
          title: title,
          text: text
        };
      }
    } else {
      // Modo creación: agregar nuevo prompt
      const newPrompt = {
        id: generateId(),
        code: code,
        title: title,
        text: text,
        folder: 'root',
        favorite: false
      };
      allPrompts.push(newPrompt);
    }
    
    await savePrompts();
    hideAddForm();
    filterPrompts(); // Recargar la lista filtrada
  } catch (error) {
    console.error('Error guardando prompt:', error);
    alert('Error al guardar el prompt. Inténtalo de nuevo.');
  }
}

// Funciones de búsqueda y filtrado
function normalizeText(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // Quitar tildes y acentos
}

function filterPrompts() {
  const searchTerm = normalizeText(document.getElementById('search-input').value);
  
  filteredPrompts = allPrompts.filter(prompt => {
    const matchesSearch = !searchTerm || 
      normalizeText(prompt.title).includes(searchTerm) ||
      normalizeText(prompt.code).includes(searchTerm) ||
      normalizeText(prompt.text).includes(searchTerm);
    
    const matchesFavorites = !showFavoritesOnly || prompt.favorite;
    
    return matchesSearch && matchesFavorites;
  });
  
  // Resetear selección al filtrar
  selectedPromptIndex = -1;
  
  renderPrompts();
}

function toggleFavorites() {
  showFavoritesOnly = !showFavoritesOnly;
  const favoritesBtn = document.getElementById('favorites-toggle');
  const starIcon = favoritesBtn.querySelector('span');
  
  if (showFavoritesOnly) {
    favoritesBtn.classList.add('active');
    starIcon.classList.add('filled');
  } else {
    favoritesBtn.classList.remove('active');
    starIcon.classList.remove('filled');
  }
  
  filterPrompts();
}

// Event listeners
document.getElementById('export').addEventListener('click', async () => {
  const blob = new Blob([JSON.stringify(allPrompts, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'prompts.json';
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
});

document.getElementById('add-prompt').addEventListener('click', toggleAddForm);
document.getElementById('cancel-add').addEventListener('click', hideAddForm);
document.getElementById('prompt-form').addEventListener('submit', addNewPrompt);
document.getElementById('favorites-toggle').addEventListener('click', toggleFavorites);
document.getElementById('search-input').addEventListener('input', filterPrompts);

// Event listeners para importación
document.getElementById('import-json').addEventListener('click', toggleImportView);
document.getElementById('back-to-list').addEventListener('click', hideImportView);
document.getElementById('cancel-import').addEventListener('click', () => {
  document.getElementById('import-preview').classList.add('hidden');
  document.getElementById('drop-zone').style.display = 'block';
  document.querySelector('.import-title').style.display = 'block';
  importData = null;
});
document.getElementById('confirm-import').addEventListener('click', confirmImport);

// Drag and drop para importación
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');

// Click en drop zone para abrir selector de archivos
dropZone.addEventListener('click', () => {
  fileInput.click();
});

// Selección de archivo
fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file && file.type === 'application/json') {
    processImportFile(file);
  } else {
    alert('Por favor selecciona un archivo JSON válido.');
  }
});

// Drag and drop
dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', (e) => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
});

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  
  const files = e.dataTransfer.files;
  if (files.length > 0) {
    const file = files[0];
    if (file.type === 'application/json') {
      processImportFile(file);
    } else {
      alert('Por favor arrastra un archivo JSON válido.');
    }
  }
});

// Auto-generar código basado en el título
document.getElementById('prompt-title').addEventListener('input', (e) => {
  const title = e.target.value.trim();
  const codeField = document.getElementById('prompt-code');
  if (!codeField.value) {
    const code = title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 32);
    codeField.value = code;
  }
});

// Variables para navegación con teclado
let selectedPromptIndex = -1;
let visiblePrompts = [];

// Auto-focus en la barra de búsqueda al cargar
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.focus();
    }
  }, 100);
});


// Función para navegar por los prompts
function navigatePrompts(direction) {
  const promptCards = document.querySelectorAll('.prompt-card');
  visiblePrompts = Array.from(promptCards);
  
  console.log('Navegando, visiblePrompts:', visiblePrompts.length);
  
  if (visiblePrompts.length === 0) return;
  
  // Remover selección anterior
  if (selectedPromptIndex >= 0 && visiblePrompts[selectedPromptIndex]) {
    visiblePrompts[selectedPromptIndex].classList.remove('selected');
  }
  
  // Calcular nuevo índice
  selectedPromptIndex += direction;
  
  // Circular navigation
  if (selectedPromptIndex < 0) {
    selectedPromptIndex = visiblePrompts.length - 1;
  } else if (selectedPromptIndex >= visiblePrompts.length) {
    selectedPromptIndex = 0;
  }
  
  console.log('Nuevo selectedPromptIndex:', selectedPromptIndex);
  
  // Aplicar selección
  visiblePrompts[selectedPromptIndex].classList.add('selected');
  
  // Scroll para mantener visible
  visiblePrompts[selectedPromptIndex].scrollIntoView({
    behavior: 'smooth',
    block: 'nearest'
  });
}

// Función para copiar prompt
function copyPrompt(promptElement) {
  const promptId = promptElement.dataset.promptId;
  const prompt = allPrompts.find(p => p.id === promptId);
  
  if (prompt) {
    navigator.clipboard.writeText(prompt.text).then(() => {
      // Feedback visual
      promptElement.classList.add('copy-success');
      setTimeout(() => {
        promptElement.classList.remove('copy-success');
      }, 1000);
    }).catch(err => {
      console.error('Error copiando al portapapeles:', err);
    });
  }
}


// Inicializar
load();
