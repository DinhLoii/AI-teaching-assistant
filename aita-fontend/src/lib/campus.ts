export interface CampusInfo {
  id: string
  name: string
  nameVi: string
  code: string
  shortName: string
  address?: string
}

export const CAMPUSES: CampusInfo[] = [
  {
    id: 'hanoi',
    name: 'FPT Hanoi (Hoa Lac)',
    nameVi: 'FPT Hà Nội (Hòa Lạc)',
    code: 'FU-HN',
    shortName: 'Hòa Lạc',
    address: 'Khu CNC Hòa Lạc, Thạch Thất, Hà Nội',
  },
  {
    id: 'hcm',
    name: 'FPT Ho Chi Minh City',
    nameVi: 'FPT TP. Hồ Chí Minh',
    code: 'FU-HCM',
    shortName: 'TP.HCM',
    address: 'Khu CNC, Long Thạnh Mỹ, TP. Thủ Đức',
  },
  {
    id: 'danang',
    name: 'FPT Da Nang',
    nameVi: 'FPT Đà Nẵng',
    code: 'FU-DN',
    shortName: 'Đà Nẵng',
    address: 'Khu đô thị FPT City, Ngũ Hành Sơn, Đà Nẵng',
  },
  {
    id: 'quynhon',
    name: 'FPT Quy Nhon',
    nameVi: 'FPT Quy Nhơn',
    code: 'FU-QN',
    shortName: 'Quy Nhơn',
    address: 'Khu Đô thị An Phú Thịnh, Quy Nhơn, Bình Định',
  },
  {
    id: 'cantho',
    name: 'FPT Can Tho',
    nameVi: 'FPT Cần Thơ',
    code: 'FU-CT',
    shortName: 'Cần Thơ',
    address: '600 Nguyễn Văn Cừ nối dài, Ninh Kiều, Cần Thơ',
  },
]

export const DEFAULT_CAMPUS = CAMPUSES.find((c) => c.id === 'quynhon') || CAMPUSES[0]

export const CAMPUS_STORAGE_KEY = 'fptu_campus'
export const CAMPUS_NAME_KEY = 'fptu_campus_name'
export const CAMPUS_CODE_KEY = 'fptu_campus_code'
export const CAMPUS_CHANGE_EVENT = 'fptu_campus_changed'

export function getActiveCampus(): CampusInfo {
  if (typeof window === 'undefined') return DEFAULT_CAMPUS
  try {
    const saved = localStorage.getItem(CAMPUS_STORAGE_KEY)
    if (saved) {
      const found = CAMPUSES.find((c) => c.id === saved || c.code === saved)
      if (found) return found
    }
  } catch {}
  return DEFAULT_CAMPUS
}

export function setActiveCampus(campusId: string): CampusInfo {
  const found = CAMPUSES.find((c) => c.id === campusId || c.code === campusId) || DEFAULT_CAMPUS
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(CAMPUS_STORAGE_KEY, found.id)
      localStorage.setItem(CAMPUS_NAME_KEY, found.nameVi)
      localStorage.setItem(CAMPUS_CODE_KEY, found.code)
      window.dispatchEvent(new CustomEvent(CAMPUS_CHANGE_EVENT, { detail: found }))
    } catch {}
  }
  return found
}
