export interface LatePenaltyResult {
  rawScore: number;
  latePenaltyAmount: number;
  finalScore: number;
  isLate: boolean;
  daysLate?: number;
  hoursLate?: number;
  lateReason?: string;
}

export function calculateLatePenalty({
  rawScore,
  submittedAt,
  originalDueDate,
  override,
  examPenaltyType,
  examPenaltyValue,
  maxLatePenalty,
}: {
  rawScore: number;
  submittedAt: Date | null;
  originalDueDate: Date | null;
  override?: {
    extendedDueDate?: Date | null;
    penaltyMode?: string | null;
    customPenaltyRate?: number | null;
    flatPenaltyAmount?: number | null;
    scoreCap?: number | null;
  } | null;
  examPenaltyType?: string | null;
  examPenaltyValue?: number | null;
  maxLatePenalty?: number | null;
}): LatePenaltyResult {
  if (!submittedAt) {
    return { rawScore, latePenaltyAmount: 0, finalScore: rawScore, isLate: false, daysLate: 0, hoursLate: 0 };
  }

  const effectiveDueDate = override?.extendedDueDate
    ? new Date(override.extendedDueDate)
    : (originalDueDate ? new Date(originalDueDate) : null);

  if (!effectiveDueDate || submittedAt <= effectiveDueDate) {
    let finalScore = rawScore;
    if (override?.penaltyMode === 'SCORE_CAP' && override.scoreCap !== null && override.scoreCap !== undefined) {
      finalScore = Math.min(rawScore, Number(override.scoreCap));
    }
    return { rawScore, latePenaltyAmount: 0, finalScore, isLate: false, daysLate: 0, hoursLate: 0 };
  }

  const isLate = true;
  const penaltyMode = override?.penaltyMode || 'SYSTEM_DEFAULT';
  let latePenaltyAmount = 0;
  
  const diffMs = submittedAt.getTime() - effectiveDueDate.getTime();
  const daysLate = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  const hoursLate = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60)));
  let lateReason = '';

  if (penaltyMode === 'WAIVE') {
    latePenaltyAmount = 0;
    lateReason = 'Đã được giảng viên miễn trừ điểm phạt trễ';
  } else if (penaltyMode === 'FLAT_AMOUNT') {
    latePenaltyAmount = Number(override?.flatPenaltyAmount || 0);
    lateReason = `Nộp trễ ${daysLate} ngày (Mức phạt tùy chỉnh: -${latePenaltyAmount} điểm)`;
  } else if (penaltyMode === 'CUSTOM_RATE') {
    const rate = Number(override?.customPenaltyRate || 0);
    latePenaltyAmount = daysLate * rate;
    lateReason = `Nộp trễ ${daysLate} ngày (Mức phạt tùy chỉnh: -${rate} điểm/ngày)`;
  } else if (penaltyMode === 'SCORE_CAP') {
    latePenaltyAmount = 0;
    lateReason = `Mức điểm tối đa nộp trễ giới hạn ở ${override?.scoreCap} điểm`;
  } else {
    const penaltyType = String(examPenaltyType || 'NONE').toUpperCase();
    const penaltyValue = Number(examPenaltyValue !== undefined && examPenaltyValue !== null ? examPenaltyValue : (penaltyType === 'DAILY_POINTS' ? 2 : 0));

    if (penaltyType === 'DAILY_POINTS') {
      latePenaltyAmount = Math.round(daysLate * penaltyValue * 100) / 100;
      lateReason = `Nộp trễ ${hoursLate} giờ (${daysLate} chu kỳ 24h) - Trừ ${penaltyValue} điểm/24h`;
    } else if (penaltyType === 'DAILY_PERCENT') {
      latePenaltyAmount = Math.round(((daysLate * penaltyValue / 100) * rawScore) * 100) / 100;
      lateReason = `Nộp trễ ${hoursLate} giờ (${daysLate} chu kỳ 24h) - Trừ ${penaltyValue}%/24h (-${latePenaltyAmount}đ)`;
    } else if (penaltyType === 'FLAT_POINTS') {
      latePenaltyAmount = Math.round(penaltyValue * 100) / 100;
      lateReason = `Nộp trễ sau hạn chót - Trừ cố định ${penaltyValue} điểm`;
    }
  }

  if (maxLatePenalty !== undefined && maxLatePenalty !== null && latePenaltyAmount > maxLatePenalty) {
    latePenaltyAmount = Number(maxLatePenalty);
  }

  let finalScore = Math.max(0, Math.round((rawScore - latePenaltyAmount) * 100) / 100);

  if (penaltyMode === 'SCORE_CAP' && override?.scoreCap !== null && override?.scoreCap !== undefined) {
    finalScore = Math.min(finalScore, Number(override.scoreCap));
  }

  return { rawScore, latePenaltyAmount, finalScore, isLate, daysLate, hoursLate, lateReason };
}
