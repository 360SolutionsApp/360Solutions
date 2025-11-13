/* eslint-disable prettier/prettier */
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
import { OrdersAssignToCollabsModule } from './orders-assign-to-collabs/orders-assign-to-collabs.module';
import { CheckInCheckOutModule } from './check-in-check-out/check-in-check-out.module';
import { ZohoMailModule } from './mailer/zoho-mailer.module';
import { MailerController } from './mailer/zoho-mailer.controller';
import { WorkOrderAcceptModule } from './work-order-accept/work-order-accept.module';
import { InvoicesModule } from './invoices/invoices.module';
import { SurchargeModule } from './surcharge/surcharge.module';
import { BreakPointsModule } from './break-points/break-points.module';

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
    OrdersAssignToCollabsModule,
    CheckInCheckOutModule,
    ZohoMailModule,
    WorkOrderAcceptModule,
    InvoicesModule,
    SurchargeModule,
    BreakPointsModule,
  ],
  controllers: [AppController, MailerController],
  providers: [AppService],
})
export class AppModule {}
