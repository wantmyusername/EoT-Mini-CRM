<?php
/*
Plugin Name: Transport CRM
Description: Sistema CRM para gestión de servicios de transporte
Version: 1.0
Author: Jesús Rodríguez
*/

// Evitar acceso directo
if (!defined('ABSPATH')) exit;

// Activación del plugin
function transport_crm_activate() {
    // Crear tabla para almacenar servicios
    global $wpdb;
    $table_name = $wpdb->prefix . 'transport_services';
    
    $charset_collate = $wpdb->get_charset_collate();
    
    $sql = "CREATE TABLE IF NOT EXISTS $table_name (
        id mediumint(9) NOT NULL AUTO_INCREMENT,
        created_at datetime DEFAULT CURRENT_TIMESTAMP,
        client_name varchar(100) NOT NULL,
        client_phone varchar(20) NOT NULL,
        client_email varchar(100),
        agency varchar(100),
        provider varchar(100),  // Nueva columna para Proveedor
        service_type varchar(50) NOT NULL,
        trip_type varchar(20) NOT NULL DEFAULT 'one_way',
        service_date datetime NOT NULL,
        pickup_location text NOT NULL,
        pickup_location_url text,
        destination text NOT NULL,
        destination_url text,
        return_pickup_time time,
        flight_number varchar(20),
        passengers int NOT NULL,
        vehicle_type varchar(50),
        balance decimal(10,2),
        balance_currency enum('USD', 'MXN') DEFAULT 'USD',
        payment_status varchar(20) DEFAULT 'Pendiente',
        report_amount decimal(10,2) DEFAULT 0.00,
        notes text,
        last_edited datetime NULL,
        report_provider_amount decimal(10,2) DEFAULT 0.00, // Nueva columna para Reporte Proveedor
        PRIMARY KEY  (id)
    ) $charset_collate;";
    
    require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
    dbDelta($sql);
}
register_activation_hook(__FILE__, 'transport_crm_activate');

// Función para actualizar la estructura de la tabla
function transport_crm_update_db() {
    global $wpdb;
    $table_name = $wpdb->prefix . 'transport_services';
    
    // Verificar si la columna report_provider_amount existe
    $column_exists = $wpdb->get_results("SHOW COLUMNS FROM $table_name LIKE 'report_provider_amount'");
    
    if (empty($column_exists)) {
        // Agregar la columna si no existe
        $wpdb->query("ALTER TABLE $table_name ADD COLUMN report_provider_amount decimal(10,2) DEFAULT 0.00 AFTER report_amount");
    }
    
    // Verificar si la columna report_amount existe
    $column_exists = $wpdb->get_results("SHOW COLUMNS FROM $table_name LIKE 'report_amount'");
    
    if (empty($column_exists)) {
        // Agregar la columna si no existe
        $wpdb->query("ALTER TABLE $table_name ADD COLUMN report_amount decimal(10,2) DEFAULT 0.00 AFTER payment_status");
    }
}

// Ejecutar la actualización de la base de datos
add_action('admin_init', 'transport_crm_update_db');

// Agregar menú al admin
function transport_crm_menu() {
    add_menu_page(
        'EoT CRM',
        'EoT CRM',
        'manage_options',
        'transport-crm',
        'transport_crm_main_page',
        'dashicons-calendar-alt'
    );
    
    add_submenu_page(
        'transport-crm',
        'Nuevo Servicio',
        'Nuevo Servicio',
        'manage_options',
        'transport-crm-new',
        'transport_crm_new_service'
    );
    
    add_submenu_page(
        null, // No mostrar en menú
        'Editar Servicio',
        'Editar Servicio',
        'manage_options',
        'transport-crm-edit',
        'transport_crm_edit_service'
    );
}
add_action('admin_menu', 'transport_crm_menu');

// Primero, agregar la función para eliminar servicios
add_action('wp_ajax_delete_transport_service', 'transport_crm_delete_service');
function transport_crm_delete_service() {
    check_ajax_referer('delete_transport_service', 'nonce');
    
    if (!current_user_can('manage_options')) {
        wp_send_json_error('No tienes permisos para realizar esta acción.');
    }
    
    global $wpdb;
    $table_name = $wpdb->prefix . 'transport_services';
    $service_id = intval($_POST['service_id']);
    
    $result = $wpdb->delete(
        $table_name,
        array('id' => $service_id),
        array('%d')
    );
    
    if ($result === false) {
        wp_send_json_error('Error al eliminar el servicio.');
    }
    
    wp_send_json_success('Servicio eliminado correctamente.');
}

