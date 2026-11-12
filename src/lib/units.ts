export const UNITS = ["Sekretariat", "Bidang PIAK", "Bidang Yanminduk"] as const;

export type Unit = (typeof UNITS)[number];
