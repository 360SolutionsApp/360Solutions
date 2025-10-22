/* eslint-disable prettier/prettier */
// src/utils/date.utils.ts

/**
 * Convierte un string de fecha ISO (YYYY-MM-DD) a formato de texto (MMM DD YYYY).
 * Ejemplo: '2025-10-20' -> 'Oct 20 2025'
 * @param dateString La fecha en formato string (ej: '2025-10-20').
 * @returns La fecha formateada como texto (ej: 'Oct 20 2025').
 */
export function formatToTextDate(dateString: string): string {
  if (!dateString) {
    return '';
  }

  // 1. Opciones para mes abreviado, día y año.
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  };

  // 2. Crear objeto Date y formatear usando 'en-US' para las abreviaciones.
  const dateObject = new Date(dateString);
  const formatted = dateObject.toLocaleDateString('en-US', options);

  // 3. Eliminar la coma común en el formato en-US y devolver.
  return formatted.replace(',', '');
}