// Modificar la página principal para incluir filtros y botón de eliminar
function transport_crm_main_page() {
    global $wpdb;
    $table_name = $wpdb->prefix . 'transport_services';

    // Debug: Verificar la tabla y los registros
    echo "<!-- Debug info: \n";
    echo "Table name: " . $table_name . "\n";
    $count = $wpdb->get_var("SELECT COUNT(*) FROM $table_name");
    echo "Total records: " . $count . "\n";
    
    // Consulta simple sin filtros ni paginación
    $services = $wpdb->get_results("SELECT * FROM $table_name ORDER BY service_date DESC");
    echo "Query results count: " . count($services) . "\n";
    echo "-->";

    // Paginación
    $items_per_page = 30;
    $current_page = isset($_GET['paged']) ? max(1, intval($_GET['paged'])) : 1;
    $offset = ($current_page - 1) * $items_per_page;

    // Obtener parámetros de filtro
    $selected_date = isset($_GET['filter_date']) ? sanitize_text_field($_GET['filter_date']) : '';
    $selected_agency = isset($_GET['filter_agency']) ? sanitize_text_field($_GET['filter_agency']) : '';
    $selected_provider = isset($_GET['filter_provider']) ? sanitize_text_field($_GET['filter_provider']) : '';
    $selected_vehicle = isset($_GET['filter_vehicle']) ? sanitize_text_field($_GET['filter_vehicle']) : '';

    // Construir la consulta base
    $query = "SELECT * FROM $table_name";
    $count_query = "SELECT COUNT(*) FROM $table_name";
    $where_clauses = array();
    $query_params = array();

    if (isset($_GET['date_filter_type']) && $_GET['date_filter_type'] === 'month' && !empty($_GET['filter_month'])) {
        $month_date = sanitize_text_field($_GET['filter_month']);
        $where_clauses[] = "DATE_FORMAT(service_date, '%Y-%m') = %s";
        $query_params[] = $month_date;
    } elseif (!empty($_GET['filter_date'])) {
        $where_clauses[] = "DATE(service_date) = %s";
        $query_params[] = sanitize_text_field($_GET['filter_date']);
    }

    if (!empty($selected_agency)) {
        $where_clauses[] = "agency LIKE %s";
        $query_params[] = '%' . $wpdb->esc_like($selected_agency) . '%';
    }

    if (!empty($selected_provider)) {
        $where_clauses[] = "provider LIKE %s";
        $query_params[] = '%' . $wpdb->esc_like($selected_provider) . '%';
    }

    if (!empty($selected_vehicle)) {
        $where_clauses[] = "vehicle_type = %s";
        $query_params[] = $selected_vehicle;
    }

    // Agregar where clauses si existen
    if (!empty($where_clauses)) {
        $query .= " WHERE " . implode(" AND ", $where_clauses);
        $count_query .= " WHERE " . implode(" AND ", $where_clauses);
    }

    // Agregar ordenamiento y límites
    $query .= " ORDER BY service_date DESC LIMIT %d OFFSET %d";
    $query_params[] = $items_per_page;
    $query_params[] = $offset;

    // Debug: Mostrar la consulta final
    $final_query = $wpdb->prepare($query, $query_params);
    echo "<!-- Final query: " . $final_query . " -->";

    // Ejecutar las consultas
    $services = $wpdb->get_results($wpdb->prepare($query, $query_params));
    $total_items = $wpdb->get_var($wpdb->prepare($count_query, array_slice($query_params, 0, -2)));
    $total_pages = ceil($total_items / $items_per_page);

    // Debug: Verificar resultados
    echo "<!-- Results count: " . count($services) . " -->";
    echo "<!-- Total items: " . $total_items . " -->";

    // Calcular totales de los servicios filtrados
    $total_mxn = 0;
    $total_usd = 0;
    $total_report = 0;

    if (!empty($services)) {
        foreach ($services as $service) {
            if ($service->balance_currency === 'MXN') {
                $total_mxn += floatval($service->balance);
            } else {
                $total_usd += floatval($service->balance);
            }
            $total_report += floatval($service->report_amount);
        }
    }

    ?>
    <div class="wrap">
        <h1>EoT CRM - Dashboard</h1>

        <!-- Filtros -->
        <div class="tablenav top">
            <form method="get" class="alignleft actions">
                <input type="hidden" name="page" value="transport-crm">
                
                <select name="date_filter_type" style="margin-right: 5px;">
                    <option value="day" <?php selected(isset($_GET['date_filter_type']) ? $_GET['date_filter_type'] : '', 'day'); ?>>Por Día</option>
                    <option value="month" <?php selected(isset($_GET['date_filter_type']) ? $_GET['date_filter_type'] : '', 'month'); ?>>Por Mes</option>
                </select>
                
                <input type="date" 
                       name="filter_date" 
                       value="<?php echo esc_attr($selected_date); ?>"
                       style="margin-right: 5px; <?php echo (isset($_GET['date_filter_type']) && $_GET['date_filter_type'] === 'month') ? 'display:none;' : ''; ?>"
                       class="date-input day-filter">
                
                <input type="month" 
                       name="filter_month" 
                       value="<?php echo isset($_GET['filter_month']) ? esc_attr($_GET['filter_month']) : ''; ?>"
                       style="margin-right: 5px; <?php echo (!isset($_GET['date_filter_type']) || $_GET['date_filter_type'] === 'day') ? 'display:none;' : ''; ?>"
                       class="date-input month-filter">
                
                <input type="text" 
                       name="filter_agency" 
                       placeholder="Buscar por agencia"
                       value="<?php echo esc_attr($selected_agency); ?>"
                       style="margin-right: 5px;">
                
                <input type="text" 
                       name="filter_provider" 
                       placeholder="Buscar por proveedor"
                       value="<?php echo esc_attr($selected_provider); ?>"
                       style="margin-right: 5px;">
                
                <select name="filter_vehicle" style="margin-right: 5px;">
                    <option value="">Todas las unidades</option>
                    <option value="Van" <?php selected($selected_vehicle, 'Van'); ?>>Van</option>
                    <option value="Sprinter" <?php selected($selected_vehicle, 'Sprinter'); ?>>Sprinter</option>
                    <option value="Suburban" <?php selected($selected_vehicle, 'Suburban'); ?>>Suburban</option>
                    <option value="Toyota" <?php selected($selected_vehicle, 'Toyota'); ?>>Toyota</option>
                </select>
                
                <input type="submit" class="button" value="Filtrar">
                <a href="?page=transport-crm" class="button">Mostrar todos</a>
                <a href="?page=transport-crm-new" class="button button-primary">Nuevo Servicio</a>
            </form>
        </div>

        <!-- Nueva estructura de tabla -->
        <table class="wp-list-table widefat fixed striped">
            <thead>
                <tr>
                    <th>Fecha</th>
                    <th>Nombre</th>
                    <th>PAX</th>
                    <th>Hora (24H)</th>
                    <th>Lugar</th>
                    <th>Destino</th>
                    <th>Agencia</th>
                    <th>Proveedor</th>                    
                    <th>Servicio</th>
                    <th>Tipo de Unidad</th>
                    <th>Balance MXN</th>
                    <th>Balance USD</th>
                    <th>Reporte (MXN)</th>
                    <th>Reporte Proveedor</th>                    
                    <th>Estatus de Pago</th>
                    <th>Observaciones</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
                <?php if (empty($services)): ?>
                <tr>
                    <td colspan="15">No se encontraron servicios.</td>
                </tr>
                <?php else: ?>
                    <?php foreach ($services as $service): ?>
                    <tr>
                        <td data-label="Fecha"><?php echo date('d/m/Y', strtotime($service->service_date)); ?></td>
                        <td data-label="Nombre">
                            <?php 
                            echo esc_html($service->client_name);
                            if ($service->client_phone) {
                                echo '<br><small>Tel: ' . esc_html($service->client_phone) . '</small>';
                            }
                            ?>
                        </td>
                        <td data-label="PAX"><?php echo esc_html($service->passengers); ?></td>
                        <td data-label="Hora (24H)"><?php echo date('H:i', strtotime($service->service_date)); ?></td>
                        <td data-label="Lugar">
                            <?php 
                            echo esc_html($service->pickup_location);
                            if ($service->pickup_location_url) {
                                echo '<br><a href="' . esc_url($service->pickup_location_url) . '" target="_blank">Ver mapa</a>';
                            }
                            if ($service->trip_type === 'round_trip' && $service->return_pickup_time) {
                                echo '<br><small>Regreso: ' . date('g:i A', strtotime($service->return_pickup_time)) . '</small>';
                            }
                            ?>
                        </td>
                        <td data-label="Destino">
                            <?php 
                            echo esc_html($service->destination);
                            if ($service->destination_url) {
                                echo '<br><a href="' . esc_url($service->destination_url) . '" target="_blank">Ver mapa</a>';
                            }
                            ?>
                        </td>
                        <td data-label="Agencia"><?php echo esc_html($service->agency); ?></td>
                        <td data-label="Proveedor"><?php echo esc_html($service->provider); ?></td>
                        <td data-label="Servicio"><?php echo esc_html($service->service_type); ?></td>
                        <td data-label="Tipo de Unidad"><?php echo esc_html($service->vehicle_type); ?></td>
                        <td data-label="Balance MXN">
                            <?php 
                            if ($service->balance_currency === 'MXN') {
                                echo 'MXN ' . number_format($service->balance, 2);
                            }
                            ?>
                        </td>
                        <td data-label="Balance USD">
                            <?php 
                            if ($service->balance_currency === 'USD') {
                                echo 'USD ' . number_format($service->balance, 2);
                            }
                            ?>
                        </td>
                        <td data-label="Reporte (MXN)"><?php echo esc_html($service->report_amount); ?></td>
                        <td data-label="Reporte Proveedor"><?php echo esc_html($service->report_provider_amount); ?></td>
                        <td data-label="Estatus de Pago">
                            <?php echo esc_html($service->payment_status); ?>
                        </td>
                        <td data-label="Observaciones"><?php echo esc_html($service->notes); ?></td>
                        <td data-label="Acciones">
                            <div class="action-buttons">
                                <a href="?page=transport-crm-edit&id=<?php echo $service->id; ?>" 
                                   class="button button-small">Editar</a>
                                <a href="<?php echo admin_url('admin-ajax.php?action=print_service&service_id=' . $service->id); ?>" 
                                   class="button button-small"
                                   target="_blank">Imprimir</a>
                                <button type="button" 
                                        class="button button-small delete-service" 
                                        data-id="<?php echo $service->id; ?>"
                                        style="color: #a00;">Eliminar</button>
                            </div>
                        </td>
                    </tr>
                    <?php endforeach; ?>
                <?php endif; ?>
            </tbody>
            <tfoot>
                <tr>
                    <th colspan="10" style="text-align: right; font-weight: bold;">Totales:</th>
                    <th style="font-weight: bold;">MXN <?php echo number_format($total_mxn, 2); ?></th>
                    <th style="font-weight: bold;">USD <?php echo number_format($total_usd, 2); ?></th>
                    <th style="font-weight: bold;">MXN <?php echo number_format($total_report, 2); ?></th>
                    <th style="font-weight: bold;">MXN <?php echo number_format(array_sum(array_column($services, 'report_provider_amount')), 2); ?></th> <!-- Suma de Reporte Proveedor -->
                    <th></th>
                    <th></th>
                    <th>
                        <button type="button" 
                                class="button button-primary button-small download-all-excel"
                                style="width: 100%; display: block;"> <!-- Cambiar el estilo aquí -->
                            Descargar Excel
                        </button>
                    </th>
                </tr>
            </tfoot>
        </table>

        <!-- Paginación -->
        <?php if ($total_pages > 1): ?>
        <div class="tablenav bottom">
            <div class="tablenav-pages">
                <?php
                echo paginate_links(array(
                    'base' => add_query_arg('paged', '%#%'),
                    'format' => '',
                    'prev_text' => __('&laquo;'),
                    'next_text' => __('&raquo;'),
                    'total' => $total_pages,
                    'current' => $current_page,
                    'show_all' => false,
                    'end_size' => 1,
                    'mid_size' => 2,
                    'type' => 'plain'
                ));
                ?>
            </div>
        </div>
        <?php endif; ?>
    </div>

    <style>
    .wp-list-table {
        table-layout: auto;
        width: 100%;
        overflow-x: auto;
    }
    .wp-list-table td {
        vertical-align: top;
        padding: 8px;
        word-wrap: break-word;
    }
    .wp-list-table small {
        color: #666;
        display: block;
        margin-top: 2px;
    }
    .wp-list-table tfoot th {
        padding: 10px;
        background-color: #f8f8f8;
        font-weight: bold;
    }
    .action-buttons {
        display: flex;
        flex-direction: column;
        gap: 5px;
    }
    .action-buttons .button {
        width: 100%;
        text-align: center;
    }
    .download-all-excel {
        display: inline-block;
        padding: 10px 20px;
        background-color: #0073aa;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        text-align: center;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        transition: background-color 0.3s;
        width: auto;
    }

    .download-all-excel:hover {
        background-color: #005177;
    }

    @media (max-width: 768px) {
        .wp-list-table thead {
            display: none;
        }
        .wp-list-table tr {
            display: block;
            margin-bottom: 15px;
        }
        .wp-list-table td {
            display: flex;
            justify-content: space-between;
            padding: 10px;
            border: 1px solid #ddd;
        }
        .wp-list-table td::before {
            content: attr(data-label);
            font-weight: bold;
            margin-right: 10px;
        }
        .download-all-excel {
            width: 100%;
            font-size: 16px;
            padding: 12px;
        }
    }
    </style>

    <script>
    jQuery(document).ready(function($) {
        $('.delete-service').click(function() {
            if (!confirm('¿Estás seguro de que deseas eliminar este servicio?')) {
                return;
            }
            
            var button = $(this);
            var serviceId = button.data('id');
            
            $.post(ajaxurl, {
                action: 'delete_transport_service',
                service_id: serviceId,
                nonce: '<?php echo wp_create_nonce('delete_transport_service'); ?>'
            }, function(response) {
                if (response.success) {
                    button.closest('tr').fadeOut(400, function() {
                        $(this).remove();
                    });
                } else {
                    alert('Error al eliminar el servicio: ' + response.data);
                }
            });
        });
    });
    </script>

    <script>
    jQuery(document).ready(function($) {
        $('.download-all-excel').click(function() {
            var queryParams = new URLSearchParams(window.location.search);
            var url = ajaxurl + '?action=export_services_excel';
            
            // Agregar los filtros actuales a la URL
            if (queryParams.has('date_filter_type')) {
                url += '&date_filter_type=' + queryParams.get('date_filter_type');
            }
            if (queryParams.has('filter_date')) {
                url += '&filter_date=' + queryParams.get('filter_date');
            }
            if (queryParams.has('filter_month')) {
                url += '&filter_month=' + queryParams.get('filter_month');
            }
            if (queryParams.has('filter_agency')) {
                url += '&filter_agency=' + queryParams.get('filter_agency');
            }
            if (queryParams.has('filter_provider')) {
                url += '&filter_provider=' + queryParams.get('filter_provider');
            }
            if (queryParams.has('filter_vehicle')) {
                url += '&filter_vehicle=' + queryParams.get('filter_vehicle');
            }
            
            window.location.href = url;
        });
    });
    </script>
    <?php
}

