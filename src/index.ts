import { runAgent } from "./agent";
import { JobTracker } from "./model";

console.log('server is live')

console.log(await runAgent("Hi"))



// const updateTool = ApplicationTools.find(t => t.name === "update_status");
// console.log(updateTool?.execute({ id: "APP002", status: "Interview" }));  // success
// console.log(updateTool?.execute({ id: "APP999", status: "Interview" }));  // unknown ID
// console.log(updateTool?.execute({ id: "APP002", status: "Waiting" }));    // invalid status
// console.log(ApplicationTools[0]?.execute({ id: "APP002" }));              // status should now be Interview