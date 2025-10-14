# Contexto Progresivo (Progressive Contextual Navigation)

## Origen y Motivación

En sistemas de información empresariales es común encontrarse con usuarios que quieren **“todo en un solo lugar”**:  
- Inician desde un dashboard o calendario y quieren ver actividades, tareas relacionadas, responsables, métricas y más, **sin perder el hilo ni cambiar de pantalla**.  
- Esta necesidad puede parecer frustrante al principio, pero en realidad revela un patrón: los usuarios necesitan **explorar información relacionada manteniendo el contexto visual y mental**.

El concepto de **contexto progresivo** surge como una **forma de abordar esta necesidad** de manera estructurada, en lugar de implementar múltiples pantallas independientes que saturen al usuario.

---

## Definición

**Contexto progresivo** es un patrón de interacción y diseño de software donde la información se presenta de manera jerárquica y por capas, permitiendo que el usuario navegue desde un punto de partida hacia detalles cada vez más profundos sin perder el contexto inicial.  

Se logra mediante interacciones como: **edición inline, paneles laterales, modales, popovers, vistas expandibles**, o navegación tipo breadcrumb/drill-down.

---

## Cómo abordarlo

1. **Identificar el punto de partida principal**  
   - Puede ser un dashboard, calendario, tabla o lista de actividades.  
   - Debe contener lo **esencial** para iniciar la exploración.

2. **Diseñar capas de información progresivas**  
   - Resumen → detalles → subtareas → responsables → métricas → documentos.  
   - Cada capa se revela **solo cuando el usuario lo necesita**.

3. **Mantener la referencia visual y mental**  
   - Evitar saltos bruscos de pantalla.  
   - Permitir volver fácilmente al nivel anterior.

4. **Combinar técnicas de UI**  
   - Inline editing: editar datos directamente en la tabla o lista.  
   - Row expansion: mostrar subtareas o detalles en la misma fila.  
   - Panel lateral / flyout: vista completa sin perder la tabla de referencia.  
   - Modal ligero: edición rápida o información adicional.  
   - Popovers: información contextual rápida al pasar sobre un elemento.

5. **Apoyarse en navegación jerárquica opcional**  
   - Breadcrumbs o drill-down: indican en qué nivel está el usuario y permiten regresar.

---

## Estrategias

- **Progressive Disclosure**: mostrar primero lo esencial, revelar detalles bajo demanda.  
- **Drill-down / Drill-up**: navegar desde información general a específica y viceversa.  
- **Contextual UI**: mostrar acciones o información relevante según el contexto actual.  
- **Exploración inline**: evitar abrir nuevas páginas o recargar la vista.  

---

## Mindset y Nueva Forma de Pensar

- **No es saturar la UI**, es **dar al usuario la información que necesita, en el momento adecuado**.  
- **Centrado en el usuario**, no en la tecnología: entender cómo navega y organiza su flujo mental.  
- **Flexibilidad y escalabilidad**: la interfaz debe soportar capas adicionales de información sin reestructurarse.  
- **Reducción de carga cognitiva**: cada interacción debe mantener el foco y contexto.  

---

## Beneficios

- Mejora la **eficiencia y productividad** del usuario.  
- Reduce **errores y confusión** al mantener contexto y referencia visual.  
- Facilita la **adopción del software** porque se siente intuitivo y predecible.  
- Permite **interfaces escalables** que soportan datos y relaciones complejas.  

---

## Ejemplos de Implementación

- **Tablas editables inline**: edición directa sin salir de la vista.  
- **Row expansion**: mostrar subtareas y detalles dentro de la misma fila.  
- **Panel lateral**: mostrar detalles completos sin perder la tabla principal.  
- **Modal ligero**: edición rápida de información adicional.  
- **Popover / tooltip**: información contextual rápida (responsables, métricas, etc.).  
- **Breadcrumb / drill-down navigation**: explorar jerarquías manteniendo orientación.  

---

> En resumen: el **contexto progresivo** es un **paradigma de UI/UX** que permite al usuario explorar datos de manera jerárquica, progresiva y sin perder el hilo, alineando diseño, interacción y arquitectura de software hacia flujos más naturales y eficientes.
