import { Controller, Get, Post, Param, Query, Body, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { DerivativeService } from "./derivative.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";

@ApiTags("衍生品管理")
@Controller("api/derivatives")
export class DerivativeController {
  constructor(private derivativeService: DerivativeService) {}

  @Get()
  @ApiOperation({ summary: "查询衍生品列表" })
  async list(@Query("page") page = 1, @Query("pageSize") pageSize = 20, @Query("originalTokenId") originalTokenId?: number, @Query("creator") creator?: string, @Query("status") status?: string) {
    return this.derivativeService.listDerivatives(Number(page), Number(pageSize), { originalTokenId, creatorAddress: creator, status });
  }

  @Get(":tokenId/trace")
  @ApiOperation({ summary: "查询衍生品溯源链" })
  async trace(@Param("tokenId") tokenId: number) {
    return this.derivativeService.traceDerivative(tokenId);
  }

  @Post(":tokenId/freeze")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "冻结衍生品" })
  async freeze(@Param("tokenId") tokenId: number, @Body("operator") operator: string) {
    return this.derivativeService.freezeDerivative(Number(tokenId), operator);
  }
}