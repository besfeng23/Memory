export function valueOrNotAvailable(value: string | number | null | undefined) {
  return value === null || value === undefined || value === "" ? "not available" : String(value);
}

export function NotAvailable({ value }: Readonly<{ value: string | number | null | undefined }>) {
  const text = valueOrNotAvailable(value);
  return <span className={text === "not available" ? "browser-state-pill browser-state-pill--warn" : undefined}>{text}</span>;
}
