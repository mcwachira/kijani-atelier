export const formatKes = (value:number) => new Intl.NumberFormat('en-KE', {
  style:'currency',
  maximumFractionDigits:0,
  currency:'KES',
}).format(value);

export const formatDate = (value:string) => new Intl.DateTimeFormat('en-KE', {day:"numeric", month:"short", year:"numeric"}).format(new Date(value));