// Página de nuevo servicio
function transport_crm_new_service() {
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['submit_service'])) {
        global $wpdb;
        $table_name = $wpdb->prefix . 'transport_services';
        
        $data = array(
            'client_name' => sanitize_text_field($_POST['client_name']),
            'client_phone' => sanitize_text_field($_POST['client_phone']),
            'client_email' => isset($_POST['email_na']) ? 'N/A' : sanitize_email($_POST['client_email']),
            'agency' => sanitize_text_field($_POST['agency']),
            'provider' => sanitize_text_field($_POST['provider']), // Guardar Proveedor
            'service_type' => sanitize_text_field($_POST['service_type']),
            'trip_type' => sanitize_text_field($_POST['trip_type']),
            'service_date' => $_POST['service_date'],
            'pickup_location' => sanitize_textarea_field($_POST['pickup_location']),
            'pickup_location_url' => esc_url_raw($_POST['pickup_location_url']),
            'destination' => sanitize_textarea_field($_POST['destination']),
            'destination_url' => esc_url_raw($_POST['destination_url']),
            'flight_number' => sanitize_text_field($_POST['flight_number']),
            'passengers' => intval($_POST['passengers']),
            'vehicle_type' => sanitize_text_field($_POST['vehicle_type']),
            'balance' => floatval($_POST['balance']),
            'balance_currency' => sanitize_text_field($_POST['balance_currency']),
            'notes' => sanitize_textarea_field($_POST['notes']),
            'report_provider_amount' => floatval($_POST['report_provider_amount']), // Guardar Reporte Proveedor
        );

        // Si es round trip, incluir hora de pickup
        if ($_POST['trip_type'] === 'round_trip' && !empty($_POST['return_pickup_time'])) {
            $data['return_pickup_time'] = $_POST['return_pickup_time'];
        }

        // Debug: Mostrar datos a insertar
        error_log('Datos a insertar: ' . print_r($data, true));
        
        $result = $wpdb->insert($table_name, $data);
        
        if ($result === false) {
            // Debug: Mostrar error de inserción
            error_log('Error al insertar: ' . $wpdb->last_error);
            echo '<div class="notice notice-error"><p>Error al guardar el servicio: ' . $wpdb->last_error . '</p></div>';
        } else {
            // Debug: Mostrar ID insertado
            error_log('Servicio insertado con ID: ' . $wpdb->insert_id);
            echo '<div class="notice notice-success"><p>Servicio guardado correctamente. ID: ' . $wpdb->insert_id . '</p></div>';
        }
    }
    ?>
    <div class="wrap">
        <h1>Nuevo Servicio de Transporte</h1>
        <form method="post" action="">
            <table class="form-table">
                <tr>
                    <th><label for="client_name">Nombre</label></th>
                    <td><input type="text" name="client_name" id="client_name" class="regular-text" required></td>
                </tr>
                <tr>
                    <th><label for="client_phone">Teléfono</label></th>
                    <td><input type="tel" name="client_phone" id="client_phone" class="regular-text" required></td>
                </tr>
                <tr>
                    <th><label for="client_email">Email</label></th>
                    <td>
                        <input type="text" name="client_email" id="client_email" class="regular-text" placeholder="Ingrese email o N/A">
                        <label>
                            <input type="checkbox" name="email_na" id="email_na" value="1" onclick="toggleEmailField()"> N/A
                        </label>
                    </td>
                </tr>
                <tr>
                    <th><label for="agency">Agencia</label></th>
                    <td><input type="text" name="agency" id="agency" class="regular-text"></td>
                </tr>
                <tr>
                    <th><label for="provider">Proveedor</label></th>
                    <td><input type="text" name="provider" id="provider" class="regular-text" required></td>
                </tr>                
                <tr>
                    <th><label for="trip_type">Tipo de Viaje</label></th>
                    <td>
                        <select name="trip_type" id="trip_type" required>
                            <option value="one_way">One Way</option>
                            <option value="round_trip">Round Trip</option>
                        </select>
                    </td>
                </tr>
                <tr>
                    <th><label for="service_type">Servicio</label></th>
                    <td>
                        <select name="service_type" id="service_type" required>
                            <option value="Llegada">Llegada</option>
                            <option value="Salida">Salida</option>
                            <option value="Interhotel">Interhotel</option>
                            <option value="Tour Privado">Tour Privado</option>
                            <option value="Marina">Marina</option>
                        </select>
                    </td>
                </tr>
                <tr>
                    <th><label for="vehicle_type">Tipo de Unidad</label></th>
                    <td>
                        <select name="vehicle_type" id="vehicle_type" required>
                            <option value="Van">Van</option>
                            <option value="Sprinter">Sprinter</option>
                            <option value="Suburban">Suburban</option>
                            <option value="Toyota">Toyota</option>
                        </select>
                    </td>
                </tr>
                <tr>
                    <th><label for="service_date">Fecha y Hora</label></th>
                    <td><input type="datetime-local" name="service_date" id="service_date" required></td>
                </tr>
                <tr>
                    <th><label for="pickup_location">Lugar</label></th>
                    <td>
                        <textarea name="pickup_location" id="pickup_location" rows="2" class="regular-text" required></textarea>
                        <br>
                        <input type="url" name="pickup_location_url" id="pickup_location_url" class="regular-text" placeholder="URL de Google Maps">
                    </td>
                </tr>
                <tr>
                    <th><label for="destination">Destino</label></th>
                    <td>
                        <textarea name="destination" id="destination" rows="2" class="regular-text" required></textarea>
                        <br>
                        <input type="url" name="destination_url" id="destination_url" class="regular-text" placeholder="URL de Google Maps">
                    </td>
                </tr>
                <tr class="return-fields">
                    <th><label for="return_pickup_time">Hora pick up</label></th>
                    <td><input type="time" name="return_pickup_time" id="return_pickup_time"></td>
                </tr>
                <tr>
                    <th><label for="passengers">PAX</label></th>
                    <td><input type="number" name="passengers" id="passengers" min="1" required></td>
                </tr>
                <tr>
                    <th><label for="balance">Balance</label></th>
                    <td>
                        <input type="number" name="balance" id="balance" step="0.01" value="0">
                        <select name="balance_currency" id="balance_currency">
                            <option value="USD">USD</option>
                            <option value="MXN">MXN</option>
                        </select>
                    </td>
                </tr>
                <tr>
                    <th><label for="report_amount">Reporte (MXN)</label></th>
                    <td><input type="number" name="report_amount" id="report_amount" step="0.01" value="0"></td>
                </tr>
                <tr>
                    <th><label for="report_provider_amount">Reporte Proveedor</label></th>
                    <td><input type="number" name="report_provider_amount" id="report_provider_amount" step="0.01" value="0"></td>
                </tr>                
                <tr>
                    <th><label for="payment_status">Estatus de Pago</label></th>
                    <td>
                        <select name="payment_status" id="payment_status">
                            <option value="Pendiente">Pendiente</option>
                            <option value="Pagado">Pagado</option>
                            <option value="Cancelado">Cancelado</option> <!-- Mantener opción "Cancelado" -->
                            <option value="No Show">No Show</option> <!-- Añadir opción "No Show" -->
                        </select>
                    </td>
                </tr>
                <tr>
                    <th><label for="notes">Observaciones</label></th>
                    <td><textarea name="notes" id="notes" rows="4" class="regular-text"></textarea></td>
                </tr>
            </table>
            <p class="submit">
                <input type="submit" name="submit_service" class="button button-primary" value="Guardar Servicio">
            </p>
        </form>
    </div>

    <script>
    function toggleEmailField() {
        var emailField = document.getElementById('client_email');
        var checkbox = document.getElementById('email_na');
        emailField.value = checkbox.checked ? 'N/A' : '';
        emailField.disabled = checkbox.checked;
    }
    </script>

    <script>
    jQuery(document).ready(function($) {
        function handleReturnFields() {
            var tripType = $('#trip_type').val();
            var returnFields = $('.return-fields');
            
            if (tripType === 'one_way') {
                returnFields.hide();
                returnFields.find('input, select').prop('disabled', true);
            } else {
                returnFields.show();
                returnFields.find('input, select').prop('disabled', false);
            }
        }

        // Ejecutar al cargar la página
        handleReturnFields();

        // Ejecutar cuando cambie la selección
        $('#trip_type').on('change', handleReturnFields);
    });
    </script>
    <?php
}

