export class Semester {
  constructor(
    public readonly id: string,
    public code: string,
    public isActive: boolean,
    public startDate?: Date,
    public endDate?: Date,
    public season?: string,
  ) {}

  static create(id: string, code: string, isActive: boolean = true, startDate?: Date, endDate?: Date, season?: string): Semester {
    return new Semester(id, code, isActive, startDate, endDate, season)
  }

  static fromPersistence(data: any): Semester {
    return new Semester(
      data.Id,
      data.Code,
      data.IsActive ?? false,
      data.StartDate ?? undefined,
      data.EndDate ?? undefined,
      data.Season ?? undefined
    )
  }
}
