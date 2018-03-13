"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("util");
function getTokenContent(line, token) {
    return line.substring(token.startIndex, token.endIndex);
}
exports.getTokenContent = getTokenContent;
function logInfo(message) {
    util_1.log(message);
}
exports.logInfo = logInfo;
function logDebug(message) {
    util_1.log(message);
}
exports.logDebug = logDebug;
function logError(message) {
    util_1.log(message);
}
exports.logError = logError;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZnVuY3Rpb25zLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc2VydmVyL3NyYy9mdW5jdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFHQSwrQkFBMkI7QUFFM0IseUJBQWdDLElBQVksRUFBRSxLQUFrQjtJQUM1RCxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsVUFBVSxFQUFFLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUM1RCxDQUFDO0FBRkQsMENBRUM7QUFFRCxpQkFBd0IsT0FBZTtJQUNuQyxVQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDakIsQ0FBQztBQUZELDBCQUVDO0FBRUQsa0JBQXlCLE9BQWU7SUFDcEMsVUFBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBRWpCLENBQUM7QUFIRCw0QkFHQztBQUVELGtCQUF5QixPQUFlO0lBQ3BDLFVBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUNqQixDQUFDO0FBRkQsNEJBRUMifQ==