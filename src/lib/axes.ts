export type Axis = "micro" | "meso" | "macro";

export const AXIS_COPY: Record<Axis, { label: string; tag: string; description: string }> = {
  micro: {
    label: "Micro",
    tag: "Execution",
    description: "Moment-to-moment execution. Reflexes, aim, inputs, mechanical control.",
  },
  meso: {
    label: "Meso",
    tag: "Awareness + Odds",
    description:
      "Reading the situation. Awareness, information, probability and chance, tactical decisions in the now.",
  },
  macro: {
    label: "Macro",
    tag: "Strategy & Solving",
    description: "The long game. Strategy, planning, resource and tempo managed over time — solving the position.",
  },
};

export const AXES: Axis[] = ["micro", "meso", "macro"];
