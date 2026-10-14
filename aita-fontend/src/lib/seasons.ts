export type CanonicalSeason = 'Spring' | 'Summer' | 'Fall';

export interface AcademicSeason {
  season: CanonicalSeason;
  nameVi: string;
  year: number;
  code: string; // e.g. 'FA26', 'SP26', 'SU26'
  label: string; // e.g. 'Fall 2026'
  isCurrent: boolean;
  startMonth: number;
  endMonth: number;
}

/**
 * Xác định mùa học kỳ chuẩn dựa vào thời gian (mặc định là thời gian hiện tại).
 * Quy tắc phân chia mùa theo lịch đào tạo đại học (FPT University):
 * - Tháng 1 - 4: Spring (Học kỳ Xuân - SP)
 * - Tháng 5 - 8: Summer (Học kỳ Hè - SU)
 * - Tháng 9 - 12: Fall (Học kỳ Thu - FA)
 *
 * @param date - Mốc thời gian (mặc định là thời điểm hiện tại: new Date())
 * @returns Thông tin mùa học kỳ tương ứng
 */
export function getSeasonFromDate(date: Date = new Date()): AcademicSeason {
  const month = date.getMonth() + 1; // 1..12
  const year = date.getFullYear();

  let season: CanonicalSeason;
  let nameVi: string;
  let prefix: string;
  let startMonth: number;
  let endMonth: number;

  if (month >= 1 && month <= 4) {
    season = 'Spring';
    nameVi = 'Học kỳ Xuân';
    prefix = 'SP';
    startMonth = 1;
    endMonth = 4;
  } else if (month >= 5 && month <= 8) {
    season = 'Summer';
    nameVi = 'Học kỳ Hè';
    prefix = 'SU';
    startMonth = 5;
    endMonth = 8;
  } else {
    season = 'Fall';
    nameVi = 'Học kỳ Thu';
    prefix = 'FA';
    startMonth = 9;
    endMonth = 12;
  }

  const shortYear = String(year).slice(-2);

  return {
    season,
    nameVi,
    year,
    code: `${prefix}${shortYear}`,
    label: `${season} ${year}`,
    isCurrent: true,
    startMonth,
    endMonth,
  };
}

/**
 * Danh sách các mùa học kỳ được xác định xung quanh thời gian hiện tại
 * kết hợp cùng các mùa có sẵn từ dữ liệu hệ thống.
 */
export function getAvailableAcademicSeasons(
  currentDate: Date = new Date(),
  extraSeasonsFromData: string[] = []
): { value: string; label: string; isCurrent: boolean }[] {
  const current = getSeasonFromDate(currentDate);
  const curYear = currentDate.getFullYear();

  // Ưu tiên hiển thị mùa hiện tại lên đầu hoặc theo thứ tự thời gian gần nhất
  const baseSeasons: { value: string; label: string; isCurrent: boolean }[] = [
    {
      value: `Fall ${curYear}`,
      label: `Fall ${curYear}${current.season === 'Fall' ? ' (Hiện tại)' : ''}`,
      isCurrent: current.season === 'Fall',
    },
    {
      value: `Summer ${curYear}`,
      label: `Summer ${curYear}${current.season === 'Summer' ? ' (Hiện tại)' : ''}`,
      isCurrent: current.season === 'Summer',
    },
    {
      value: `Spring ${curYear}`,
      label: `Spring ${curYear}${current.season === 'Spring' ? ' (Hiện tại)' : ''}`,
      isCurrent: current.season === 'Spring',
    },
    {
      value: `Spring ${curYear + 1}`,
      label: `Spring ${curYear + 1}`,
      isCurrent: false,
    },
    {
      value: `Fall ${curYear - 1}`,
      label: `Fall ${curYear - 1}`,
      isCurrent: false,
    },
  ];

  // Sắp xếp đưa mùa hiện tại lên trên
  baseSeasons.sort((a, b) => {
    if (a.isCurrent) return -1;
    if (b.isCurrent) return 1;
    return 0;
  });

  // Bổ sung các giá trị có trong data mà chưa có trong danh sách
  for (const s of extraSeasonsFromData) {
    if (!s || s.trim() === '') continue;
    const trimmed = s.trim();
    const alreadyExists = baseSeasons.some(
      (bs) => bs.value.toLowerCase() === trimmed.toLowerCase() || bs.value.toLowerCase().startsWith(trimmed.toLowerCase())
    );
    if (!alreadyExists) {
      baseSeasons.push({
        value: trimmed,
        label: trimmed,
        isCurrent: trimmed.toLowerCase().includes(current.season.toLowerCase()),
      });
    }
  }

  return baseSeasons;
}
