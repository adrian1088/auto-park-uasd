import { Column, ManyToOne, Entity, OneToMany } from 'typeorm';
import { AuditEntity } from '../../../shared/base/audit.entity';
import { VehicleType } from '../enum/vihicle-type.enum';
import { User } from '../../users/entities/users.entity';
import { Ticket } from '../../tickets/entities/ticket.entity';
import { Reservation } from '../../reservations/entities/reservation.entity';

@Entity({ name: 'vehicles', comment: 'Vehicles table' })
export class Vehicle extends AuditEntity {
    @Column({type: 'varchar', length: 20, comment: 'Plate number of the vehicle'})
    plateNumber: string;

    @Column({type: 'varchar', length: 255, comment: 'Make of the vehicle'})
    make: string;

    @Column({type: 'varchar', length: 255, comment: 'Model of the vehicle'})
    model: string;

    @Column({type: 'varchar', length: 30, comment: 'Color of the vehicle'})
    color: string;

    @Column({
        type: 'enum',
        enum: VehicleType,
        comment: 'Type of the vehicle'
    })
    type: VehicleType;

    @Column({type: 'varchar', length: 255, comment: 'Owner name of the vehicle'})
    ownerName: string;

    @ManyToOne(() => User, (user) => user.vehicles)
    user: User; // Muchos vehículos pueden pertenecer a un solo usuario

    @OneToMany(() => Ticket, (ticket) => ticket.vehicle)
    tickets: Ticket[];

    @OneToMany(() => Reservation, (reservation) => reservation.vehicle)
    reservations: Reservation[];
}
