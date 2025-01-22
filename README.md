# Service Receipt Plugin

Este plugin genera un comprobante profesional y detallado de servicio, ideal para empresas de transporte, turismo y servicios relacionados. Presenta la información clave de forma clara y ordenada, con opciones para personalización e impresión.

## Características principales

- **Diseño profesional**: Layout moderno y limpio con colores configurables.
- **Detalles estructurados**: Información del pasajero, punto de recogida, destino, y referencia de reserva.
- **Botón de impresión**: Genera un comprobante optimizado para papel.
- **Compatibilidad responsiva**: Funciona bien en dispositivos móviles y de escritorio.
- **Soporte multi-idioma**: Configurado en español e inglés.

## Cómo usar este plugin

1. **Descarga e instala los archivos**:
   - Copia los archivos HTML, CSS y JS del proyecto en tu directorio.
   - Asegúrate de que el diseño esté conectado a tu backend para recibir datos dinámicos.

2. **Integra el código HTML en tu proyecto**:
   Coloca el siguiente fragmento en el archivo donde deseas mostrar el comprobante:

   ```html
   <div class="receipt-container">
       <div class="info-card">
           <h2>Comprobante de Servicio</h2>
           <p><strong>Referencia:</strong> #12345</p>
           <p><strong>Recogida:</strong> Aeropuerto Internacional</p>
           <p><strong>Destino:</strong> Hotel XYZ</p>
           <p><strong>Pasajero:</strong> John Doe</p>
       </div>
       <button id="print-btn">Imprimir</button>
   </div>
   ```

3. **Agrega el estilo CSS**:
   Copia y pega el siguiente CSS en tu archivo de estilos:

   ```css
   .receipt-container {
       max-width: 600px;
       margin: 20px auto;
       padding: 20px;
       border: 1px solid #ddd;
       border-radius: 10px;
       box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
       font-family: Arial, sans-serif;
       background-color: #f9f9f9;
   }

   .info-card {
       margin-bottom: 20px;
   }

   #print-btn {
       display: block;
       margin: 0 auto;
       padding: 10px 20px;
       background-color: #007bff;
       color: white;
       border: none;
       border-radius: 5px;
       cursor: pointer;
   }

   #print-btn:hover {
       background-color: #0056b3;
   }

   @media print {
       #print-btn {
           display: none;
       }
   }
   ```

4. **Agrega la funcionalidad con JavaScript**:
   Incluye este código en un archivo JS o en tu archivo HTML:

   ```javascript
   document.getElementById('print-btn').addEventListener('click', function () {
       window.print();
   });
   ```

5. **Configuración de backend**:
   Asegúrate de que los datos como referencia, recogida, destino y pasajero se pasen dinámicamente desde tu backend. Ejemplo en PHP:

   ```php
   echo "<p><strong>Referencia:</strong> " . $service->id . "</p>";
   echo "<p><strong>Recogida:</strong> " . $service->pickup_location . "</p>";
   echo "<p><strong>Destino:</strong> " . $service->destination . "</p>";
   echo "<p><strong>Pasajero:</strong> " . $service->passenger_name . "</p>";
   ```

## Personalización

- Cambia los colores y estilos editando las variables CSS.
- Agrega más campos al comprobante según sea necesario.
- Traducir etiquetas según el idioma deseado.

## Contribuciones

Si deseas contribuir a este proyecto:

1. Haz un fork del repositorio.
2. Crea una nueva rama: `git checkout -b feature/nueva-funcion`.
3. Haz commit de tus cambios: `git commit -m 'Agrega una nueva función'`.
4. Sube tus cambios: `git push origin feature/nueva-funcion`.
5. Crea un Pull Request.

## Licencia

Este proyecto está bajo la licencia MIT. Puedes usarlo y modificarlo libremente para tus propios proyectos.
