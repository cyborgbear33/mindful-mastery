import { Body, Controller, Post } from "@nestjs/common";
import { LessonRequest } from "@mindful-mastery/common/index";
import { LessonService } from "./lesson.service";

@Controller("lesson")
export class LessonController {
  private readonly lessonService = new LessonService();

  @Post("generate")
  generate(@Body() body: LessonRequest) {
    return this.lessonService.generateLesson(body);
  }
}