// Función para editar servicio
function transport_crm_edit_service() {
    global $wpdb;
    $table_name = $wpdb->prefix . 'transport_services';
    $id = isset($_GET['id']) ? intval($_GET['id']) : 0;

    // Verificar si se está enviando el formulario para actualizar
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['update_service'])) {
        // Recoger datos del formulario
        $data = array(
            'client_name' => sanitize_text_field($_POST['client_name']),
            'client_phone' => sanitize_text_field($_POST['client_phone']),
            'client_email' => isset($_POST['email_na']) ? 'N/A' : sanitize_email($_POST['client_email']), // Guardar N/A si el checkbox está marcado
            'agency' => sanitize_text_field($_POST['agency']),
            'provider' => sanitize_text_field($_POST['provider']), // Guardar Proveedor
            'service_type' => sanitize_text_field($_POST['service_type']),
            'trip_type' => sanitize_text_field($_POST['trip_type']),
            'service_date' => $_POST['service_date'],
            'pickup_location' => sanitize_textarea_field($_POST['pickup_location']),
            'pickup_location_url' => esc_url_raw($_POST['pickup_location_url']),
            'destination' => sanitize_textarea_field($_POST['destination']),
            'destination_url' => esc_url_raw($_POST['destination_url']),
            'flight_number' => sanitize_text_field($_POST['flight_number']),
            'passengers' => intval($_POST['passengers']),
            'vehicle_type' => sanitize_text_field($_POST['vehicle_type']),
            'balance' => floatval($_POST['balance']),
            'balance_currency' => sanitize_text_field($_POST['balance_currency']),
            'report_amount' => floatval($_POST['report_amount']),
            'payment_status' => sanitize_text_field($_POST['payment_status']),
            'notes' => sanitize_textarea_field($_POST['notes']),
            'last_edited' => current_time('mysql'),
            'report_provider_amount' => floatval($_POST['report_provider_amount']), // Actualizar Reporte Proveedor
        );

        // Actualizar el servicio en la base de datos
        $result = $wpdb->update($table_name, $data, array('id' => $id));

        if ($result === false) {
            echo '<div class="notice notice-error"><p>Error al actualizar el servicio: ' . $wpdb->last_error . '</p></div>';
        } else {
            echo '<div class="notice notice-success"><p>Servicio actualizado correctamente.</p></div>';
            return; // Salir de la función después de la actualización
        }
    }

    // Recuperar el servicio solo si no se está actualizando
    $service = $wpdb->get_row($wpdb->prepare("SELECT * FROM $table_name WHERE id = %d", $id));

    if (!$service) {
        echo '<div class="notice notice-error"><p>Servicio no encontrado.</p></div>';
        return;
    }

    ?>
    <div class="wrap">
        <h1>Editar Servicio de Transporte</h1>
        <form method="post" action="">
            <table class="form-table">
                <tr>
                    <th><label for="client_name">Nombre</label></th>
                    <td><input type="text" name="client_name" id="client_name" class="regular-text" value="<?php echo esc_attr($service->client_name); ?>" required></td>
                </tr>
                <tr>
                    <th><label for="client_phone">Teléfono</label></th>
                    <td><input type="tel" name="client_phone" id="client_phone" class="regular-text" value="<?php echo esc_attr($service->client_phone); ?>" required></td>
                </tr>
                <tr>
                    <th><label for="client_email">Email</label></th>
                    <td>
                        <input type="text" name="client_email" id="client_email" class="regular-text" placeholder="Ingrese email o N/A" value="<?php echo esc_attr($service->client_email); ?>">
                        <label>
                            <input type="checkbox" name="email_na" id="email_na" value="1" <?php checked($service->client_email === 'N/A'); ?> onclick="toggleEmailField()"> N/A
                        </label>
                    </td>
                </tr>
                <tr>
                    <th><label for="agency">Agencia</label></th>
                    <td><input type="text" name="agency" id="agency" class="regular-text" value="<?php echo esc_attr($service->agency); ?>"></td>
                </tr>
                <tr>
                    <th><label for="provider">Proveedor</label></th>
                    <td><input type="text" name="provider" id="provider" class="regular-text" value="<?php echo esc_attr($service->provider); ?>" required></td>
                </tr>                
                <tr>
                    <th><label for="trip_type">Tipo de Viaje</label></th>
                    <td>
                        <select name="trip_type" id="trip_type" required>
                            <option value="one_way" <?php selected($service->trip_type, 'one_way'); ?>>One Way</option>
                            <option value="round_trip" <?php selected($service->trip_type, 'round_trip'); ?>>Round Trip</option>
                        </select>
                    </td>
                </tr>
                <tr>
                    <th><label for="service_type">Servicio</label></th>
                    <td>
                        <select name="service_type" id="service_type" required>
                            <option value="Llegada" <?php selected($service->service_type, 'Llegada'); ?>>Llegada</option>
                            <option value="Salida" <?php selected($service->service_type, 'Salida'); ?>>Salida</option>
                            <option value="Interhotel" <?php selected($service->service_type, 'Interhotel'); ?>>Interhotel</option>
                            <option value="Tour Privado" <?php selected($service->service_type, 'Tour Privado'); ?>>Tour Privado</option>
                            <option value="Marina" <?php selected($service->service_type, 'Marina'); ?>>Marina</option>
                        </select>
                    </td>
                </tr>
                <tr>
                    <th><label for="vehicle_type">Tipo de Unidad</label></th>
                    <td>
                        <select name="vehicle_type" id="vehicle_type" required>
                            <option value="Van" <?php selected($service->vehicle_type, 'Van'); ?>>Van</option>
                            <option value="Sprinter" <?php selected($service->vehicle_type, 'Sprinter'); ?>>Sprinter</option>
                            <option value="Suburban" <?php selected($service->vehicle_type, 'Suburban'); ?>>Suburban</option>
                            <option value="Toyota" <?php selected($service->vehicle_type, 'Toyota'); ?>>Toyota</option>
                        </select>
                    </td>
                </tr>
                <tr>
                    <th><label for="service_date">Fecha y Hora (24h)</label></th>
                    <td>
                        <input type="datetime-local" 
                               name="service_date" 
                               id="service_date" 
                               required
                               value="<?php echo date('Y-m-d\TH:i', strtotime($service->service_date)); ?>">
                    </td>
                </tr>
                <tr>
                    <th><label for="pickup_location">Lugar</label></th>
                    <td>
                        <textarea name="pickup_location" id="pickup_location" rows="2" class="regular-text" required><?php 
                            echo esc_textarea($service->pickup_location); 
                        ?></textarea>
                        <br>
                        <input type="url" name="pickup_location_url" id="pickup_location_url" class="regular-text" 
                            placeholder="URL de Google Maps" value="<?php echo esc_url($service->pickup_location_url); ?>">
                    </td>
                </tr>
                <tr>
                    <th><label for="destination">Destino</label></th>
                    <td>
                        <textarea name="destination" id="destination" rows="2" class="regular-text" required><?php 
                            echo esc_textarea($service->destination); 
                        ?></textarea>
                        <br>
                        <input type="url" name="destination_url" id="destination_url" class="regular-text" 
                            placeholder="URL de Google Maps" value="<?php echo esc_url($service->destination_url); ?>">
                    </td>
                </tr>
                <tr class="return-fields" <?php echo $service->trip_type === 'one_way' ? 'style="display:none;"' : ''; ?>>
                    <th><label for="return_pickup_time">Hora pick up (24h)</label></th>
                    <td>
                        <input type="time" 
                               name="return_pickup_time" 
                               id="return_pickup_time"
                               <?php echo $service->trip_type === 'one_way' ? 'disabled' : ''; ?>
                               value="<?php echo esc_attr($service->return_pickup_time); ?>">
                    </td>
                </tr>
                <tr>
                    <th><label for="passengers">PAX</label></th>
                    <td><input type="number" name="passengers" id="passengers" min="1" required
                        value="<?php echo esc_attr($service->passengers); ?>"></td>
                </tr>
                <tr>
                    <th><label for="balance">Balance</label></th>
                    <td>
                        <input type="number" name="balance" id="balance" step="0.01"
                            value="<?php echo esc_attr($service->balance); ?>">
                        <select name="balance_currency" id="balance_currency">
                            <option value="USD" <?php selected($service->balance_currency, 'USD'); ?>>USD</option>
                            <option value="MXN" <?php selected($service->balance_currency, 'MXN'); ?>>MXN</option>
                        </select>
                    </td>
                </tr>
                <tr>
                    <th><label for="report_amount">Reporte (MXN)</label></th>
                    <td><input type="number" name="report_amount" id="report_amount" step="0.01"
                        value="<?php echo esc_attr($service->report_amount); ?>"></td>
                </tr>
                <tr>
                    <th><label for="report_provider_amount">Reporte Proveedor</label></th>
                    <td><input type="number" name="report_provider_amount" id="report_provider_amount" step="0.01" value="<?php echo esc_attr($service->report_provider_amount); ?>"></td>
                </tr>                
                <tr>
                    <th><label for="payment_status">Estatus de Pago</label></th>
                    <td>
                        <select name="payment_status" id="payment_status">
                            <option value="Pendiente" <?php selected($service->payment_status, 'Pendiente'); ?>>Pendiente</option>
                            <option value="Pagado" <?php selected($service->payment_status, 'Pagado'); ?>>Pagado</option>
                            <option value="Cancelado" <?php selected($service->payment_status, 'Cancelado'); ?>>Cancelado</option> <!-- Mantener opción "Cancelado" -->
                            <option value="No Show" <?php selected($service->payment_status, 'No Show'); ?>>No Show</option> <!-- Añadir opción "No Show" -->
                        </select>
                    </td>
                </tr>
                <tr>
                    <th><label for="notes">Observaciones</label></th>
                    <td><textarea name="notes" id="notes" rows="4" class="regular-text"><?php 
                        echo esc_textarea($service->notes); 
                    ?></textarea></td>
                </tr>
            </table>
            <p class="submit">
                <input type="submit" name="update_service" class="button button-primary" value="Actualizar Servicio">
            </p>
        </form>
    </div>

    <script>
    function toggleEmailField() {
        var emailField = document.getElementById('client_email');
        var checkbox = document.getElementById('email_na');
        emailField.value = checkbox.checked ? 'N/A' : '';
        emailField.disabled = checkbox.checked;
    }

    // Ejecutar al cargar la página
    document.addEventListener('DOMContentLoaded', function() {
        toggleEmailField(); // Asegurarse de que el estado del campo de email sea correcto al cargar
    });
    </script>
    <?php
}

