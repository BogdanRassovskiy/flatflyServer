export const CZECH_REGIONS = [
  { value: "PRAGUE", label: "Praha" },
  { value: "STREDOCESKY", label: "Středočeský kraj" },
  { value: "JIHOCESKY", label: "Jihočeský kraj" },
  { value: "PLZENSKY", label: "Plzeňský kraj" },
  { value: "KARLOVARSKY", label: "Karlovarský kraj" },
  { value: "USTECKY", label: "Ústecký kraj" },
  { value: "LIBERECKY", label: "Liberecký kraj" },
  { value: "KRALOVEHRADECKY", label: "Královéhradecký kraj" },
  { value: "PARDUBICKY", label: "Pardubický kraj" },
  { value: "VYSOCINA", label: "Vysočina" },
  { value: "JIHOMORAVSKY", label: "Jihomoravský kraj" },
  { value: "OLOMOUCKY", label: "Olomoucký kraj" },
  { value: "ZLINSKY", label: "Zlínský kraj" },
  { value: "MORAVSKOSLEZSKY", label: "Moravskoslezský kraj" },
];
export const regionValueToLabel = (value?: string | null): string => {
  if (!value) return "";
  const found = CZECH_REGIONS.find(r => r.value === value);
  return found ? found.label : value;
};
