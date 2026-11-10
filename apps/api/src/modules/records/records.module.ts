import { Module } from "@nestjs/common";
import { PhiCryptoService } from "../../common/phi-crypto";
import { RecordsController } from "./records.controller";
import { RecordsService } from "./records.service";

@Module({
  controllers: [RecordsController],
  providers: [RecordsService, PhiCryptoService],
})
export class RecordsModule {}
