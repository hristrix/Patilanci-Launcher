export const BYTES_PER_GB = 1024 ** 3;

export function assessMemory(allocationGb, snapshot) {
  const totalGb = snapshot?.totalBytes / BYTES_PER_GB;
  const availableGb = snapshot?.availableBytes / BYTES_PER_GB;

  if (
    !Number.isFinite(totalGb) ||
    !Number.isFinite(availableGb) ||
    totalGb <= 0 ||
    availableGb < 0 ||
    availableGb > totalGb ||
    !Number.isFinite(allocationGb) ||
    allocationGb < 2 ||
    allocationGb > 32
  ) {
    return { severity: 'unknown', recommendedGb: null };
  }

  // Xmx only limits the Java heap. Leave room for Java itself and other apps.
  const javaOverheadGb = 1;
  const systemReserveGb = Math.max(2, totalGb * 0.25);
  const totalBudgetGb = totalGb - systemReserveGb - javaOverheadGb;
  const availableBudgetGb = availableGb - javaOverheadGb - 0.5;
  const budgetGb = Math.min(totalBudgetGb, availableBudgetGb);
  const recommendedGb =
    budgetGb >= 4 ? Math.min(6, Math.floor(budgetGb)) : null;
  const result = {
    totalGb,
    availableGb,
    systemReserveGb,
    javaOverheadGb,
    recommendedGb,
    headroomGb: Math.max(0, totalGb - allocationGb - javaOverheadGb),
  };
  const format = (value) => value.toFixed(1).replace(/\.0$/, '');

  if (allocationGb + javaOverheadGb >= totalGb) {
    return {
      ...result,
      severity: 'danger',
      title: 'За играта е избрано твърде много памет.',
      message: `${allocationGb} ГБ за Minecraft и около 1 ГБ за Java оставят твърде малко от общо ${format(totalGb)} ГБ за операционната система. Това може да забави компютъра или да попречи на стартирането.`,
    };
  }

  if (allocationGb > totalBudgetGb) {
    return {
      ...result,
      severity: 'warning',
      title: 'Избраната памет може да забави компютъра.',
      message: `Остави около ${format(systemReserveGb)} ГБ за операционната система и другите приложения и още около 1 ГБ за Java. Избери по-малко памет за играта, за да намалиш забавянията.`,
    };
  }

  if (allocationGb > availableBudgetGb) {
    return {
      ...result,
      severity: 'warning',
      title: 'В момента свободната памет е малко.',
      message: `Само ${format(availableGb)} ГБ са свободни в момента. Играта с ${allocationGb} ГБ има нужда и от допълнителна памет за Java. Затвори други приложения или избери по-малко памет, преди да играеш.`,
    };
  }

  if (allocationGb < 4) {
    return {
      ...result,
      severity: 'warning',
      title: 'Пакетът може да има нужда от повече памет.',
      message:
        'Патиланци обикновено се нуждае от 4–6 ГБ. По-малко памет може да доведе до прекъсвания или спиране на играта.',
    };
  }

  return {
    ...result,
    severity: 'ok',
    title: 'Остава достатъчно памет и за компютъра.',
    message:
      'Препоръката отчита общата и свободната памет. Използваното количество зависи от света, добавките и другите отворени приложения.',
  };
}
