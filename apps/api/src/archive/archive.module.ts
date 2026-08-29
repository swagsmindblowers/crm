import { Module } from "@nestjs/common";
import { CompaniesModule } from "../companies/companies.module";
import { ContactsModule } from "../contacts/contacts.module";
import { MattersModule } from "../matters/matters.module";
import { ArchiveRetentionController } from "./archive-retention.controller";

@Module({
	imports: [CompaniesModule, ContactsModule, MattersModule],
	controllers: [ArchiveRetentionController],
})
export class ArchiveModule {}
