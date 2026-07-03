const d = new Date();
const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
const today = new Date(utc + (3600000 * 5.5));
const dayOfWeek = today.getDay();
const hours = today.getHours();
const minutes = today.getMinutes();
const timeVal = hours * 100 + minutes;

console.log("System Date:", d.toString());
console.log("IST Date:", today.toString());
console.log("dayOfWeek:", dayOfWeek);
console.log("timeVal:", timeVal);
console.log("Is target expiry day for NIFTY50 (Tues)?", dayOfWeek === 2);
console.log("Is timeVal >= 1230?", timeVal >= 1230);
