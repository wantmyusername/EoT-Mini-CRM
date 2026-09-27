# EoT Mini CRM — Transport CRM

Plugin de **WordPress** que añade un **mini CRM para gestionar los servicios de transporte** de **Exclusive on Trip** ([exclusiveontrip.com](https://exclusiveontrip.com)). Registra su propia tabla y agrega el menú **"EoT CRM"** en el panel de administración.

## Qué es

`transport-crm.php` es un plugin que permite dar de alta, editar y consultar **reservas/servicios de transporte** (cliente, agencia, proveedor, ruta, fecha, pasajeros, vehículo, saldo y estado de pago), además de **exportar a Excel, generar PDF e imprimir** cada servicio.

## Características

- **Listado** de servicios en el admin (menú **EoT CRM**).
- **Alta** y **edición** de servicios.
- **Cambio de estado de pago** por AJAX.
- **Exportar a Excel** todos los servicios (AJAX).
- **Descargar PDF** de un servicio (AJAX).
- **Imprimir** un servicio (AJAX).
- **Eliminar** un servicio (AJAX).

### Campos del servicio

Cliente (nombre, teléfono, email), agencia, proveedor, tipo de servicio, tipo de viaje (`one_way`), fecha, **recogida** y **destino** (con URL de mapa), hora de recogida de regreso, número de vuelo, pasajeros, tipo de vehículo, **saldo** + moneda (`USD`/`MXN`), **estado de pago**, importe de reporte y de proveedor, y notas.

## Archivos

| Archivo | Descripción |
|---|---|
| `transport-crm.php` | El plugin de WordPress (todo el CRM). |
| `travel-reservation.html` | Voucher / ficha de servicio imprimible (con logo y contacto de Exclusive on Trip). |

## Estructura de menús / acciones

- `transport_crm_main_page` — listado principal.
- `transport_crm_new_service` / `transport_crm_edit_service` — alta y edición.
- AJAX (`wp_ajax_*`): `delete_transport_service`, `update_payment_status`, `export_services_excel`, `download_service_pdf`, `print_service`.

## Base de datos

Al activarse, crea/actualiza la tabla **`{prefijo}transport_services`**:

| Columna | Tipo | Notas |
|---|---|---|
| `id` | mediumint | PK autoincremental |
| `created_at` | datetime | default `CURRENT_TIMESTAMP` |
| `client_name` / `client_phone` / `client_email` | varchar | Datos del cliente |
| `agency` / `provider` | varchar | Agencia y proveedor |
| `service_type` / `trip_type` | varchar | Tipo de servicio / viaje |
| `service_date` | datetime | Fecha del servicio |
| `pickup_location` / `pickup_location_url` | text | Recogida |
| `destination` / `destination_url` | text | Destino |
| `return_pickup_time` | time | Recogida de regreso |
| `flight_number` | varchar | Nº de vuelo |
| `passengers` | int | Pasajeros |
| `vehicle_type` | varchar | Tipo de vehículo |
| `balance` / `balance_currency` | decimal / enum | Saldo y moneda (`USD`/`MXN`) |
| `payment_status` | varchar | Estado de pago |
| `report_amount` / `report_provider_amount` | decimal | Importes de reporte |
| `notes` | text | Notas |
| `last_edited` | datetime | Última edición |

## Instalación

1. Copia `transport-crm.php` a `wp-content/plugins/` (en su propia carpeta) o súbelo como plugin.
2. Actívalo en **Plugins** del admin de WordPress → crea la tabla.
3. Aparecerá el menú **EoT CRM**.

> Requiere **WordPress** y **PHP**. Usa `$wpdb` (no hay credenciales hardcodeadas). Está pensado para correr en `exclusiveontrip.com/crm/`.

## Notas

- El README anterior describía un *"Service Receipt Plugin"* genérico (con ejemplos de CSS/JS); **no correspondía** a este código. Este documento describe el plugin real.
- `travel-reservation.html` carga el logo desde `https://exclusiveontrip.com/logo.png` y muestra el correo de contacto del negocio.
- No hay archivo `LICENSE` en el repositorio (el README anterior mencionaba MIT).

## Licencia

Sin archivo de licencia incluido.
