# Vetra: cálculo, guardado y experiencia

## Implementado
- Presupuesto guiado en cuatro pasos, con borrador local y confirmación de guardado.
- Dos formas de precio: tarifa de venta elegida o referencia basada en costos propios.
- Costos mensuales y reservas divididos entre horas facturables; sin valores personales inventados.
- En modo costos: precio base = costos del proyecto / (1 - impuestos - comisiones - margen). Urgencia y descuento se aplican al precio y se muestra su efecto real sobre el resultado.
- En modo tarifa: horas por tarifa más gastos; no se agrega margen automáticamente. Rentabilidad pendiente si los costos no están confirmados.
- Impuestos y comisiones dentro de ajustes opcionales, con explicación y sin tasa preasignada para nuevos perfiles. Los valores existentes se conservan.
- Versiones anteriores del cálculo preservadas hasta una actualización explícita del presupuesto.
- Guardado atómico del workspace, bloqueo ante datos corruptos, errores visibles e importación/exportación de backup validado.
- Clientes con alta breve, importes contratados separados de pagos registrados y actividad separada de contacto.
- Anexos locales, vistas de documentos y PDF separado del pie del sitio.
- Landing compacta, contraste oscuro, navegación uniforme y selector de fecha/hora accesible.

## Verificación
Pruebas automatizadas de cálculos, migración, fechas, importación, pagos y almacenamiento; lint y build. Recorrido local con datos ficticios: perfil, presupuesto, descuento, guardar, recargar, documento, pago y visualización móvil. La vista previa del documento fue revisada; el resultado de impresión depende también del navegador y sus opciones.

## IA local gratuita
Asistente opcional en el editor: WebLLM y Qwen 2.5 1.5B ejecutados en el dispositivo. Propone etapas entre una lista de actividades profesionales y preguntas sobre información que falta con una descripción y contexto mínimo del presupuesto. Las horas empiezan en cero para evitar estimaciones inventadas. El usuario informa las horas, selecciona actividades y define la tarifa antes de añadirlas. No sustituye las actividades existentes ni modifica impuestos, margen, cliente o documentos.

Se activa y descarga únicamente a petición del usuario. La primera carga descarga aproximadamente 1 GB desde Hugging Face/MLC; requiere WebGPU, memoria y conexión. El texto se procesa localmente. Usa energía y memoria, pero no cobra API ni suscripción. Cancela y libera el worker al cerrar, salir del editor o por inactividad. Presenta errores de compatibilidad y carga sin afectar el presupuesto. Las sugerencias son estimaciones que requieren revisión.

La revisión por reglas sigue disponible en cualquier navegador. No hay sincronización de cuentas ni IA en la nube. La interfaz declara los límites del modelo y la descarga antes de activarlo.

Referencias: https://webllm.mlc.ai/docs/user/advanced_usage.html y https://webllm.mlc.ai/docs/user/basic_usage.html

## Posible integración en la nube
Requeriría servidor privado, autenticación, aislamiento por usuario, clave protegida, consentimiento para envío de datos y presupuesto definido. La integración gratuita actual no depende de ese servidor.