// Función para actualizar el estado de pago vía AJAX
add_action('wp_ajax_update_payment_status', 'transport_crm_update_payment_status');
function transport_crm_update_payment_status() {
    check_ajax_referer('update_payment_status', 'nonce');
    
    global $wpdb;
    $table_name = $wpdb->prefix . 'transport_services';
    
    $status = sanitize_text_field($_POST['status']);
    $service_id = intval($_POST['service_id']);
    
    $wpdb->update(
        $table_name,
        array('payment_status' => $status),
        array('id' => $service_id)
    );
    
    wp_send_json_success();
}

// Función para actualizar los valores existentes en la base de datos
function transport_crm_update_payment_status_values() {
    global $wpdb;
    $table_name = $wpdb->prefix . 'transport_services';
    
    // Actualizar valores existentes
    $wpdb->query("UPDATE $table_name SET payment_status = 'Pendiente' WHERE payment_status = 'pending'");
    $wpdb->query("UPDATE $table_name SET payment_status = 'Pagado' WHERE payment_status = 'paid'");
    $wpdb->query("UPDATE $table_name SET payment_status = 'Cancelado' WHERE payment_status = 'cancelled'");
}

// Ejecutar la actualización de valores
add_action('admin_init', 'transport_crm_update_payment_status_values');

// Función para actualizar los valores existentes en la base de datos
function transport_crm_update_service_values() {
    global $wpdb;
    $table_name = $wpdb->prefix . 'transport_services';
    
    // Actualizar tipos de servicio
    $wpdb->query("UPDATE $table_name SET service_type = 'Llegada' WHERE service_type = 'llegada'");
    $wpdb->query("UPDATE $table_name SET service_type = 'Salida' WHERE service_type = 'salida'");
    $wpdb->query("UPDATE $table_name SET service_type = 'Interhotel' WHERE service_type = 'interhotel'");
    $wpdb->query("UPDATE $table_name SET service_type = 'Tour Privado' WHERE service_type = 'tour_privado'");
    $wpdb->query("UPDATE $table_name SET service_type = 'Marina' WHERE service_type = 'marina'");
    
    // Actualizar tipos de vehículo
    $wpdb->query("UPDATE $table_name SET vehicle_type = 'Van' WHERE vehicle_type = 'van'");
    $wpdb->query("UPDATE $table_name SET vehicle_type = 'Sprinter' WHERE vehicle_type = 'sprinter'");
    $wpdb->query("UPDATE $table_name SET vehicle_type = 'Suburban' WHERE vehicle_type = 'suburban'");
    $wpdb->query("UPDATE $table_name SET vehicle_type = 'Toyota' WHERE vehicle_type = 'toyota'");
}

