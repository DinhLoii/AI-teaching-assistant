'use client'

const palette: Record<string, { label: string; color: string }> = {
  student: { label: 'Sinh viên', color: '#f97316' }, lecturer: { label: 'Giảng viên', color: '#3b82f6' },
  admin: { label: 'Quản trị viên', color: '#8b5cf6' }, other: { label: 'Chưa phân vai trò', color: '#94a3b8' },
}
export function RoleDistribution({ roles }: { roles: { role: string; count: number }[] }) {
  const total = roles.reduce((sum, item) => sum + item.count, 0)
  return <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-5" data-testid="role-distribution">
    <div className="relative w-36 h-36 shrink-0">
      <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90" role="img" aria-label={`Cơ cấu ${total} tài khoản`}>
        <circle cx="60" cy="60" r="46" strokeWidth="12" fill="none" className="stroke-slate-100 dark:stroke-slate-800" />
        {roles.map((item, index) => {
          const length = total ? item.count / total * 100 : 0
          const currentOffset = total ? roles.slice(0, index).reduce((sum, previous) => sum + previous.count, 0) / total * 100 : 0
          return <circle key={item.role} cx="60" cy="60" r="46" pathLength="100" fill="none" stroke={palette[item.role]?.color || '#94a3b8'} strokeWidth="12" strokeDasharray={`${length} ${100 - length}`} strokeDashoffset={-currentOffset}>
            <title>{palette[item.role]?.label || item.role}: {item.count}</title>
          </circle>
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center"><strong className="text-2xl font-black" data-testid="role-total">{total}</strong><span className="text-[10px] text-slate-500 uppercase">Tài khoản</span></div>
    </div>
    <div className="space-y-2 w-full min-w-0">
      {roles.map(item => <div key={item.role} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs">
        <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: palette[item.role]?.color || '#94a3b8' }} />{palette[item.role]?.label || item.role}</span>
        <strong className="tabular-nums whitespace-nowrap">{item.count} ({total ? (item.count / total * 100).toFixed(1) : '0'}%)</strong>
      </div>)}
      {total === 0 && <p className="text-sm text-slate-500">Chưa có tài khoản.</p>}
    </div>
  </div>
}
