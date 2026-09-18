import { Module, Global } from '@nestjs/common';
import { BaseEntity } from './base/base-entity';

@Global() 
@Module({
    providers: [
        BaseEntity
    ],
    exports: [
        BaseEntity
    ]
})
export class SharedModule {}
