export const UNITS = ["Sekretaris", "Bidang PIAK", "Bidang Yanminduk"] as const;

export type Unit = (typeof UNITS)[number];
