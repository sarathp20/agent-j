import { ApplicationTools } from "./tools";

console.log('server is live')

console.log(ApplicationTools[1]?.execute({}));
console.log( ApplicationTools[1]?.execute({ country: "India" }));
console.log( ApplicationTools[1]?.execute({ country: "india" }));
console.log( ApplicationTools[1]?.execute({ country: "UAE" }));
