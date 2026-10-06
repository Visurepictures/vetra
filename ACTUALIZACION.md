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

## IA: integración pendiente
La revisión actual usa reglas deterministas locales y lo declara explícitamente. No se envían datos a un modelo.

Para una IA personalizada real:
1. Servicio privado con autenticación y datos separados por usuario; políticas de acceso verificadas.
2. Endpoint del servidor con clave del proveedor protegida, límites de uso y presupuesto. Nunca incluir claves en GitHub Pages.
3. Enviar solo los datos necesarios del trabajo, con consentimiento claro; excluir identificadores fiscales y contactos por defecto.
4. El modelo propone actividades, horas y preguntas en una estructura validada. La fórmula de Vetra sigue calculando los importes.
5. Mostrar supuestos y cambios propuestos; el usuario confirma antes de cambiar, guardar o compartir una propuesta.
6. Revisar privacidad, retención, eliminación, costos y pruebas de aislamiento antes de activar la función.

La elección del proveedor, alojamiento privado, cuentas y presupuesto debe concretarse antes de activar una integración externa. GitHub Pages solo aloja la aplicación estática actual.
