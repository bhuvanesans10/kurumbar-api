import { Test, TestingModule } from "@nestjs/testing";
import { HealthService } from "./health.service";
import { PrismaService } from "../prisma/prisma.service";

describe("HealthService", () => {
  let service: HealthService;
  let prismaServiceMock: any;

  let module: TestingModule;
  beforeEach(async () => {
    prismaServiceMock = {
      $queryRaw: jest.fn(),
    };

    module = await Test.createTestingModule({
      providers: [
        HealthService,
        { provide: PrismaService, useValue: prismaServiceMock },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);
  });

  afterEach(async () => {
    if (module) {
      await module.close();
    }
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("isDbReady", () => {
    it("should return true if DB query succeeds", async () => {
      prismaServiceMock.$queryRaw.mockResolvedValue([{ 1: 1 }]);
      const result = await service.isDbReady();
      expect(result).toBe(true);
      expect(prismaServiceMock.$queryRaw).toHaveBeenCalled();
    });

    it("should return false if DB query fails", async () => {
      prismaServiceMock.$queryRaw.mockRejectedValue(new Error("DB Error"));
      const result = await service.isDbReady();
      expect(result).toBe(false);
      expect(prismaServiceMock.$queryRaw).toHaveBeenCalled();
    });
  });
});
