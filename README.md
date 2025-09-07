# +puntual

Gestor mínimo de prompts para Chrome: copia desde el popup e inserta con `++codigo` en inputs/textarea.

## 🚀 Características

- **Gestión de prompts**: Crear, editar, eliminar y organizar prompts
- **Búsqueda inteligente**: Búsqueda no sensible a mayúsculas ni tildes
- **Navegación con teclado**: Control completo desde el teclado
- **Importación/Exportación**: Importar y exportar prompts en formato JSON
- **Favoritos**: Marcar prompts como favoritos
- **Inserción automática**: Usar `++codigo` en cualquier input/textarea

## ⌨️ Navegación con Teclado

### Controles Principales

| Tecla | Función |
|-------|---------|
| **Flecha Abajo** | Navegar al siguiente prompt |
| **Flecha Arriba** | Navegar al prompt anterior |
| **Enter** | Copiar prompt seleccionado y cerrar extensión |
| **Ctrl + Supr** | Atajo global para abrir la extensión |

### Flujo de Trabajo

1. **Abrir extensión**: Presiona `Ctrl + Supr` o haz clic en el icono
2. **Buscar**: Escribe para filtrar prompts (las flechas siguen funcionando)
3. **Navegar**: Usa las flechas para seleccionar un prompt (se resalta en azul)
4. **Copiar**: Presiona `Enter` para copiar y cerrar automáticamente
5. **Pegar**: El texto está listo en el portapapeles

### Características de Navegación

- **Navegación circular**: Al llegar al final, vuelve al inicio
- **Scroll automático**: Mantiene el prompt seleccionado visible
- **Búsqueda + navegación**: Puedes buscar y navegar simultáneamente
- **Feedback visual**: El prompt seleccionado se resalta en azul
- **Cierre automático**: Enter copia y cierra la extensión

## 🔍 Búsqueda Inteligente

- **No sensible a mayúsculas**: "resumen" encuentra "Resumen"
- **No sensible a tildes**: "articulo" encuentra "Artículo"
- **Búsqueda en tiempo real**: Se filtra mientras escribes
- **Múltiples campos**: Busca en título, código y contenido

## 📁 Gestión de Prompts

### Crear Prompt
1. Haz clic en el botón "+" o presiona el atajo
2. Completa título, código y contenido
3. Marca como favorito si deseas
4. Guarda

### Editar Prompt
1. Haz clic en el botón de editar (lápiz)
2. Modifica los campos necesarios
3. Guarda los cambios

### Importar/Exportar
- **Importar**: Arrastra un archivo JSON o haz clic para seleccionar
- **Exportar**: Haz clic en el botón de descarga
- **Detección de duplicados**: Se detectan y omiten automáticamente

## 🎯 Inserción Automática

En cualquier página web, escribe `++codigo` seguido de un espacio en un input o textarea:

```
++SUM-ART-01 [espacio]
```

Se reemplazará automáticamente con el contenido del prompt.

## 🛠️ Instalación

1. Descarga o clona este repositorio
2. Abre Chrome y ve a `chrome://extensions/`
3. Activa "Modo de desarrollador"
4. Haz clic en "Cargar extensión sin empaquetar"
5. Selecciona la carpeta del proyecto

## 📋 Estructura del Proyecto

```
promptGo/
├── manifest.json          # Configuración de la extensión
├── popup.html            # Interfaz del popup
├── popup.css             # Estilos del popup
├── popup.js              # Lógica del popup y navegación
├── content.js            # Script para inserción automática
├── background.js         # Script de fondo
├── icon-*.png           # Iconos de la extensión
└── README.md            # Esta documentación
```

## 🔧 Desarrollo

### Tecnologías Utilizadas
- **Manifest V3**: Última versión de extensiones de Chrome
- **Vanilla JavaScript**: Sin frameworks, código puro
- **CSS Grid/Flexbox**: Layout moderno y responsive
- **Chrome APIs**: Storage, Clipboard, Scripting

### Funciones Principales

#### Navegación con Teclado
```javascript
// Configuración de navegación
function setupKeyboardNavigation() {
  window.addEventListener('keydown', (e) => {
    // Enter para copiar y cerrar
    if (e.key === 'Enter') {
      copyAndClose();
    }
    // Flechas para navegar
    if (e.key === 'ArrowDown') {
      navigatePrompts(1);
    }
    // ...
  });
}
```

#### Búsqueda Inteligente
```javascript
// Normalización de texto
function normalizeText(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // Quitar tildes
}
```

## 📝 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo LICENSE para más detalles.

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature
3. Commit tus cambios
4. Push a la rama
5. Abre un Pull Request

## 📞 Soporte

Si encuentras algún problema o tienes sugerencias:

1. Abre un issue en GitHub
2. Describe el problema detalladamente
3. Incluye pasos para reproducir
4. Especifica tu versión de Chrome

---

**+puntual** - Gestión eficiente de prompts con navegación por teclado