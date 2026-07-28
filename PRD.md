# PRD — Dashboard de Control RealEX

## 1. Contexto

RealEX vende un sitio inmobiliario prefabricado a corredores y agentes en México. La venta se cierra manualmente por WhatsApp. Existe una red de afiliados que refiere clientes y cobra comisión sobre venta inicial y sobre la mensualidad recurrente.

Hoy no existe un sistema central. Este dashboard es la fuente única de verdad para tres funciones que comparten la misma base de datos: registro comercial, despliegue de sitios y liquidación de afiliados.

## 2. Decisiones cerradas (no modificar)

Estas ya se tomaron. No propongas alternativas.

- **Un solo repo de plantilla, N sitios en Netlify.** Nunca se clona el repo por cliente. Cada sitio de Netlify apunta al mismo repo y se diferencia por la variable de entorno `CLIENT_ID`. En build, el sitio lee su configuración desde Supabase usando ese ID.
- **La infraestructura no se transfiere al cliente.** El sitio permanece siempre en la cuenta de Netlify de RealEX. El cliente compra su dominio y apunta el DNS. Nunca se transfiere el sitio ni el repo a su cuenta.
- **La comisión se devenga desde un pago registrado, no desde una venta.** Si no hay pago capturado, no existe comisión.
- **Fase 1 es captura manual sobre la base de datos definitiva.** Nada de Excel ni Notion intermedios. La automatización posterior solo reemplaza el disparador humano, no el esquema.

## 3. Stack

- **Base de datos y auth:** Supabase (Postgres + Auth + RLS)
- **Dashboard:** Next.js (App Router) + TypeScript + Tailwind
- **Hosting del dashboard:** Netlify
- **Despliegue de sitios cliente:** Netlify API v1
- **Usuarios en Fase 1:** uno solo (el operador). Sin portal de afiliado ni de cliente.

## 4. Modelo de datos

### `afiliados`
| campo | tipo | notas |
|---|---|---|
| id | uuid PK | |
| nombre | text | |
| email | text | |
| whatsapp | text | |
| codigo | text UNIQUE | slug corto usado en `?ref=` |
| estatus | enum | `activo`, `pausado`, `baja` |
| datos_pago | jsonb | banco, CLABE, titular |
| created_at | timestamptz | |

### `clientes`
| campo | tipo | notas |
|---|---|---|
| id | uuid PK | |
| nombre | text | |
| inmobiliaria | text | |
| email | text | |
| whatsapp | text | |
| afiliado_id | uuid FK nullable | atribución |
| origen | enum | `meta_ads`, `afiliado`, `directo`, `referido` |
| estatus | enum | ver máquina de estados §6 |
| fecha_compra | date | |
| notas | text | |

### `sitios`
| campo | tipo | notas |
|---|---|---|
| id | uuid PK | |
| cliente_id | uuid FK | |
| netlify_site_id | text | devuelto por la API |
| subdominio | text | `<slug>.netlify.app` |
| dominio_custom | text nullable | |
| estado_dns | enum | `pendiente`, `apuntado`, `verificado` |
| estatus | enum | `creado`, `build_ok`, `build_error`, `live`, `suspendido` |
| ultimo_deploy_at | timestamptz | |
| config | jsonb | payload completo que consume la plantilla |

El `config` incluye: logo_url, paleta de colores, teléfono, whatsapp, dirección, textos de hero y secciones, arreglo de propiedades, redes sociales.

### `suscripciones`
| campo | tipo | notas |
|---|---|---|
| id | uuid PK | |
| cliente_id | uuid FK | |
| monto_mxn | numeric | |
| estatus | enum | `activa`, `pausada`, `cancelada` |
| fecha_inicio | date | |
| dia_cobro | int | 1–28 |
| fecha_cancelacion | date nullable | |

### `pagos`
| campo | tipo | notas |
|---|---|---|
| id | uuid PK | |
| cliente_id | uuid FK | |
| suscripcion_id | uuid FK nullable | |
| concepto | enum | `frontend`, `mensual`, `upsell` |
| monto_mxn | numeric | |
| metodo | text | |
| fecha | date | |
| referencia | text | |

### `comisiones`
| campo | tipo | notas |
|---|---|---|
| id | uuid PK | |
| afiliado_id | uuid FK | |
| cliente_id | uuid FK | |
| pago_id | uuid FK | origen del devengo |
| tipo | enum | `frontend_30`, `recurrente_26`, `producto_26` |
| base_mxn | numeric | |
| porcentaje | numeric | |
| monto_mxn | numeric | calculado |
| estatus | enum | `devengada`, `por_pagar`, `pagada` |
| fecha_devengo | date | |
| fecha_pago | date nullable | |
| referencia_pago | text nullable | |

