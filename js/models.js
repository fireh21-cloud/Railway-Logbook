// Data model definitions: enums, defaults, factory functions.

export const ACStatus = {
  WORKING: "Working",
  NOT_WORKING_BOTH_CAB: "Not Working (Both Cab)",
  NOT_WORKING_ONE_CAB: "Not Working (One Cab)",
};
export const AC_STATUS_OPTIONS = Object.values(ACStatus);

export const UICStatus = {
  MODIFIED: "Modified",
  NORMAL: "Normal",
  NON_HOG: "Non HOG",
};
export const UIC_STATUS_OPTIONS = Object.values(UICStatus);

export const UICCableOption = {
  ONE_CABLE: "One Cable Attached",
  BOTH_CABLE: "Both Cable Attached",
};
export const UIC_CABLE_OPTIONS = Object.values(UICCableOption);

export const RTISStatus = {
  WORKING: "Working",
  NOT_WORKING: "Not Working",
};
export const RTIS_STATUS_OPTIONS = Object.values(RTISStatus);

// Default schedule types seeded on first launch. User can add more from Settings.
export const DEFAULT_SCHEDULE_TYPES = ["IA", "IB", "IC", "IOH", "POH", "MOH", "TI"];

// The 10 timeline-of-working steps, in display order. Each is a Date-or-null (ISO string) field on DutyEntry.
export const TIMELINE_STEPS = [
  { key: "locoTakeoverTime", label: "Loco Takeover" },
  { key: "locoOfferTime", label: "Loco Offer" },
  { key: "engineOnTrainTime", label: "Engine on Train" },
  { key: "hogAttachedTime", label: "HOG Attached" },
  { key: "bpFpTime", label: "BP/FP" },
  { key: "buildupTime", label: "Buildup" }, // paired with buildupLocation text field
  { key: "continuityTime", label: "Continuity" },
  { key: "bpcTime", label: "BPC" },
  { key: "madeOverChargeTime", label: "Made Over Charge" },
  { key: "departureTime", label: "Departure" },
];

function uuid() {
  return crypto.randomUUID();
}

export function newLocomotive() {
  return { id: uuid(), number: "", locoClass: "", shed: "" };
}

export function newDutyEntry() {
  const now = new Date().toISOString();
  const entry = {
    id: uuid(),
    date: new Date().toISOString().slice(0, 10), // yyyy-mm-dd
    trainNumber: "",
    trainName: "",
    locomotiveId: null,
    locomotiveNumberSnapshot: "",
    remarks: "",
    acStatus: ACStatus.WORKING,
    uicStatus: UICStatus.NORMAL,
    uicCableOption: null,
    rtisStatus: RTISStatus.WORKING,
    majorScheduleTypeCode: DEFAULT_SCHEDULE_TYPES[0],
    majorScheduleDate: null,
    minorScheduleTIDate: null,
    kmSinceLastSchedule: null,
    lastModified: now,
  };
  for (const step of TIMELINE_STEPS) {
    entry[step.key] = null;
  }
  entry.buildupLocation = "";
  return entry;
}

export function newProfile() {
  return { id: "singleton", name: "" };
}

export function kmFieldLabel(entry) {
  return entry.minorScheduleTIDate ? "KM since last TI" : "KM since last major schedule";
}
