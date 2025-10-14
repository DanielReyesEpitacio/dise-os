# 🧠 Modelo Ontológico de Usuario, Agente y Roles  
## Una Propuesta Evolutiva y Escalable para el Diseño de Sistemas

---

## Introducción a la Ontología aplicada al software

La ontología, en informática y filosofía, es el estudio de las entidades, sus categorías y relaciones fundamentales en un dominio. En el contexto del diseño de software, aplicar un enfoque ontológico significa construir modelos conceptuales que representen con fidelidad lo que "existe" en el dominio, diferenciando entidades reales, roles funcionales, relaciones dinámicas y contextos de operación. Este enfoque permite evitar ambigüedades, separar preocupaciones y construir sistemas más sostenibles, expresivos y evolutivos.

---

## Introducción

En el diseño de sistemas, el concepto de "usuario" es uno de los más utilizados. Pa desarrollados con poca experiencia se representa como una entidad monolítica con atributos de identidad, acceso y permisos mezclados, lo que produce una estructura frágil, acoplada y poco evolutiva. Este documento propone un modelo ontológico que separa claramente los conceptos de agente, cuenta y rol, alineado con principios de diseño orientado al dominio (DDD), pero que también admite rutas de adopción progresiva y contextos pragmáticos.

---

## Fundamentos Ontológicos

### ✅ Usuario no es una entidad: es un rol funcional

La palabra “usuario” es ambigua. No representa una entidad ontológica real del dominio, sino un **rol funcional** asumido por una entidad que interactúa con el sistema.

Un "usuario" puede ser:
- Una persona humana.
- Un bot o aplicación.
- Un sistema externo.

Por lo tanto, “usuario” **no debe modelarse como una tabla raíz** de todas las demás entidades. En lugar de eso, debe ser una **vista contextual o proyección funcional** que resulta de la combinación entre una cuenta, su agente asociado y los roles vigentes.

---

## Estructura Conceptual Propuesta

### ✳ Agente

Una entidad real que actúa con autonomía dentro o fuera del sistema. Puede ser:
- Una persona.
- Una app.
- Un sistema externo.

### ✳ Cuenta

Un medio de acceso al sistema. Contiene:
- Credenciales o tokens.
- Estado de acceso.
- Asociación con un agente.

Una misma persona (agente) puede tener múltiples cuentas (por ejemplo, una laboral y otra personal), o incluso ninguna (si aún no accede al sistema).

### ✳ Rol y Asignación

Los roles representan permisos o capacidades funcionales en el sistema. No deben estar embebidos como `is_admin`, `is_client`, etc., sino modelarse como entidades relacionales y dinámicas, asociadas a cuentas mediante asignaciones contextuales.

### 🔄 Asignación de Rol

Relación entre una cuenta y un rol, con posible contexto:
- Proyecto, empresa, sistema, o nivel jerárquico.
- Vigencia temporal o condiciones dinámicas.

---

## Modelo Conceptual

[Agente] ←1---*→ [Cuenta] ←1---*→ [AsignaciónRol] ←*---1→ [Rol]

- Un *Agente* puede tener múltiples *Cuentas*.
- Una *Cuenta* puede tener múltiples *Roles*, a través de asignaciones.
- Los *Roles* pueden existir en distintos contextos.

---

## Ejemplos que se modelan de forma natural

- Personas registradas sin cuenta (aún no acceden).
- Aplicaciones o bots autenticados.
- Agentes con múltiples cuentas o credenciales.
- Personas con múltiples roles según el contexto (admin en Empresa A, operador en Empresa B).
- Sistemas externos que interactúan mediante OAuth o API tokens.

---

## Ventajas frente al modelo tradicional

| Problemas del modelo clásico               | Solución ontológica propuesto                  |
|--------------------------------------------|------------------------------------------------|
| Mezcla de identidad, acceso y permisos      | Separación entre Agente, Cuenta y Rol         |
| Flags tipo `is_admin`, `is_client`, etc.    | Roles dinámicos y contextualizados            |
| Confusión entre tipos de usuario            | “Usuario” como vista, no entidad raíz         |
| No se modelan bots, apps o sistemas externos| Agente puede ser persona, software o sistema  |
| Dificultad para representar relaciones complejas | Asignación de roles flexible y escalable  |

---

## Consideraciones pragmáticas

Si bien este modelo ofrece una gran claridad semántica y flexibilidad, **no se propone como única solución universal**, sino como una guía para construir sistemas sostenibles y extensibles.

Para proyectos simples o en fase inicial (MVP), puede adoptarse una **implementación parcial**, manteniendo la separación conceptual en el diseño, aunque no se despliegue toda la infraestructura ontológica desde el inicio.

### Ruta de implementación progresiva

| Fase         | Entidades modeladas           | Beneficio                             |
|--------------|-------------------------------|----------------------------------------|
| Fase 1 (MVP) | `Cuenta` (con agente implícito)| Rápida implementación, simple acceso  |
| Fase 2       | Separa `Agente` y `Cuenta`     | Representación clara de actores       |
| Fase 3       | Agrega `Rol` y `Asignaciones`  | Control de permisos dinámico          |
| Fase 4       | Contextualiza `Asignaciones`   | Soporte multitenancy o jerarquías     |

---

## Conclusión

Modelar correctamente el concepto de "usuario" desde una perspectiva ontológica permite construir sistemas más fieles al dominio, más flexibles ante cambios, y más sostenibles en el tiempo.  
- Separar lo que “*es*” (`Agente`), de cómo accede (`Cuenta`), y qué puede hacer (`Rol`) es clave.  
- “Usuario” no debe ser una tabla raíz heredable, sino una composición funcional.

Adoptar este enfoque desde el principio —aunque sea de forma parcial— reduce el riesgo de reescritura futura y sienta las bases para un sistema coherente, evolutivo y alineado al negocio.