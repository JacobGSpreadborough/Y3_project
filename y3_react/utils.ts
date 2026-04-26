export function timeFormatter(input: number): string {
	let minutes = Math.floor((input / 60));
	let seconds = Math.floor(input % 60);
	let minutesZero = minutes < 10 ? "0" : "";
	let secondsZero = seconds < 10 ? "0" : "";
	return minutesZero + minutes + ":" + secondsZero + seconds;
}
