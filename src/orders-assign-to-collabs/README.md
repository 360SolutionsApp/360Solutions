Ejemplos completos listos para usar en Postman
▶ A. Solo paginación
GET https://api.miapp.com/invoices/findAll?page=1&limit=10

▶ B. Búsqueda (search)
GET https://api.miapp.com/invoices/findAll?search=ACME

▶ C. Filtro por estado
GET https://api.miapp.com/invoices/findAll?filters[status]=FINISHED

▶ D. Filtro por hora de inicio
GET https://api.miapp.com/invoices/findAll?filters[hourStart]=08:00

▶ E. Filtro por fecha inicial
GET https://api.miapp.com/invoices/findAll?filters[startDate]=2025-10-01

▶ F. Filtro por fecha final
GET https://api.miapp.com/invoices/findAll?filters[endDate]=2025-10-31

▶ G. Rango de fechas (startDate + endDate)
GET https://api.miapp.com/invoices/findAll?filters[startDate]=2025-10-01&filters[endDate]=2025-10-31

▶ H. Combinación completa (con paginado, search y todos los filtros)

Útil para pruebas completas:

GET https://api.miapp.com/invoices/findAll?page=1&limit=10&search=Carlos&sortField=createdAt&orderBy=desc&filters[status]=FINISHED&filters[hourStart]=07:00&filters[startDate]=2025-10-01&filters[endDate]=2025-10-31

▶ I. Sin paginación (devuelve todos los registros)
GET https://api.miapp.com/invoices/findAll?search=ACME&filters[status]=PENDING