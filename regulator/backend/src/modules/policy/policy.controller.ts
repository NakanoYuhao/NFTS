import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { PolicyService } from "./policy.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";

@ApiTags("二创规则")
@Controller("api/policies")
export class PolicyController {
  constructor(private policyService: PolicyService) {}

  @Get()
  @ApiOperation({ summary: "查询所有活跃规则列表" })
  async listPolicies(@Query("page") page = 1, @Query("pageSize") pageSize = 20) {
    return this.policyService.listPolicies(Number(page), Number(pageSize));
  }

  @Get(":originalTokenId")
  @ApiOperation({ summary: "查询二创规则" })
  async getPolicy(@Param("originalTokenId") tokenId: number) {
    return this.policyService.getPolicy(tokenId);
  }

  @Get(":originalTokenId/history")
  @ApiOperation({ summary: "查询规则历史" })
  async getHistory(@Param("originalTokenId") tokenId: number) {
    return this.policyService.getPolicyHistory(tokenId);
  }
}