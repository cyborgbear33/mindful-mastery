import { Module } from "@nestjs/common";
import { LessonController } from "./lesson/lesson.controller";

@Module({
  controllers: [LessonController]
})
export class AppModule {}