// Ejecutar la actualización de valores
add_action('admin_init', 'transport_crm_update_service_values');

// Agregar la acción AJAX
add_action('wp_ajax_export_services_excel', 'transport_crm_export_excel');

function transport_crm_export_excel() {
    global $wpdb;
    $table_name = $wpdb->prefix . 'transport_services';

    // Obtener parámetros de filtro
    $date_filter_type = isset($_GET['date_filter_type']) ? sanitize_text_field($_GET['date_filter_type']) : '';
    $filter_date = isset($_GET['filter_date']) ? sanitize_text_field($_GET['filter_date']) : '';
    $filter_month = isset($_GET['filter_month']) ? sanitize_text_field($_GET['filter_month']) : '';
    $filter_agency = isset($_GET['filter_agency']) ? sanitize_text_field($_GET['filter_agency']) : '';
    $filter_provider = isset($_GET['filter_provider']) ? sanitize_text_field($_GET['filter_provider']) : '';
    $filter_vehicle = isset($_GET['filter_vehicle']) ? sanitize_text_field($_GET['filter_vehicle']) : '';

    // Construir la consulta base
    $query = "SELECT * FROM $table_name WHERE 1=1";
    $query_params = array();

    if ($date_filter_type === 'month' && !empty($filter_month)) {
        $query .= " AND DATE_FORMAT(service_date, '%Y-%m') = %s";
        $query_params[] = $filter_month;
    } elseif (!empty($filter_date)) {
        $query .= " AND DATE(service_date) = %s";
        $query_params[] = $filter_date;
    }

    if (!empty($filter_agency)) {
        $query .= " AND agency LIKE %s";
        $query_params[] = '%' . $wpdb->esc_like($filter_agency) . '%';
    }

    if (!empty($filter_provider)) {
        $query .= " AND provider LIKE %s";
        $query_params[] = '%' . $wpdb->esc_like($filter_provider) . '%';
    }

    if (!empty($filter_vehicle)) {
        $query .= " AND vehicle_type = %s";
        $query_params[] = $filter_vehicle;
    }

    // Obtener los servicios filtrados
    $services = $wpdb->get_results($wpdb->prepare($query, $query_params));

    // Configurar encabezados para la descarga de CSV
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="servicios_transportes.csv"');

    // Crear un puntero para el archivo CSV
    $output = fopen('php://output', 'w');

    // Imprimir encabezados de la tabla
    fputcsv($output, [
        "Fecha", "Nombre", "PAX", "Hora (24H)", "Lugar", "Destino", 
        "Agencia", "Proveedor", "Servicio", "Tipo de Unidad", 
        "Balance MXN", "Balance USD", "Reporte (MXN)", 
        "Reporte Proveedor", "Estatus de Pago", "Observaciones"
    ]);

    // Inicializar totales
    $total_mxn = 0;
    $total_usd = 0;
    $total_report = 0;
    $total_report_provider = 0;

    // Imprimir los datos de los servicios
    foreach ($services as $service) {
        fputcsv($output, [
            date('d/m/Y', strtotime($service->service_date)), // Fecha
            $service->client_name, // Nombre
            $service->passengers, // PAX
            date('H:i', strtotime($service->service_date)), // Hora (24H)
            $service->pickup_location, // Lugar
            $service->destination, // Destino
            $service->agency, // Agencia
            $service->provider, // Proveedor
            $service->service_type, // Servicio
            $service->vehicle_type, // Tipo de Unidad
            ($service->balance_currency === 'MXN' ? number_format($service->balance, 2) : ''), // Balance MXN
            ($service->balance_currency === 'USD' ? number_format($service->balance, 2) : ''), // Balance USD
            number_format($service->report_amount, 2), // Reporte (MXN)
            number_format($service->report_provider_amount, 2), // Reporte Proveedor
            $service->payment_status, // Estatus de Pago (incluye "Cancelado" y "No Show")
            $service->notes // Observaciones
        ]);

        // Sumar totales
        if ($service->balance_currency === 'MXN') {
            $total_mxn += $service->balance;
        } else {
            $total_usd += $service->balance;
        }
        $total_report += $service->report_amount;
        $total_report_provider += $service->report_provider_amount;
    }

    // Imprimir fila de totales
    fputcsv($output, [
        "Totales", "", "", "", "", "", "", "", "", "", 
        number_format($total_mxn, 2), 
        number_format($total_usd, 2), 
        number_format($total_report, 2), 
        number_format($total_report_provider, 2), 
        "", ""
    ]);

    fclose($output);
    exit;
}

// Agregar la acción AJAX para el PDF individual
add_action('wp_ajax_download_service_pdf', 'transport_crm_download_service_pdf');

function transport_crm_download_service_pdf() {
    if (!current_user_can('manage_options')) {
        wp_die('No tienes permisos para realizar esta acción.');
    }

    $service_id = isset($_GET['service_id']) ? intval($_GET['service_id']) : 0;
    
    global $wpdb;
    $table_name = $wpdb->prefix . 'transport_services';
    $service = $wpdb->get_row($wpdb->prepare("SELECT * FROM $table_name WHERE id = %d", $service_id));

    if (!$service) {
        wp_die('Servicio no encontrado.');
    }

    // Iniciar el buffer de salida
    ob_start();
    ?>
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Servicio #<?php echo $service->id; ?></title>
        <style>
            body { font-family: Arial, sans-serif; }
        </style>
    </head>
    <body>
        <h1>Detalles del Servicio #<?php echo $service->id; ?></h1>
        
        <h3>Información del Cliente</h3>
        <p>
            <strong>Nombre:</strong> <?php echo $service->client_name; ?><br>
            <strong>Teléfono:</strong> <?php echo $service->client_phone; ?><br>
            <strong>Email:</strong> <?php echo $service->client_email ? esc_html($service->client_email) : 'N/A'; ?><br> <!-- Mostrar N/A si el email es N/A -->
        </p>

        <h3>Detalles del Servicio</h3>
        <p>
            <strong>Fecha:</strong> <?php echo date('d/m/Y', strtotime($service->service_date)); ?><br>
            <strong>Hora:</strong> <?php echo date('H:i', strtotime($service->service_date)); ?><br>
            <strong>Tipo de Servicio:</strong> <?php echo $service->service_type; ?><br>
            <strong>Tipo de Viaje:</strong> <?php echo $service->trip_type === 'round_trip' ? 'Round Trip' : 'One Way'; ?><br>
            <strong>Pasajeros:</strong> <?php echo $service->passengers; ?><br>
            <strong>Unidad:</strong> <?php echo $service->vehicle_type; ?>
        </p>

        <h3>Ubicaciones</h3>
        <p>
            <strong>Lugar de Recogida:</strong> <?php echo $service->pickup_location; ?><br>
            <?php if ($service->pickup_location_url): ?>
                <strong>Mapa de Recogida:</strong> <?php echo $service->pickup_location_url; ?><br>
            <?php endif; ?>
            <strong>Destino:</strong> <?php echo $service->destination; ?><br>
            <?php if ($service->destination_url): ?>
                <strong>Mapa de Destino:</strong> <?php echo $service->destination_url; ?>
            <?php endif; ?>
        </p>

        <?php if ($service->trip_type === 'round_trip' && $service->return_pickup_time): ?>
            <p>
                <strong>Hora de Regreso:</strong> <?php echo $service->return_pickup_time; ?>
            </p>
        <?php endif; ?>

        <h3>Información de Pago</h3>
        <p>
            <strong>Balance:</strong> <?php echo $service->balance . ' ' . $service->balance_currency; ?><br>
            <strong>Reporte:</strong> <?php echo $service->report_amount; ?> MXN<br>
            <strong>Estado de Pago:</strong> <?php echo $service->payment_status; ?>
        </p>

        <?php if ($service->notes): ?>
            <h3>Observaciones</h3>
            <p><?php echo nl2br($service->notes); ?></p>
        <?php endif; ?>

        <strong>Reporte Proveedor:</strong> <?php echo $service->report_provider_amount; ?><br> <!-- Mostrar Reporte Proveedor en PDF -->
    </body>
    </html>
    <?php
    
    $html = ob_get_clean();

    // Enviar cabeceras para PDF
    header('Content-Type: application/pdf');
    header('Content-Disposition: attachment; filename="servicio_' . $service->id . '.pdf"');

    // Convertir HTML a PDF usando el navegador
    echo $html;
    exit;
}

