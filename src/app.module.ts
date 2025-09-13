import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { DocumentTypesModule } from './document-types/document-types.module';
import { AuthModule } from './auth/auth.module';
import { AssignmentsModule } from './assignments/assignments.module';
import { ClientsModule } from './clients/clients.module';
import { WorkOrdersModule } from './work-orders/work-orders.module';
import { ContractsModule } from './contracts/contracts.module';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    RolesModule,
    DocumentTypesModule,
    AssignmentsModule,
    ClientsModule,
    WorkOrdersModule,
    ContractsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
