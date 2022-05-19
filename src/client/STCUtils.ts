//https://stackoverflow.com/questions/3224834/get-difference-between-2-dates-in-javascript
const _MS_PER_DAY = 1000 * 60 * 60 * 24;
export function getDiffDate(startDate, endDate) {
  const utc1 = Date.UTC(
    startDate.getFullYear(),
    startDate.getMonth(),
    startDate.getDate()
  );
  const utc2 = Date.UTC(
    endDate.getFullYear(),
    endDate.getMonth(),
    endDate.getDate()
  );
  return Math.floor((utc2 - utc1) / _MS_PER_DAY);
}

export function addDaysToDate(startDate, days) {
  let date = new Date(Number(new Date(startDate)));
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function rforHexagonArea(area) {
  let side = Math.sqrt((2 * area) / (3 * Math.sqrt(3)));
  return (2 * area) / (6 * side);
}

export function hexagonArea(side) {
  return ((3 * Math.pow(3, 0.5)) / 2) * side * side;
}
