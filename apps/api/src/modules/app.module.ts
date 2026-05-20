import { Module } from "@nestjs/common";
import { LessonController } from "./lesson/lesson.controller";
import { OntologyController } from "./ontology/ontology.controller";

@Module({
  controllers: [LessonController, OntologyController]
})
export class AppModule {}
