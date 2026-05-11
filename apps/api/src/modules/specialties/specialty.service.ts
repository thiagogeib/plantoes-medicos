import { prisma } from "../../prisma/client"

export class SpecialtyService {
  static async listAll() {
    return prisma.specialty.findMany({
      orderBy: { name: "asc" },
    })
  }
}
