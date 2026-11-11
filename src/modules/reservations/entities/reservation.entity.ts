import { Column, Entity, ManyToOne, OneToOne } from 'typeorm';
import { AuditEntity } from '../../../shared/base/audit.entity';
import { UserEntity } from '../../users/entities/users.entity';
import { ParkingSpace } from '../../parking/entities/parking-space.entity';
import { VehicleEntity } from '../../vehicles/entities/vehicle.entity';
import { TicketEntity } from '../../tickets/entities/ticket.entity';

@Entity({ name: 'reservations', comment: 'Reservations table' })
export class ReservationEntity extends AuditEntity {
  @Column({ type: 'timestamp', comment: 'Start time of the reservation' })
  startTime: Date;

  @Column({ type: 'timestamp', comment: 'End time of the reservation' })
  endTime: Date; //El final del tiempo que debe llegar el cliente para que su reserva sea válida. Después de este tiempo, la reserva se considera caducada y no válida.

  @Column({ type: 'int', nullable: true, comment: 'User ID' })
  userId: number | null; // Necesito que este usuario no sea el mismo que el del vehículo,
                         // Es necesario tener el userId del usuario que esta loggeado 
                         // y hace la reserva, y el userId del dueño del vehículo que puede ser de otro usuario. 
                         // Es decir necesito dos userId, uno del usuario que hace la reserva y otro del dueño del vehículo.
                         // Creo que lo mejor seria no incluir los suscriptores ni reservas en UserId de empleados.


  @Column({ type: 'varchar', length: 20, nullable: true, comment: 'Vehicle ID' })
  PlateNumber: string | null; // En caso de que el cliente no sepa su matricula se deja null,
                                     // pero si la sabe se guarda para poder validar que tipo de parqueo 
                                     // se le podria asignar, segun el tipo de vehiculo que tenga. Esto esta relacionado con Vehiculo es decir verificara si es carro, camioneta etc.

    @Column({ type: 'int', nullable: false, comment: 'Parking space ID' })
  parkingSpaceId: number;         
                                     
  @Column({ type: 'varchar', unique: true, comment: 'Unique token encoded in the QR code for validation' })
  qrCode: string;

  @Column({ type: 'varchar', comment: 'Email address where the QR code and reservation info are sent' })
  guestEmail: string;

  @Column({ type: 'boolean', default: false, comment: 'Status of the QR email notification' })
  emailSent: boolean;

  // Relaciones

  // Mucho a uno:
  // Muchas reservas pueden ser hechas por un solo usuario
  @ManyToOne(() => UserEntity, (user) => user.reservations)
  user: UserEntity | null;

  // Mucho a uno:
  // Muchos espacios de estacionamiento pueden tener muchas reservas
  @ManyToOne(() => ParkingSpace, (parkingSpace) => parkingSpace.reservations)
  parkingSpace: ParkingSpace;

  @OneToOne(() => TicketEntity, (ticket) => ticket.reservation)
  ticket: TicketEntity | null;

  @ManyToOne(() => VehicleEntity, (vehicle) => vehicle.reservations, { nullable: true })
  vehicle: VehicleEntity | null;
  }