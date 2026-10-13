import { JobTracker } from "./model";

console.log('server is live')

const {text, functionCalls} = await JobTracker('I just got an interview call for APP005')
console.log(JSON.stringify(functionCalls))

// const updateTool = ApplicationTools.find(t => t.name === "update_status");
// console.log(updateTool?.execute({ id: "APP002", status: "Interview" }));  // success
// console.log(updateTool?.execute({ id: "APP999", status: "Interview" }));  // unknown ID
// console.log(updateTool?.execute({ id: "APP002", status: "Waiting" }));    // invalid status
// console.log(ApplicationTools[0]?.execute({ id: "APP002" }));              // status should now be Interview