export enum TicketStatus {
  ACTIVE = 'ACTIVE',
  PAID = 'PAID', // Cuando el ticket ha sido pagado pero aún no se ha completado
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED' // Cuando cliente llega a la salida y se completa el ticket
}