## 5. Reglas de negocio

- Venta front-end (2,997 MXN): comisión 30% al afiliado atribuido.
- Mensualidad del servicio gestionado: comisión 26% recurrente, mientras la suscripción esté `activa`.
- Cualquier producto o servicio futuro que compre un cliente referido: comisión 26%.
- La comisión se crea automáticamente por trigger al insertar un registro en `pagos`, si el cliente tiene `afiliado_id`.
- Si una suscripción pasa a `cancelada`, deja de generar comisiones recurrentes. Las ya devengadas no se revierten.
- Un cliente sin `afiliado_id` no genera comisiones. La atribución se captura al momento de registrar el cliente y no se puede editar después de que existe la primera comisión pagada.

## 6. Máquina de estados del cliente

```
prospecto → pagado → generado → desplegado → entregado → activo
                                                       ↘ cancelado
```

- `prospecto`: capturado, sin pago.
- `pagado`: existe al menos un registro en `pagos`.
- `generado`: `config` completo y validado en la tabla `sitios`.
- `desplegado`: Netlify creó el sitio y el build terminó en éxito.
- `entregado`: se enviaron al cliente las instrucciones de DNS.
- `activo`: dominio apuntado y verificado, suscripción activa.
- `cancelado`: suscripción cancelada. El sitio pasa a `suspendido`.

El dashboard debe impedir saltos inválidos de estado.

## 7. Pantallas

**Inicio.** MRR, clientes activos, sitios live, sitios con build en error, ventas del mes, comisiones pendientes por pagar.

**Clientes.** Tabla filtrable por estatus, origen y afiliado. Vista de detalle con timeline de estados, pagos, sitio asociado y comisiones generadas.

**Sitios.** Estado de deploy de cada sitio. Acciones: crear sitio en Netlify, editar `config`, disparar rebuild individual, disparar rebuild masivo de todos los sitios, suspender.

**Afiliados.** Lista con clientes referidos, comisión devengada acumulada, comisión pagada, saldo. Detalle con desglose.

**Comisiones.** Corte por periodo. Selección múltiple para marcar como pagadas con referencia. Exportación a CSV.

**Pagos.** Alta manual de pago con selección de cliente, concepto y monto.

## 8. Integración con Netlify

Token personal en variable de entorno del servidor. Nunca expuesto al cliente ni en código.

- **Crear sitio:** `POST /api/v1/sites` con nombre de subdominio, `repo` apuntando al repo de plantilla, y `build_settings.env` incluyendo `CLIENT_ID`. Guardar el `site_id` devuelto en `sitios.netlify_site_id`.
- **Rebuild:** `POST /api/v1/sites/{site_id}/builds`.
- **Estatus:** `GET /api/v1/sites/{site_id}/deploys`, leer el más reciente.
- **Rebuild masivo:** iterar sobre sitios con estatus `live`, con throttle para no reventar el rate limit. Registrar resultado por sitio.

Todas las llamadas se hacen desde route handlers del servidor.

## 9. Seguridad

- Supabase Auth con email y contraseña. Un solo usuario en Fase 1.
- RLS activo en todas las tablas. Sin políticas públicas.
- Service role key solo en servidor.
- La plantilla del cliente lee su `config` mediante una función edge de solo lectura filtrada por `CLIENT_ID`, nunca con acceso directo a la tabla.

## 10. Criterios de aceptación de Fase 1

1. Puedo dar de alta un afiliado y obtener su código de referencia.
2. Puedo dar de alta un cliente y atribuirlo a un afiliado.
3. Al registrar un pago de 2,997 MXN, se crea automáticamente una comisión de 30% en estatus `devengada`.
4. Puedo llenar el `config` de un cliente y crear su sitio en Netlify desde un botón, y el `netlify_site_id` queda guardado.
5. El sitio desplegado muestra los datos de ese cliente y no los de la plantilla base.
6. Puedo disparar rebuild de todos los sitios desde un botón y ver el resultado por sitio.
7. Puedo ver el saldo por pagar de cada afiliado y marcar comisiones como pagadas.
8. El dashboard no permite mover un cliente a `desplegado` si no tiene sitio con build exitoso.

## 11. Fuera de alcance en Fase 1

- Cobro automático vía Stripe o Mercado Pago.
- Portal de autoservicio para afiliados o clientes.
- Editor visual de la plantilla.
- Envío automático de correos e instrucciones.
- Multiusuario y roles.