// Agregar la acción AJAX para la vista de impresión
add_action('wp_ajax_print_service', 'transport_crm_print_service');

function transport_crm_print_service() {
    if (!current_user_can('manage_options')) {
        wp_die('No tienes permisos para realizar esta acción.');
    }

    $service_id = isset($_GET['service_id']) ? intval($_GET['service_id']) : 0;
    
    global $wpdb;
    $table_name = $wpdb->prefix . 'transport_services';
    $service = $wpdb->get_row($wpdb->prepare("SELECT * FROM $table_name WHERE id = %d", $service_id));

    if (!$service) {
        wp_die('Servicio no encontrado.');
    }

    ?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Detalles del Servicio</title>
    <style>
        :root {
            --primary: #000000;
            --secondary: #333333;
            --accent: #2d6df6;
            --light-bg: #f8f9fa;
            --border: #e0e0e0;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            color: var(--secondary);
            font-size: 13px;
            line-height: 1.5;
            background: white;
        }

        .voucher-container {
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 0px 24px 0px 24px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }

        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 24px;
            border-bottom: 1px solid var(--border);
        }

        .logo {
            height: 92px;
        }

        .booking-reference {
            text-align: right;
        }

        .booking-reference .label {
            font-size: 11px;
            color: var(--secondary);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .booking-reference .code {
            font-size: 20px;
            font-weight: 600;
            color: var(--primary);
            letter-spacing: 1px;
        }

        .trip-details {
            background: var(--light-bg);
            border-radius: 8px;
            padding: 12px;
            margin-bottom: 24px;
        }

        .trip-route {
            display: flex;
            align-items: center;
            gap: 16px;
            margin-bottom: 16px;
        }

        .location-point {
            position: relative;
            padding-left: 24px;
        }

        .location-point::before {
            content: '';
            position: absolute;
            left: 0;
            top: 50%;
            transform: translateY(-50%);
            width: 12px;
            height: 12px;
            border-radius: 50%;
        }

        .pickup::before {
            background: var(--accent);
        }

        .dropoff::before {
            background: var(--primary);
        }

        .info-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
            margin: 24px 0;
        }

        .info-card {
            background: white;
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 12px;
        }

        .card-title {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 12px;
            color: var(--accent);
        }

        .card-title .secondary {
            color: #6c757d;
            font-size: 12px;
            font-weight: normal;
            &::before {
                content: '/';
                margin: 0 4px;
                color: #d1d1d1;
            }
        }

        .notes-section {
            margin-top: 24px;
            padding: 12px;
            background: #f8f9fa;
            border-radius: 8px;
        }

        .info-label {
            display: flex;
            align-items: center;
            gap: 4px;
            color: var(--secondary);
            font-size: 12px;
        }

        .label-primary {
            font-weight: 800;
            color: var(--primary);
        }

        .label-secondary {
            color: #6c757d;
            font-size: 11px;
            &::before {
                content: '/';
                margin: 0 4px;
                color: #d1d1d1;
            }
        }

        .info-value {
            font-weight: 200;
            color: var(--primary);
        }

        .divider {
            height: 1px;
            background: var(--border);
            margin: 16px 0;
        }

        .print-button {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: var(--accent);
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-weight: 500;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 8px;
            box-shadow: 0 2px 8px rgba(45, 109, 246, 0.2);
            transition: all 0.2s ease;
        }

        .print-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(45, 109, 246, 0.3);
        }

        .print-button svg {
            width: 18px;
            height: 18px;
        }

        .additional-info {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 24px;
            font-size: 11px;
            line-height: 1.4;
            margin-top: 24px;
            padding-top: 24px;
            border-top: 1px solid var(--border);
        }

        .info-block {
            background: var(--light-bg);
            border-radius: 8px;
            padding: 16px;
        }

        .info-block h4 {
            color: var(--accent);
            margin: 0 0 12px 0;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .info-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 0;
            border-bottom: 1px solid var(--border);
        }

        .info-row:last-child {
            border-bottom: none;
        }

        @media print {
            body {
                padding: 0;
            }
            .voucher-container {
                border: none;
                box-shadow: none;
            }
            .print-button {
                display: none;
            }
        }

        .policy-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
            font-size: 10px;
            line-height: 1.3;
            margin-top: 20px;
        }

        .policy-card {
            background: var(--light-bg);
            border-radius: 6px;
            padding: 12px;
        }

        .policy-title {
            color: var(--accent);
            font-size: 11px;
            font-weight: 600;
            margin-bottom: 8px;
            display: flex;
            align-items: center;
            gap: 4px;
        }

        .policy-title svg {
            width: 14px;
            height: 14px;
            fill: currentColor;
        }

        .policy-list {
            margin: 0;
            padding: 0;
            list-style: none;
        }

        .policy-list li {
            display: flex;
            justify-content: space-between;
            padding: 4px 0;
            border-bottom: 1px solid rgba(0,0,0,0.05);
        }

        .policy-list li:last-child {
            border-bottom: none;
        }

        .policy-label {
            font-weight: 500;
            color: var(--primary);
        }

        .policy-value {
            color: var(--secondary);
        }

        .contact-info {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
            margin-top: 8px;
        }

        .contact-item {
            display: flex;
            align-items: center;
            gap: 4px;
        }

        .footer-info {
            margin-top: 20px;
            padding-top: 12px;
            border-top: 1px solid var(--border);
            color: #6c757d;
            font-size: 9px;
            font-style: italic;
            text-align: center;
            line-height: 1.3;
        }
    </style>
