import { Controller, Get, Query } from "@nestjs/common";
import {
  LearningDomainSchema,
  loadDomainOntology,
  searchTopics
} from "@mindful-mastery/common/index";

@Controller("ontology")
export class OntologyController {
  @Get()
  getOntology() {
    return loadDomainOntology();
  }

  @Get("topics")
  getTopics(
    @Query("q") query = "",
    @Query("domain") domain?: string,
    @Query("subdomain") subdomain?: string,
    @Query("limit") limitRaw?: string,
    @Query("sort") sort?: string
  ) {
    const limit = Number.isFinite(Number(limitRaw)) ? Number(limitRaw) : 50;

    const parsedDomain = domain
      ? LearningDomainSchema.safeParse(domain)
      : undefined;
    const domainValue = parsedDomain?.success ? parsedDomain.data : undefined;

    return searchTopics({
      query,
      domain: domainValue,
      subdomain,
      limit,
      sortByComplexity: sort !== "lexical"
    });
  }
}
