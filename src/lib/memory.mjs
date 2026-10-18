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
      title: 'This allocation is too high for this computer.',
      message: `${allocationGb} GB for Minecraft plus about 1 GB for Java leaves too little of your ${format(totalGb)} GB RAM for the operating system. This can cause heavy stuttering or prevent startup.`,
    };
  }

  if (allocationGb > totalBudgetGb) {
    return {
      ...result,
      severity: 'warning',
      title: 'High allocation may slow the whole computer.',
      message: `Keep about ${format(systemReserveGb)} GB for the operating system and other apps, plus about 1 GB for Java outside the game heap. Lowering the allocation can reduce memory pressure and stuttering.`,
    };
  }

  if (allocationGb > availableBudgetGb) {
    return {
      ...result,
      severity: 'warning',
      title: 'Memory is tight right now.',
      message: `Only ${format(availableGb)} GB is free now. A ${allocationGb} GB game heap also needs memory for Java, so it may cause swapping and stuttering. Close other apps or reduce the allocation before playing.`,
    };
  }

  if (allocationGb < 4) {
    return {
      ...result,
      severity: 'warning',
      title: 'The modpack may need more game memory.',
      message:
        'Patilanci usually needs 4–6 GB. A smaller heap can cause frequent pauses or out-of-memory errors.',
    };
  }

  return {
    ...result,
    severity: 'ok',
    title: 'This allocation leaves room for your system.',
    message:
      'Based on your installed RAM and the memory free now. Actual use depends on your world, mods, and other apps.',
  };
}