</head>
<body>
    <button class="print-button" onclick="window.print()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/>
            <path d="M6 14h12v8H6v-8z"/>
        </svg>
        Imprimir / Print
    </button>

    <div class="voucher-container">
        <div class="header" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; border-bottom: 2px solid #e0e0e0; padding: 15px 0;">
            <img src="https://exclusiveontrip.com/logo.png" alt="Logo" class="logo" style="height: 80px;">

            <div style="flex-grow: 1; text-align: left; font-size: 11px; color: #333;margin-left: 30px;">
            <svg viewBox="0 0 24 24" width="12" height="12" style="margin-right: 4px;">
                    <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                </svg>
                exclusiveontrip@gmail.com<br/>
                <svg viewBox="0 0 24 24" width="12" height="12" style="margin-right: 4px;">
                    <path d="M20 15.5c-1.25 0-2.45-.2-3.57-.57a1 1 0 0 0-1.02.24l-2.2 2.2a15.045 15.045 0 0 1-6.59-6.59l2.2-2.21a.96.96 0 0 0 .25-1A11.36 11.36 0 0 1 8.5 4c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1 0 9.39 7.61 17 17 17 .55 0 1-.45 1-1v-3.5c0-.55-.45-1-1-1zM19 12h2a9 9 0 0 0-9-9v2c3.87 0 7 3.13 7 7z"/>
                </svg>
                +529983482030                
            </div>

            <div class="booking-reference" style="flex-grow: 1; text-align: right; display: flex; flex-direction: column; align-items: flex-end;">
                <div style="display: flex; align-items: center; margin-bottom: 0;">
                    <div style="font-weight: 800; font-size: 22px; color: <?php echo ($service->balance_currency === 'MXN') ? '#28a745' : '#007bff'; ?>;">
                        <?php echo number_format($service->balance, 2) . ' ' . esc_html($service->balance_currency); ?>
                    </div>
                </div>

                <div style="display: flex; align-items: center; margin-bottom: 0;">
                    <div class="label" style="font-weight: 800; margin-right: 10px; font-size: 11px;">FECHA / DATE:</div>
                    <div style="font-weight: 200; font-size: 11px;"><?php echo date('d M Y', strtotime($service->service_date)); ?></div>
                </div>

                <div style="display: flex; align-items: center;">
                    <div class="label" style="font-weight: 800; margin-right: 10px; font-size: 11px;">BOOKING REFERENCE:</div>
                    <div style="font-weight: 200; font-size: 11px;">SRV<?php echo $service->id; ?></div>
                </div>

                <div class="voucher-status" style="background-color: <?php echo ($service->payment_status === 'Pagado') ? '#28a745' : (($service->payment_status === 'Pendiente') ? '#ffc107' : '#dc3545'); ?>; border-radius: 4px; padding: 5px; color: white; font-weight: 800; text-align: center; display: inline-block; margin-top: 10px; font-size: 12px;">
                    <?php echo esc_html($service->payment_status); ?> <!-- Estado del voucher -->
                </div>
            </div>
        </div>

        <div class="trip-details">
            <div class="trip-route">
                <div class="location-point pickup">
                    <div class="info-label">
                        <span class="label-primary">Pickup</span>
                        <span class="label-secondary">Punto de Recogida</span>
                    </div>
                    <div class="info-value"><?php echo esc_html($service->pickup_location); ?></div>
                    <?php if ($service->pickup_location_url): ?>
                        <a href="<?php echo esc_url($service->pickup_location_url); ?>" target="_blank" style="color: #0073aa; text-decoration: underline;">Ver mapa</a>
                    <?php endif; ?>
                </div>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" stroke-width="2"/>
                </svg>
                <div class="location-point dropoff">
                    <div class="info-label">
                        <span class="label-primary">Dropoff</span>
                        <span class="label-secondary">Punto de Destino</span>
                    </div>
                    <div class="info-value"><?php echo esc_html($service->destination); ?></div>
                    <?php if ($service->destination_url): ?>
                        <a href="<?php echo esc_url($service->destination_url); ?>" target="_blank" style="color: #0073aa; text-decoration: underline;">Ver mapa</a>
                    <?php endif; ?>
                </div>
            </div>
        </div>

        <div class="info-grid">
            <div class="info-card">
                <div class="card-title">
                    <span class="label-primary">Passenger Details</span>
                    <span class="secondary">Detalles del Pasajero</span>
                </div>
                <div class="info-row">
                    <span class="info-label">
                        <span class="label-primary">Name</span>
                        <span class="label-secondary">Nombre</span>
                    </span>
                    <span class="info-value"><?php echo esc_html($service->client_name); ?></span>
                </div>
                <div class="info-row">
                    <span class="info-label">
                        <span class="label-primary">Phone</span>
                        <span class="label-secondary">Teléfono</span>
                    </span>
                    <span class="info-value"><?php echo esc_html($service->client_phone); ?></span>
                </div>
                <div class="info-row">
                    <span class="info-label">
                        <span class="label-primary">Email</span>
                        <span class="label-secondary">Correo</span>
                    </span>
                    <span class="info-value"><?php echo esc_html($service->client_email); ?></span>
                </div>
            </div>

            <div class="info-card">
                <div class="card-title">
                    <span class="label-primary">Service Details</span>
                    <span class="secondary">Detalles del Servicio</span>
                </div>
                <div class="info-row">
                    <span class="info-label">
                        <span class="label-primary">Date & Time</span>
                        <span class="label-secondary">Fecha y Hora</span>
                    </span>
                    <span class="info-value"><?php echo date('d M Y, H:i', strtotime($service->service_date)); ?></span>
                </div>
                <div class="info-row">
                    <span class="info-label">
                        <span class="label-primary">Vehicle</span>
                        <span class="label-secondary">Vehículo</span>
                    </span>
                    <span class="info-value"><?php echo esc_html($service->vehicle_type); ?></span>
                </div>
                <div class="info-row">
                    <span class="info-label">
                        <span class="label-primary">Passengers</span>
                        <span class="label-secondary">Pasajeros</span>
                    </span>
                    <span class="info-value"><?php echo esc_html($service->passengers); ?> pax</span>
                </div>
            </div>
        </div>

        <div class="notes-section">
            <div class="card-title">
                <span class="label-primary">Notes</span>
                <span class="secondary">Observaciones</span>
            </div>
            <div class="info-value">
                <?php echo nl2br(esc_html($service->notes)); ?>
            </div>
        </div>

        <div class="policy-grid">
            <div class="policy-card">
                <div class="policy-title">
                    <svg viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                    </svg>
                    Información del Servicio / Service Information
                </div>
                <ul class="policy-list">
                    <li>
                        <span>Internacional / International</span><br>
                        <span>1h 20min después del aterrizaje / after landing</span>
                    </li>
                    <li>
                        <span>Nacional / Domestic</span><br>
                        <span>50min después del aterrizaje / after landing</span>
                    </li>
                    <li>
                        <span>Salidas / Departures</span><br>
                        <span>15min máximo / maximum</span>
                    </li>
                    <li>
                        <span>Servicio / Service</span><br>
                        <span>Privado / Private</span>
                    </li>
                    <li>
                        <span>Disponibilidad / Availability</span><br>
                        <span>24/7</span>
                    </li>
                </ul>
                
                <div class="policy-title" style="margin-top: 12px;">
                    <svg viewBox="0 0 24 24">
                        <path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 2h6v6h-6V4zM6 4h5v6H6V4zm0 7h12v9H6v-9z"/>
                    </svg>
                    Capacidad de Vehículos / Vehicle Capacity
                </div>
                <ul class="policy-list">
                    <li>
                        <span>VAN</span>
                        <span>Con equipaje / With luggage: 10 pax</span>
                    </li>
                    <li>
                        <span></span>
                        <span>Sin equipaje / No luggage: 12 pax</span>
                    </li>
                    <li>
                        <span>SUBURBAN</span>
                        <span>Con equipaje / With luggage: 4 pax</span>
                    </li>
                    <li>
                        <span></span>
                        <span>Sin equipaje / No luggage: 6 pax</span>
                    </li>
                    <li>
                        <span>CRAFTER</span>
                        <span>Con equipaje / With luggage: 17 pax</span>
                    </li>
                    <li>
                        <span></span>
                        <span>Sin equipaje / No luggage: 20 pax</span>
                    </li>
                </ul>
            </div>

            <div class="policy-card">
                <div class="policy-title">
                    <svg viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                    </svg>
                    Instrucciones y Políticas / Instructions & Policies
                </div>
                <ul class="policy-list">
                    <li>
                        <span>Área de salida<br />Exit area</span>
                        <span>"Agencias y precontratados"<br />"Agencies and pre-booked"</span>
                    </li>
                    <p><strong>Punto de encuentro / Meeting point</strong></p>
                    <li>
                        <span>T2 & T4</span>
                        <span>Welcome bar</span>
                    </li>
                    <li>
                        <span>T3</span>
                        <span>Margarita ville</span>
                    </li>
                </ul>
                <div class="driver-info" style="font-style: italic;">
                        Nuestro conductor, debidamente uniformado, estará afuera portando un banner con su nombre. Él le indicará cuál vehículo abordar para llevarlo a su destino.
                    </p>
                        Our driver, properly uniformed, will be waiting outside holding a banner with your name. They will guide you to the vehicle that will take you to your destination.
                    </p>
                </div>
                <div class="policy-title" style="margin-top: 12px;">
                    <svg viewBox="0 0 24 24">
                        <path d="M13 7h-2v4H7v2h4v4h2v-4h4v-2h-4V7zm-1-5C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
                    </svg>
                    Políticas de Cancelación / Cancellation Policies
                </div>
                <ul class="policy-list">
                    <li>
                        <span>No show</span>
                        <span>100% cargo / 100% charge</span>
                    </li>
                    <li>
                        <span>Cambios / Changes</span>
                        <span>24h antes sin cargo / 24h before no charge</span>
                    </li>
                    <li>
                        <span>Drop off adicional / Additional</span>
                        <span>$200 MXN</span>
                    </li>
                    <li>
                        <span class="small-text">Revisar unidad al finalizar / Check vehicle when finishing</span>
                        <span class="small-text">No responsable por objetos olvidados / Not responsible for forgotten items</span>
                    </li>
                </ul>
            </div>
        </div>
    </div>

    <script>
        window.onload = function() {
            setTimeout(function() {
                window.print();
            }, 500);
        };
    </script>
</body>
</html>
    <?php
    exit;
}
