import { Controller, Post, Get, Param, Query, Body, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { IpAssetService } from "./ip-asset.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";

@ApiTags("IP 资产管理")
@Controller("api/ip-assets")
export class IpAssetController {
  constructor(private ipAssetService: IpAssetService) {}

  @Post(["prepare-mint", "mint"])
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "准备铸造参数（上传IPFS，不调链）" })
  async prepareMint(@Body() dto: any) {
    return this.ipAssetService.prepareMint({
      creatorAddress: dto.creatorAddress, nfcChipUID: dto.nfcChipUID,
      artworkFile: Buffer.from(dto.artworkBase64 || "", "base64"),
      metadata: { name: dto.name, description: dto.description, series: dto.series },
    });
  }

  @Get()
  @ApiOperation({ summary: "查询原作列表" })
  async listWorks(@Query("page") page = 1, @Query("pageSize") pageSize = 20, @Query("creator") creator?: string) {
    return this.ipAssetService.listOriginalWorks(Number(page), Number(pageSize), creator);
  }

  @Get(":tokenId")
  @ApiOperation({ summary: "查询原作详情" })
  async getDetail(@Param("tokenId") tokenId: number) {
    return this.ipAssetService.getOriginalDetail(tokenId);
  }
}